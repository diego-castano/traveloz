/**
 * fix-regimen-catalog.ts — Consolidates the Regimen catalog to the 7
 * canonical options requested by the client:
 *
 *   - All Inclusive
 *   - Desayuno
 *   - Media pensión (con bebidas)
 *   - Media pensión (sin bebidas)
 *   - Pensión completa (con bebidas)
 *   - Pensión completa (sin bebidas)
 *   - Solo Alojamiento
 *
 * Strategy (per brand):
 *   1. For each regimen not in the target list, if it has PrecioAlojamiento
 *      refs, remap them to the closest canonical regimen (by nombre/abrev).
 *      If no obvious remap, throw (needs manual decision).
 *   2. Delete all non-canonical regímenes.
 *   3. Upsert the 7 canonical regímenes per brand.
 *
 * Dry-run by default; --confirm applies.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical target: nombre + abrev
const TARGET_REGIMENES: Array<{ nombre: string; abrev: string }> = [
  { nombre: 'All Inclusive', abrev: 'AI' },
  { nombre: 'Desayuno', abrev: 'BB' },
  { nombre: 'Media pensión (con bebidas)', abrev: 'MPC' },
  { nombre: 'Media pensión (sin bebidas)', abrev: 'MPS' },
  { nombre: 'Pensión completa (con bebidas)', abrev: 'PCC' },
  { nombre: 'Pensión completa (sin bebidas)', abrev: 'PCS' },
  { nombre: 'Solo Alojamiento', abrev: 'SA' },
];

// Remap non-canonical → canonical (by abrev match, falling back to nombre).
// e.g. "Desayuno incluido" (abrev BB) → "Desayuno"; "Media Pension" (MP) → "Media pensión (con bebidas)".
function canonicalForLegacy(legacyNombre: string, legacyAbrev: string): string | null {
  const lower = legacyNombre.toLowerCase();

  if (/all inclusive|ultra/i.test(lower)) return 'All Inclusive';
  if (/desayuno/i.test(lower) || legacyAbrev === 'BB' || legacyAbrev === 'DES') return 'Desayuno';
  if (/solo aloj|sin comidas/i.test(lower) || legacyAbrev === 'SA') return 'Solo Alojamiento';

  // For old "Media Pension" / "Pension Completa" (no "con/sin bebidas" distinction),
  // default to "con bebidas" — safer guess. User can override manually later if wrong.
  if (/media\s*pensi[oó]n|^mp/i.test(lower) || legacyAbrev === 'MP') {
    return 'Media pensión (con bebidas)';
  }
  if (/pensi[oó]n completa|^pc/i.test(lower) || legacyAbrev === 'PC') {
    return 'Pensión completa (con bebidas)';
  }
  return null;
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const all = await prisma.regimen.findMany({
    include: { _count: { select: { precios: true } } },
    orderBy: { brandId: 'asc' },
  });
  console.log(`Total regímenes actuales: ${all.length}`);

  const brands = Array.from(new Set(all.map((r) => r.brandId)));
  console.log(`Brands presentes: ${brands.join(', ')}\n`);

  // Plan per brand
  const ops: Array<{ kind: 'create' | 'delete' | 'remap'; detail: string; apply: (tx: any) => Promise<void> }> = [];

  for (const brandId of brands) {
    const brandRegs = all.filter((r) => r.brandId === brandId);
    const byName = new Map(brandRegs.map((r) => [r.nombre, r]));

    // Upsert targets (reuse existing by exact name, create missing)
    const canonicalByName = new Map<string, string>(); // nombre → id (after plan applied)
    for (const t of TARGET_REGIMENES) {
      const existing = byName.get(t.nombre);
      if (existing) {
        canonicalByName.set(t.nombre, existing.id);
      } else {
        const newId = `${brandId}-regimen-${t.abrev.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        canonicalByName.set(t.nombre, newId);
        ops.push({
          kind: 'create',
          detail: `create "${t.nombre}" (${t.abrev}) under ${brandId}`,
          apply: async (tx) => {
            await tx.regimen.create({ data: { brandId, nombre: t.nombre, abrev: t.abrev } });
          },
        });
      }
    }

    // Remap + delete non-canonical
    for (const r of brandRegs) {
      const isTarget = TARGET_REGIMENES.some((t) => t.nombre === r.nombre);
      if (isTarget) continue;
      const canonicalName = canonicalForLegacy(r.nombre, r.abrev);
      if (!canonicalName) {
        throw new Error(`No canonical map for legacy regimen "${r.nombre}" (abrev=${r.abrev}, brand=${r.brandId}) — decide manually`);
      }
      if (r._count.precios > 0) {
        ops.push({
          kind: 'remap',
          detail: `remap ${r._count.precios} precios from "${r.nombre}" → "${canonicalName}" under ${brandId}`,
          apply: async (tx) => {
            const targetId = (await tx.regimen.findFirst({ where: { brandId, nombre: canonicalName } }))?.id;
            if (!targetId) throw new Error(`Canonical regimen "${canonicalName}" not found after create step`);
            await tx.precioAlojamiento.updateMany({ where: { regimenId: r.id }, data: { regimenId: targetId } });
          },
        });
      }
      ops.push({
        kind: 'delete',
        detail: `delete "${r.nombre}" (${r.abrev}) under ${brandId}`,
        apply: async (tx) => { await tx.regimen.delete({ where: { id: r.id } }); },
      });
    }
  }

  console.log(`Operations planned: ${ops.length}`);
  for (const op of ops) console.log(`  [${op.kind}] ${op.detail}`);

  if (!confirm) {
    console.log('\nDry-run only. Run with --confirm to apply.');
    return;
  }

  console.log('\n🔄 Applying…');
  await prisma.$transaction(async (tx) => {
    // Order: creates first (so remap has a target), then remaps, then deletes
    for (const op of ops.filter((o) => o.kind === 'create')) await op.apply(tx);
    for (const op of ops.filter((o) => o.kind === 'remap')) await op.apply(tx);
    for (const op of ops.filter((o) => o.kind === 'delete')) await op.apply(tx);
  }, { timeout: 120_000 });

  console.log('\n✅ Done.');
  const after = await prisma.regimen.findMany({ orderBy: [{ brandId: 'asc' }, { nombre: 'asc' }] });
  console.log(`\nRegímenes post-cleanup: ${after.length}`);
  for (const r of after) console.log(`  ${r.brandId} "${r.nombre}" (${r.abrev})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
