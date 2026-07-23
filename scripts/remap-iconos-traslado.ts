/**
 * Remapea el ícono de los renglones "Incluye" de traslados que quedaron con el
 * ícono genérico "traslado" (auto) aunque su texto indique otro medio.
 *
 * El generador viejo (`getSugerenciasIncluye`) creaba TODOS los traslados con
 * icon "traslado", así que un renglón como "Bus Lisboa - Oporto - Lisboa" se
 * muestra con un auto en el sitio. Este script recorre los paquetes cuyo
 * `textoIncluye` es el módulo JSON nuevo (marker `__incluye`), y para cada item
 * con icon "traslado" cuyo texto matchee la MISMA heurística
 * (`iconForTrasladoTexto`) con un resultado distinto de "traslado", propone el
 * ícono correcto (bus / tren / crucero).
 *
 * NO DESTRUCTIVO por defecto: en dry-run solo imprime la tabla de cambios y un
 * resumen, no toca la base. Los items que YA tienen "bus"/"tren"/"crucero" no
 * se tocan (ya están bien). Solo se reevalúan los "traslado".
 *
 * Uso:
 *   Dry-run (no cambia nada, solo reporta):
 *     set -a; source .env.local; set +a; npx tsx scripts/remap-iconos-traslado.ts
 *   Aplicar de verdad:
 *     npx tsx scripts/remap-iconos-traslado.ts --apply
 */
import { prisma } from "@/lib/db";
import {
  parseIncluyeItems,
  serializeIncluyeItems,
  iconForTrasladoTexto,
} from "@/lib/incluye";

interface Cambio {
  slug: string;
  paqueteId: string;
  texto: string;
  from: string;
  to: string;
}

async function main() {
  const apply = process.argv.includes("--apply");

  // Traemos solo los paquetes que tengan algo en textoIncluye; el filtro fino
  // (¿es módulo JSON?) lo hace parseIncluyeItems.
  const paquetes = await prisma.paquete.findMany({
    where: { textoIncluye: { not: null } },
    select: { id: true, slug: true, titulo: true, textoIncluye: true },
    orderBy: { id: "asc" },
  });

  const cambios: Cambio[] = [];
  const paquetesConCambios = new Set<string>();

  for (const p of paquetes) {
    const items = parseIncluyeItems(p.textoIncluye);
    if (!items) continue; // legacy (texto plano / HTML) → no es módulo JSON

    let dirty = false;
    const nuevos = items.map((it) => {
      // Solo reevaluamos los que hoy son "traslado" (auto). Los "bus", "tren",
      // "crucero", etc. ya están bien y no se tocan.
      if (it.icon !== "traslado") return it;
      const propuesto = iconForTrasladoTexto(it.texto);
      if (propuesto === "traslado") return it; // sin cambio real
      cambios.push({
        slug: p.slug ?? "(sin-slug)",
        paqueteId: p.id,
        texto: it.texto,
        from: it.icon,
        to: propuesto,
      });
      paquetesConCambios.add(p.id);
      dirty = true;
      return { ...it, icon: propuesto };
    });

    if (dirty && apply) {
      await prisma.paquete.update({
        where: { id: p.id },
        data: { textoIncluye: serializeIncluyeItems(nuevos) },
      });
    }
  }

  console.log(`Paquetes con módulo Incluye revisados: ${paquetes.length}`);
  console.log(
    `\nItems a remapear (${cambios.length}) en ${paquetesConCambios.size} paquete(s):`,
  );
  if (cambios.length === 0) {
    console.log("  (ninguno)");
  } else {
    for (const c of cambios) {
      console.log(
        `  - [${c.slug}] "${c.texto}"  ${c.from} → ${c.to}`,
      );
    }
  }

  console.log(
    `\nResumen: ${paquetesConCambios.size} paquete(s), ${cambios.length} item(s).`,
  );

  if (!apply) {
    console.log(
      "\n== DRY RUN ==  No se cambió nada. Corré con --apply para aplicar.",
    );
  } else {
    console.log(`\n✔ APLICADO: ${cambios.length} item(s) actualizados.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
