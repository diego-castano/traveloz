/**
 * fix-hotels-brand.ts — Fixes the cross-brand pais/ciudad references that the
 * initial import created. Re-links each brand-1 hotel to the correct brand-1
 * país/ciudad (by name), creating missing brand-1 ciudades if needed.
 *
 * Dry-run by default; --confirm applies.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BRAND_ID = 'brand-1';

function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Regions mapping for creating missing brand-1 paises.
const COUNTRY_TO_REGION: Record<string, string> = {
  España: 'Europa', Italia: 'Europa', 'Países Bajos': 'Europa', 'Reino Unido': 'Europa',
  Francia: 'Europa', Portugal: 'Europa',
  'Estados Unidos': 'America del Norte',
  Argentina: 'Sudamerica', Brasil: 'Sudamerica', Chile: 'Sudamerica',
  Colombia: 'Sudamerica', Perú: 'Sudamerica',
  México: 'Caribe', Aruba: 'Caribe', Jamaica: 'Caribe', Cuba: 'Caribe',
  Curazao: 'Caribe', 'República Dominicana': 'Caribe',
};

async function main() {
  const confirm = process.argv.includes('--confirm');

  // 1. Load brand-1 paises (indexed by normalized name)
  const brand1Paises = await prisma.pais.findMany({
    where: { brandId: BRAND_ID },
    include: { ciudades: true },
  });
  const paisByName = new Map<string, typeof brand1Paises[number]>();
  for (const p of brand1Paises) {
    paisByName.set(normalizeForMatch(p.nombre), p);
  }

  // 2. Load regions for creating missing paises
  const regions = await prisma.region.findMany();
  const regionByName = new Map(regions.map((r) => [r.nombre, r.id]));

  // 3. Load all brand-1 hotels with their current refs
  const hotels = await prisma.alojamiento.findMany({
    where: { brandId: BRAND_ID },
    include: {
      pais: { select: { id: true, nombre: true, brandId: true } },
      ciudad: { select: { id: true, nombre: true, paisId: true, pais: { select: { nombre: true, brandId: true } } } },
    },
  });

  console.log(`Total brand-1 hotels: ${hotels.length}`);
  const bad = hotels.filter((h) =>
    (h.pais && h.pais.brandId !== BRAND_ID) ||
    (h.ciudad && h.ciudad.pais?.brandId !== BRAND_ID)
  );
  console.log(`Misaligned (paisId or ciudadId points outside brand-1): ${bad.length}`);

  // 4. Plan fixes. For each bad hotel:
  //    - Find target pais in brand-1 (by name)
  //    - Find target ciudad in brand-1 (by name under target pais)
  //    - If missing, plan to create (pais or ciudad)
  type Fix = { hotelId: string; setPaisId: string | null; setCiudadId: string | null; notes: string };
  const fixes: Fix[] = [];
  const paisesToCreate = new Map<string, { nombre: string; region: string }>(); // key: pais-name
  const ciudadesToCreate = new Map<string, { nombre: string; paisName: string }>(); // key: `${paisName}|${ciudadName}`

  for (const h of bad) {
    const oldPaisName = h.pais?.nombre ?? h.ciudad?.pais?.nombre ?? null;
    const oldCiudadName = h.ciudad?.nombre ?? null;
    if (!oldPaisName) continue;

    let targetPais = paisByName.get(normalizeForMatch(oldPaisName));
    if (!targetPais) {
      paisesToCreate.set(oldPaisName, {
        nombre: oldPaisName,
        region: COUNTRY_TO_REGION[oldPaisName] ?? 'Sudamerica',
      });
    }

    let targetCiudadId: string | null = null;
    if (oldCiudadName && targetPais) {
      const nrm = normalizeForMatch(oldCiudadName);
      const existing = targetPais.ciudades.find((c) => normalizeForMatch(c.nombre) === nrm);
      if (existing) {
        targetCiudadId = existing.id;
      } else {
        ciudadesToCreate.set(`${oldPaisName}|${oldCiudadName}`, { nombre: oldCiudadName, paisName: oldPaisName });
      }
    }

    fixes.push({
      hotelId: h.id,
      setPaisId: targetPais?.id ?? null, // will patch after creation
      setCiudadId: targetCiudadId,       // will patch after creation
      notes: `${h.nombre} from "${oldPaisName}/${oldCiudadName}" to brand-1`,
    });
  }

  console.log(`\nPlan:`);
  console.log(`  Create ${paisesToCreate.size} missing brand-1 países`);
  console.log(`  Create ${ciudadesToCreate.size} missing brand-1 ciudades`);
  console.log(`  Update ${fixes.length} hotels (paisId + ciudadId)`);

  if (paisesToCreate.size > 0) {
    console.log('\nPaíses to create under brand-1:');
    for (const [name, { region }] of Array.from(paisesToCreate.entries())) console.log(`  - ${name} (region=${region})`);
  }

  if (!confirm) {
    console.log('\nDry-run only. Run with --confirm to apply.');
    return;
  }

  console.log('\n🔄 Applying fixes…');

  // 5. Create missing brand-1 países
  for (const [name, { region }] of Array.from(paisesToCreate.entries())) {
    const regionId = regionByName.get(region);
    if (!regionId) throw new Error(`Region not found: ${region}`);
    const created = await prisma.pais.create({
      data: { brandId: BRAND_ID, nombre: name, regionId },
    });
    paisByName.set(normalizeForMatch(name), { ...created, ciudades: [] } as typeof brand1Paises[number]);
  }
  console.log(`  ✓ ${paisesToCreate.size} países created`);

  // 6. Create missing brand-1 ciudades
  let cityCount = 0;
  for (const [, { nombre, paisName }] of Array.from(ciudadesToCreate.entries())) {
    const target = paisByName.get(normalizeForMatch(paisName));
    if (!target) throw new Error(`País not found: ${paisName}`);
    const created = await prisma.ciudad.create({
      data: { nombre, paisId: target.id },
    });
    target.ciudades.push(created as typeof target.ciudades[number]);
    cityCount++;
  }
  console.log(`  ✓ ${cityCount} ciudades created`);

  // 7. Apply hotel updates in a single interactive transaction (supports timeout).
  await prisma.$transaction(async (tx) => {
    for (const f of fixes) {
      const hotel = hotels.find((h) => h.id === f.hotelId)!;
      const oldPaisName = (hotel.pais?.nombre ?? hotel.ciudad?.pais?.nombre)!;
      const oldCiudadName = hotel.ciudad?.nombre ?? null;
      const target = paisByName.get(normalizeForMatch(oldPaisName))!;
      const ciudad = oldCiudadName
        ? target.ciudades.find((c) => normalizeForMatch(c.nombre) === normalizeForMatch(oldCiudadName))
        : null;
      await tx.alojamiento.update({
        where: { id: f.hotelId },
        data: { paisId: target.id, ciudadId: ciudad?.id ?? null },
      });
    }
  }, { timeout: 600_000 });
  console.log(`  ✓ ${fixes.length} hoteles updated`);
  console.log('\n✅ Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
