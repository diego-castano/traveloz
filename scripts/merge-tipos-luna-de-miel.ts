/**
 * Merge de los tipos de paquete duplicados "Luna de Miel" (singular) y
 * "Lunas de miel" (plural) en uno solo.
 *
 * NO DESTRUCTIVO: reasigna los paquetes del duplicado al canónico y DESACTIVA
 * (activo:false) el tipo duplicado. No borra ninguna fila ni pierde datos: la
 * fila del duplicado queda en la base, solo deja de estar activa (así no
 * aparece más en el selector ni se puede volver a asignar).
 *
 * Canónico por defecto: el tipo cuyo nombre slugifica a "lunas-de-miel"
 * (= "Lunas de miel"), que es al que ya apunta la tarjeta del home
 * (CategoriaDestacada.link = "/destinos?tipo=lunas-de-miel"). El duplicado es
 * el que slugifica a "luna-de-miel" (= "Luna de Miel"). Se pueden invertir con
 * las env CANONICAL_SLUG / DUP_SLUG si preferís que el nombre que quede sea el
 * singular (en ese caso además hay que actualizar el link/título de la tarjeta
 * del home desde /backend/web/inicio).
 *
 * Uso:
 *   Dry-run (no cambia nada, solo reporta):
 *     npx tsx scripts/merge-tipos-luna-de-miel.ts
 *   Aplicar de verdad:
 *     APPLY=1 npx tsx scripts/merge-tipos-luna-de-miel.ts
 */
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";

const CANONICAL_SLUG = process.env.CANONICAL_SLUG ?? "lunas-de-miel";
const DUP_SLUG = process.env.DUP_SLUG ?? "luna-de-miel";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const apply = process.env.APPLY === "1";

  const tipos = await prisma.tipoPaquete.findMany({ where: { brandId: BRAND_ID } });
  const canonical = tipos.find((t) => slugify(t.nombre) === CANONICAL_SLUG);
  const dup = tipos.find((t) => slugify(t.nombre) === DUP_SLUG);

  console.log(`Marca: ${BRAND_ID}`);
  console.log(`Tipos con nombre tipo "luna...":`);
  for (const t of tipos.filter((t) => slugify(t.nombre).includes("luna"))) {
    const n = await prisma.paquete.count({ where: { tipoPaqueteId: t.id } });
    console.log(`  - "${t.nombre}" (${t.id}) · activo=${t.activo} · ${n} paquete(s)`);
  }

  if (!canonical) throw new Error(`No encontré el tipo CANÓNICO (slug "${CANONICAL_SLUG}").`);
  if (!dup) {
    console.log(`\nNo hay tipo duplicado con slug "${DUP_SLUG}". Nada que mergear.`);
    return;
  }
  if (canonical.id === dup.id) {
    console.log("\nCanónico y duplicado son el mismo tipo. Nada que hacer.");
    return;
  }

  const paquetesDup = await prisma.paquete.findMany({
    where: { tipoPaqueteId: dup.id },
    select: { id: true, titulo: true, publicado: true },
    orderBy: { id: "asc" },
  });

  console.log(`\nCANÓNICO (queda): "${canonical.nombre}" (${canonical.id})`);
  console.log(`DUPLICADO (se desactiva): "${dup.nombre}" (${dup.id})`);
  console.log(`Paquetes a reasignar (${paquetesDup.length}):`);
  for (const p of paquetesDup) {
    console.log(`  - #${p.id} ${p.titulo}${p.publicado ? "" : "  [NO PUBLICADO]"}`);
  }

  if (!apply) {
    console.log("\n== DRY RUN ==  No se cambió nada. Corré con APPLY=1 para aplicar.");
    return;
  }

  const [reasignados] = await prisma.$transaction([
    prisma.paquete.updateMany({
      where: { tipoPaqueteId: dup.id },
      data: { tipoPaqueteId: canonical.id },
    }),
    prisma.tipoPaquete.update({
      where: { id: dup.id },
      data: { activo: false },
    }),
  ]);

  console.log(
    `\n✔ APLICADO: ${reasignados.count} paquete(s) reasignados a "${canonical.nombre}". ` +
      `El duplicado "${dup.nombre}" quedó DESACTIVADO (no se borró).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
