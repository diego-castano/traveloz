/**
 * Fix de los datos que rompen la resolución de región de un paquete público.
 *
 * DRY-RUN POR DEFECTO. Solo escribe con `--apply` (o APPLY=1).
 *
 * La auditoría (scripts/audit-regiones-paquetes.ts) mostró dos familias de
 * problemas distintas; este script cubre las dos que SON reparables por datos:
 *
 *   (A) Países del brand público cuyo `regionId` apunta a una región de OTRA
 *       marca. El sitio arma su mapa de regiones filtrando por brandId, así
 *       que ese regionId no matchea y el paquete cae al fallback silencioso
 *       (regiones[0] = "europa"). Fix: repuntar el país a la región del brand
 *       público con el MISMO slug (region-8 "europa"/brand-2 → region-1
 *       "europa"/brand-1). Si no hay región pública con ese slug, se lista
 *       como "sin equivalente — crear a mano" y no se toca.
 *
 *   (B) Destinos de paquetes públicos que apuntan a una ciudad de otra marca.
 *       Fix: repuntar el PaqueteDestino a la ciudad equivalente del brand
 *       público (match por nombre de ciudad + nombre de país, normalizados).
 *       Sin equivalente → se lista y NO se inventa nada. Si el repunte
 *       chocaría con el @@unique([paqueteId, ciudadId, orden]) del modelo, se
 *       reporta como conflicto y tampoco se toca.
 *
 * Lo que este script NO puede arreglar: paquetes publicados SIN destinos
 * cargados. Ahí no hay ningún dato del cual inferir la región; se listan al
 * final para que alguien les cargue el destino desde el backend. Mientras
 * tanto, el sitio los publica bajo la primera región y ahora además loguea un
 * warn (ver src/lib/region-paquete.ts).
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/fix-regiones-paquetes.ts            # dry-run
 *   npx tsx scripts/fix-regiones-paquetes.ts --apply    # aplica
 */
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type PlanPais = { paisId: string; nombre: string; from: string; to: string; toSlug: string };
type PlanDestino = {
  destinoId: string;
  paqueteSlug: string;
  orden: number;
  ciudadVieja: { id: string; nombre: string; pais: string; brandId: string };
  ciudadNueva: { id: string; nombre: string; pais: string };
};

