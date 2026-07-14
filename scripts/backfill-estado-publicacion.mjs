/**
 * Backfill de coherencia estado ⇄ publicación.
 *
 * Invariante nuevo del negocio: estado ACTIVO ⇔ publicado.
 *   • estado === ACTIVO ⇒ publicado = true
 *   • estado !== ACTIVO ⇒ publicado = false
 *
 * Normaliza las filas históricas que quedaron incoherentes cuando publicación
 * (`publicado`) y estado se controlaban por separado:
 *
 *   1. publicado=true con estado ≠ ACTIVO
 *        → estado = ACTIVO. Ya están visibles en el sitio; sólo alineamos el
 *          estado al invariante.
 *
 *   2. estado=ACTIVO con publicado=false
 *        → evaluamos el gate de publicación (los mismos chequeos que corren al
 *          activar un paquete desde el panel):
 *            · si PASA  → publicado = true (queda publicado, como su estado dice).
 *            · si NO PASA → estado = EN_REVISION (publicado sigue false), y se
 *              loguea la lista de faltantes por paquete.
 *
 * El resto de las combinaciones (ACTIVO+publicado, o no-ACTIVO+no-publicado) ya
 * son coherentes y no se tocan. Idempotente: una segunda corrida reporta 0
 * cambios.
 *
 * Uso:
 *   node scripts/backfill-estado-publicacion.mjs --dry   # simula, no escribe
 *   node scripts/backfill-estado-publicacion.mjs         # aplica los cambios
 *
 * NO ejecutar contra una DB remota sin intención: lee DATABASE_URL del entorno.
 * ESM JS plano (mismo estilo que scripts/backfill-vigencia.mjs) para no depender
 * de tsx.
 */

import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry");

/**
 * Reimplementa el gate de publicación (`src/lib/paquete-publicable.ts`)
 * consultando los datos ya traídos por Prisma. Devuelve { ok, missing }.
 *
 * Nota sobre "precio vigente" en modalidad CIRCUITO: `resolvePrecioCircuito`
 * sólo devuelve undefined cuando el circuito no tiene ningún precio no borrado
 * (si hay precios pero ninguno matchea la fecha, cae al primero). Así que a
 * efectos del gate, "tiene precio vigente" ≡ "tiene al menos un precio activo".
 */
function evaluarGate(p) {
  const missing = [];

  if (!p.slug) missing.push("slug (URL pública)");
  if (!p.titulo || !p.titulo.trim()) missing.push("título");
  if (p.aereos.length === 0) missing.push("al menos 1 aéreo asignado");
  if (!p.heroImage) missing.push("foto principal del slider");
  if (!p.viajeDesde || !p.viajeHasta)
    missing.push("período del viaje (desde / hasta)");

  if (p.modalidad === "CIRCUITO") {
    const circ = p.circuitos[0]?.circuito ?? null;
    if (!circ) {
      missing.push("un circuito asignado con precio vigente");
    } else {
      if (circ.precios.length === 0)
        missing.push("un circuito asignado con precio vigente");
      if (circ.itinerario.length === 0)
        missing.push("itinerario del circuito (día por día)");
      if (!circ.noches || circ.noches <= 0)
        missing.push("noches del circuito mayores a 0");
    }
  } else {
    if (p.destinos.length === 0)
      missing.push("al menos 1 destino en el itinerario");
    if (p.opcionesHoteleras.length === 0)
      missing.push("al menos 1 opción hotelera");
    const nochesPaquete = p.noches ?? 0;
    const nochesDestinos = p.destinos.reduce((s, d) => s + (d.noches || 0), 0);
    if (nochesPaquete > 0 && nochesDestinos !== nochesPaquete) {
      missing.push(
        `noches por destino suman ${nochesDestinos} (paquete declara ${nochesPaquete})`,
      );
    }
  }

  return { ok: missing.length === 0, missing };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[backfill-estado-publicacion] DATABASE_URL no está seteada — abortando.",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const paquetes = await prisma.paquete.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        titulo: true,
        slug: true,
        publicado: true,
        estado: true,
        heroImage: true,
        noches: true,
        modalidad: true,
        viajeDesde: true,
        viajeHasta: true,
        validezDesde: true,
        destinos: { select: { noches: true } },
        opcionesHoteleras: { select: { id: true } },
        aereos: { select: { id: true } },
        circuitos: {
          select: {
            circuito: {
              select: {
                noches: true,
                itinerario: { select: { id: true } },
                precios: {
                  where: { deletedAt: null },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    console.log(
      `[backfill-estado-publicacion] ${DRY ? "DRY-RUN — " : ""}${paquetes.length} paquetes no borrados.`,
    );

    let normalizadosActivo = 0; // caso 1: publicado=true, estado≠ACTIVO → ACTIVO
    let publicados = 0; // caso 2a: ACTIVO+!pub, pasa gate → publicado=true
    let aRevision = 0; // caso 2b: ACTIVO+!pub, no pasa gate → EN_REVISION
    let coherentes = 0;

    for (const p of paquetes) {
      let data = null;
      let detalle = "";

      if (p.publicado === true && p.estado !== "ACTIVO") {
        // Caso 1 — ya visible en el sitio, alineamos el estado.
        data = { estado: "ACTIVO" };
        detalle = `publicado=true con estado ${p.estado} → estado=ACTIVO`;
        normalizadosActivo++;
      } else if (p.estado === "ACTIVO" && p.publicado === false) {
        // Caso 2 — dice ACTIVO pero no está publicado: decide el gate.
        const gate = evaluarGate(p);
        if (gate.ok) {
          data = { publicado: true };
          detalle = "estado=ACTIVO sin publicar y pasa el gate → publicado=true";
          publicados++;
        } else {
          data = { estado: "EN_REVISION" };
          detalle = `estado=ACTIVO sin publicar y NO pasa el gate → estado=EN_REVISION. Falta: ${gate.missing.join("; ")}`;
          aRevision++;
        }
      } else {
        // Ya coherente (ACTIVO+publicado, o no-ACTIVO+no-publicado).
        coherentes++;
        continue;
      }

      console.log(`  ${p.id} «${p.titulo}»: ${detalle}`);
      if (!DRY) {
        await prisma.paquete.update({ where: { id: p.id }, data });
      }
    }

    console.log(
      `[backfill-estado-publicacion] ${DRY ? "Simulado" : "Aplicado"}: ` +
        `${normalizadosActivo} → ACTIVO, ${publicados} → publicado, ` +
        `${aRevision} → EN_REVISION, ${coherentes} ya coherentes.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-estado-publicacion] FALLÓ:", err);
  process.exit(1);
});
