import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mapping: country name -> region slug
const mapping: Record<string, string> = {
  // Europa
  España: "europa",
  Francia: "europa",
  Italia: "europa",
  Portugal: "europa",
  Grecia: "europa",
  Turquía: "europa",

  // Estados Unidos
  "Estados Unidos": "estados-unidos",

  // Asia
  Tailandia: "asia",
  India: "asia",
  Nepal: "asia",
  Camboya: "asia",
  Filipinas: "asia",
  "Emiratos Árabes": "asia",
  Egipto: "asia", // geographically Africa but commonly grouped with Middle East/Asia in travel catalogs
  Sudáfrica: "asia", // Africa – no Africa region; closest bucket. User can reassign.

  // Caribe
  México: "caribe",
  "República Dominicana": "caribe",
  Cuba: "caribe",
  Jamaica: "caribe",
  Aruba: "caribe",
  Curazao: "caribe",
  "Costa Rica": "caribe",
  Panamá: "caribe",

  // Sudamérica
  Argentina: "sudamerica",
  Chile: "sudamerica",
  Perú: "sudamerica",
  Colombia: "sudamerica",
  Uruguay: "sudamerica",

  // Brasil
  Brasil: "brasil",
};

async function main() {
  const regiones = await prisma.region.findMany();
  const regionByBrandSlug = new Map<string, string>();
  for (const r of regiones) regionByBrandSlug.set(`${r.brandId}:${r.slug}`, r.id);

  const sinRegion = await prisma.pais.findMany({ where: { regionId: null } });
  let matched = 0;
  let skipped: string[] = [];

  for (const pais of sinRegion) {
    const slug = mapping[pais.nombre];
    if (!slug) {
      skipped.push(pais.nombre);
      continue;
    }
    const regionId = regionByBrandSlug.get(`${pais.brandId}:${slug}`);
    if (!regionId) {
      skipped.push(`${pais.nombre} (no region '${slug}' for brand ${pais.brandId})`);
      continue;
    }
    await prisma.pais.update({ where: { id: pais.id }, data: { regionId } });
    matched++;
  }

  console.log(`Matched ${matched} paises`);
  if (skipped.length) console.log("Skipped:", skipped);

  const stillNull = await prisma.pais.count({ where: { regionId: null } });
  console.log(`Total paises sin region: ${stillNull}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