async function main() {
  const apply = process.argv.includes("--apply") || process.env.APPLY === "1";

  console.log("=".repeat(78));
  console.log(`FIX DE REGIONES DE PAQUETES — BRAND_ID público: ${BRAND_ID}`);
  console.log(`Modo: ${apply ? "APPLY (escribe en la base)" : "DRY-RUN (no escribe nada)"}`);
  console.log("=".repeat(78));

  const todasLasRegiones = await prisma.region.findMany({
    select: { id: true, brandId: true, slug: true, nombre: true, orden: true },
    orderBy: [{ brandId: "asc" }, { orden: "asc" }],
  });
  const regionPorId = new Map(todasLasRegiones.map((r) => [r.id, r]));
  const regionesPublicas = todasLasRegiones.filter((r) => r.brandId === BRAND_ID);
  const publicaPorId = new Map(regionesPublicas.map((r) => [r.id, r]));
  const publicaPorSlug = new Map(regionesPublicas.map((r) => [r.slug, r]));

  // ── (A) Países del brand público colgados de una región ajena ─────────────
  const paisesPublicos = await prisma.pais.findMany({
    where: { brandId: BRAND_ID },
    select: { id: true, nombre: true, regionId: true },
    orderBy: { nombre: "asc" },
  });

  const planPaises: PlanPais[] = [];
  const paisesSinEquivalente: { id: string; nombre: string; regionId: string | null }[] = [];
  for (const pais of paisesPublicos) {
    if (pais.regionId && publicaPorId.has(pais.regionId)) continue; // ya está bien
    const regionAjena = pais.regionId ? regionPorId.get(pais.regionId) : undefined;
    const destino = regionAjena ? publicaPorSlug.get(regionAjena.slug) : undefined;
    if (!destino) {
      paisesSinEquivalente.push({ id: pais.id, nombre: pais.nombre, regionId: pais.regionId });
      continue;
    }
    planPaises.push({
      paisId: pais.id,
      nombre: pais.nombre,
      from: `${pais.regionId} ("${regionAjena!.slug}", ${regionAjena!.brandId})`,
      to: destino.id,
      toSlug: destino.slug,
    });
  }

  console.log(`\n[A] PAÍSES DE ${BRAND_ID} A REPUNTAR A UNA REGIÓN DE ${BRAND_ID} (${planPaises.length})`);
  if (planPaises.length === 0) console.log("     — nada que hacer —");
  for (const p of planPaises) {
    const nCiudades = await prisma.ciudad.count({ where: { paisId: p.paisId } });
    const nDestinos = await prisma.paqueteDestino.count({
      where: { ciudad: { paisId: p.paisId } },
    });
    console.log(`     • "${p.nombre}" (${p.paisId}) · ciudades=${nCiudades} · destinos=${nDestinos}`);
    console.log(`         regionId: ${p.from}  →  ${p.to} ("${p.toSlug}", ${BRAND_ID})`);
  }
  if (paisesSinEquivalente.length > 0) {
    console.log(`\n     SIN EQUIVALENTE — crear a mano (${paisesSinEquivalente.length}):`);
    for (const p of paisesSinEquivalente) {
      console.log(`       - "${p.nombre}" (${p.id}) regionId=${p.regionId ?? "NULL"}`);
    }
  }

  // ── (B) Destinos de paquetes públicos apuntando a ciudades de otra marca ──
  const paquetes = await prisma.paquete.findMany({
    where: { brandId: BRAND_ID, deletedAt: null },
    select: {
      id: true,
      slug: true,
      titulo: true,
      publicado: true,
      destinos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          orden: true,
          ciudadId: true,
          ciudad: {
            select: {
              id: true,
              nombre: true,
              pais: { select: { id: true, nombre: true, brandId: true } },
            },
          },
        },
      },
    },
  });

  const ciudadesPublicas = await prisma.ciudad.findMany({
    where: { pais: { brandId: BRAND_ID } },
    select: { id: true, nombre: true, pais: { select: { id: true, nombre: true } } },
  });
  const ciudadPublicaPorClave = new Map<string, (typeof ciudadesPublicas)[number][]>();
  for (const c of ciudadesPublicas) {
    const k = `${norm(c.nombre)}||${norm(c.pais.nombre)}`;
    const arr = ciudadPublicaPorClave.get(k) ?? [];
    arr.push(c);
    ciudadPublicaPorClave.set(k, arr);
  }

  const planDestinos: PlanDestino[] = [];
  const destinosSinEquivalente: string[] = [];
  const destinosEnConflicto: string[] = [];

  for (const p of paquetes) {
    const ciudadesDelPaquete = new Set(p.destinos.map((d) => d.ciudadId));
    for (const d of p.destinos) {
      const pais = d.ciudad?.pais;
      if (!pais || pais.brandId === BRAND_ID) continue;
      const k = `${norm(d.ciudad!.nombre)}||${norm(pais.nombre)}`;
      const candidatos = ciudadPublicaPorClave.get(k) ?? [];
      const etiqueta = `paquete "${p.slug ?? p.id}" destino[orden=${d.orden}] ciudad="${d.ciudad!.nombre}" (${d.ciudadId}, país "${pais.nombre}"/${pais.brandId})`;
      if (candidatos.length === 0) {
        destinosSinEquivalente.push(etiqueta);
        continue;
      }
      const nueva = candidatos[0];
      // @@unique([paqueteId, ciudadId, orden]): si el paquete ya tiene un
      // destino con la ciudad destino, el update podría chocar.
      if (ciudadesDelPaquete.has(nueva.id)) {
        destinosEnConflicto.push(`${etiqueta} → la ciudad destino ${nueva.id} ya está en el paquete`);
        continue;
      }
      planDestinos.push({
        destinoId: d.id,
        paqueteSlug: p.slug ?? p.id,
        orden: d.orden,
        ciudadVieja: {
          id: d.ciudadId,
          nombre: d.ciudad!.nombre,
          pais: pais.nombre,
          brandId: pais.brandId,
        },
        ciudadNueva: { id: nueva.id, nombre: nueva.nombre, pais: nueva.pais.nombre },
      });
    }
  }

  console.log(`\n[B] DESTINOS DE PAQUETE A REPUNTAR A LA CIUDAD DEL BRAND PÚBLICO (${planDestinos.length})`);
  if (planDestinos.length === 0) console.log("     — nada que hacer —");
  for (const d of planDestinos) {
    console.log(`     • ${d.paqueteSlug} / destino ${d.destinoId} (orden ${d.orden})`);
    console.log(
      `         ${d.ciudadVieja.nombre} (${d.ciudadVieja.id}, ${d.ciudadVieja.pais} · ${d.ciudadVieja.brandId})` +
        `  →  ${d.ciudadNueva.nombre} (${d.ciudadNueva.id}, ${d.ciudadNueva.pais} · ${BRAND_ID})`,
    );
  }
  if (destinosSinEquivalente.length > 0) {
    console.log(`\n     SIN EQUIVALENTE — crear a mano (${destinosSinEquivalente.length}):`);
    for (const e of destinosSinEquivalente) console.log(`       - ${e}`);
  }
  if (destinosEnConflicto.length > 0) {
    console.log(`\n     CONFLICTO de unicidad — revisar a mano (${destinosEnConflicto.length}):`);
    for (const e of destinosEnConflicto) console.log(`       - ${e}`);
  }

  // ── (C) Paquetes publicados sin destinos (no auto-reparables) ─────────────
  const sinDestinos = paquetes.filter((p) => p.publicado && p.destinos.length === 0);
  console.log(`\n[C] PAQUETES PUBLICADOS SIN DESTINOS — no auto-reparables (${sinDestinos.length})`);
  console.log("     Sin destino no hay país ni región de la cual inferir la URL.");
  console.log("     Hay que cargarles el destino desde el backend (Paquetes → Destinos).");
  for (const p of sinDestinos) {
    console.log(`       - ${p.slug ?? "(sin slug)"} — ${p.titulo}`);
  }

  // ── Aplicar ───────────────────────────────────────────────────────────────
  const totalCambios = planPaises.length + planDestinos.length;
  if (!apply) {
    console.log(
      `\n${"=".repeat(78)}\n== DRY RUN ==  ${totalCambios} cambio(s) planificado(s). No se escribió nada.\n` +
        `Correr con --apply para aplicar.\n`,
    );
    return;
  }

  if (totalCambios === 0) {
    console.log(`\n${"=".repeat(78)}\nNada que aplicar.\n`);
    return;
  }

  await prisma.$transaction([
    ...planPaises.map((p) =>
      prisma.pais.update({ where: { id: p.paisId }, data: { regionId: p.to } }),
    ),
    ...planDestinos.map((d) =>
      prisma.paqueteDestino.update({
        where: { id: d.destinoId },
        data: { ciudadId: d.ciudadNueva.id },
      }),
    ),
  ]);

  console.log(
    `\n${"=".repeat(78)}\n✔ APLICADO: ${planPaises.length} país(es) repuntado(s) y ` +
      `${planDestinos.length} destino(s) de paquete repuntado(s).\n` +
      `Revalidar el cache público (tags "regiones" / "paquetes") o esperar el revalidate.\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
