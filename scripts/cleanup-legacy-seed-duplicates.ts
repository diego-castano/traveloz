/**
 * cleanup-legacy-seed-duplicates.ts — Removes duplicate país/ciudad rows left
 * over from the pre-import seed. The seed used non-accented names and
 * deterministic IDs ("pais-1", "ciudad-7"); the client-driven catalog uses
 * accented names and CUID IDs.
 *
 * After the hotel import + brand fix, the old rows have 0 alojamiento/traslado
 * refs. This script:
 * 1. Remaps any remaining paqueteDestino rows pointing to an old ciudad to
 *    the matching new ciudad (by normalized name).
 * 2. Deletes all `id startsWith "ciudad-"` ciudad rows that no longer have
 *    refs.
 * 3. Deletes all `id startsWith "pais-"` país rows with 0 ciudades.
 *
 * Dry-run by default; --confirm applies.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalize(s: string): string {
  // Strip combining diacritical marks (U+0300 – U+036F).
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const confirm = process.argv.includes('--confirm');

  // 1. Load old ciudad/país rows.
  const oldCiudades = await prisma.ciudad.findMany({
    where: { id: { startsWith: 'ciudad-' } },
    include: { pais: { select: { nombre: true, brandId: true } } },
  });
  const oldPaises = await prisma.pais.findMany({ where: { id: { startsWith: 'pais-' } } });

  // 2. Load brand-1 new ciudades to find remap targets.
  const newCiudades = await prisma.ciudad.findMany({
    where: {
      AND: [
        { id: { not: { startsWith: 'ciudad-' } } },
        { pais: { brandId: 'brand-1' } },
      ],
    },
    include: { pais: { select: { nombre: true, brandId: true } } },
  });

  // 3. Find active paqueteDestino refs to old ciudades.
  const pds = await prisma.paqueteDestino.findMany({
    where: { ciudadId: { in: oldCiudades.map((c) => c.id) } },
    include: { ciudad: { include: { pais: { select: { nombre: true, brandId: true } } } } },
  });

  console.log(`OLD ciudades: ${oldCiudades.length}`);
  console.log(`OLD países: ${oldPaises.length}`);
  console.log(`paqueteDestino refs to old ciudades: ${pds.length}`);
  console.log();

  // 4. For each PD, find the new ciudad by country+name match (normalized).
  const remapPlan: Array<{ pdId: string; oldCiudadId: string; oldLabel: string; newCiudadId: string; newLabel: string }> = [];
  for (const pd of pds) {
    const c = pd.ciudad;
    if (!c?.pais) continue;
    const oldPaisName = normalize(c.pais.nombre);
    const oldCiudadName = normalize(c.nombre);
    // Look for a new ciudad with matching país name (normalized) AND ciudad name (normalized).
    const target = newCiudades.find(
      (nc) =>
        nc.pais && normalize(nc.pais.nombre) === oldPaisName && normalize(nc.nombre) === oldCiudadName,
    );
    if (!target) {
      console.log(`⚠️  No target found for PD ${pd.id}: ciudad="${c.nombre}"/${c.pais.nombre}`);
      continue;
    }
    remapPlan.push({
      pdId: pd.id,
      oldCiudadId: c.id,
      oldLabel: `${c.nombre}/${c.pais.nombre}(brand=${c.pais.brandId})`,
      newCiudadId: target.id,
      newLabel: `${target.nombre}/${target.pais?.nombre}(brand=${target.pais?.brandId})`,
    });
  }

  console.log(`Remaps to apply: ${remapPlan.length}`);
  for (const r of remapPlan) {
    console.log(`  pd=${r.pdId} : ${r.oldLabel} → ${r.newLabel}`);
  }
  console.log();

  // 5. After the remap, which old ciudades still have refs?
  const oldCiudadesToDelete = oldCiudades.filter((c) => {
    const stillRefd = pds.some((pd) => pd.ciudadId === c.id && !remapPlan.find((r) => r.pdId === pd.id));
    return !stillRefd;
  });
  console.log(`OLD ciudades to delete (no more refs after remap): ${oldCiudadesToDelete.length}`);
  const oldCiudadesStillRefd = oldCiudades.length - oldCiudadesToDelete.length;
  if (oldCiudadesStillRefd > 0) console.log(`  (${oldCiudadesStillRefd} ciudades still referenced — they will be kept)`);

  // 6. Países with no remaining ciudades after deletion → deletable.
  const oldCiudadIdsDeleted = new Set(oldCiudadesToDelete.map((c) => c.id));
  // For each old país, check if it has any non-"ciudad-" child ciudades OR any kept old ciudades.
  const oldPaisesAll = await prisma.pais.findMany({
    where: { id: { startsWith: 'pais-' } },
    include: { ciudades: { select: { id: true } } },
  });
  const oldPaisesToDelete = oldPaisesAll.filter((p) => {
    const remaining = p.ciudades.filter((c) => !oldCiudadIdsDeleted.has(c.id));
    return remaining.length === 0;
  });
  console.log(`OLD países to delete (no remaining ciudades after cleanup): ${oldPaisesToDelete.length}`);

  if (!confirm) {
    console.log('\nDry-run only. Run with --confirm to apply.');
    return;
  }

  console.log('\n🔄 Applying cleanup…');
  await prisma.$transaction(async (tx) => {
    // a. Remap paqueteDestino refs
    for (const r of remapPlan) {
      await tx.paqueteDestino.update({
        where: { id: r.pdId },
        data: { ciudadId: r.newCiudadId },
      });
    }
    // b. Delete old ciudades that lost their refs
    if (oldCiudadesToDelete.length) {
      await tx.ciudad.deleteMany({ where: { id: { in: oldCiudadesToDelete.map((c) => c.id) } } });
    }
    // c. Delete old países
    if (oldPaisesToDelete.length) {
      await tx.pais.deleteMany({ where: { id: { in: oldPaisesToDelete.map((p) => p.id) } } });
    }
  }, { timeout: 120_000 });

  console.log(`✓ ${remapPlan.length} paqueteDestino remapped`);
  console.log(`✓ ${oldCiudadesToDelete.length} old ciudades deleted`);
  console.log(`✓ ${oldPaisesToDelete.length} old países deleted`);
  console.log('\n✅ Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
