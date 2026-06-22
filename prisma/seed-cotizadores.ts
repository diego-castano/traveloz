// ---------------------------------------------------------------------------
// Seed local de los cotizadores de cliente (idempotente, por slug).
//
// La creación en el servidor la hace la migración 20260622130000 (que Railway
// corre en el deploy). Este script es para correrlo a mano contra una base si
// hace falta:  npx tsx prisma/seed-cotizadores.ts  (con .env.local cargado).
//
// La config vive en prisma/cotizadores-data.ts (fuente de verdad compartida).
// Crea como BORRADOR (publicado:false); publicá desde el panel.
// ---------------------------------------------------------------------------

import { Prisma, PrismaClient } from "@prisma/client";
import { MARCAS } from "./cotizadores-data";

const prisma = new PrismaClient();

async function main() {
  for (const m of MARCAS) {
    const campos = m.campos as unknown as Prisma.InputJsonValue;
    const data = {
      nombreMarca: m.nombreMarca,
      tituloHero: m.tituloHero,
      textoInstitucional: m.textoInstitucional,
      campos,
    };
    await prisma.cotizadorLanding.upsert({
      where: { slug: m.slug },
      update: { ...data, deletedAt: null },
      create: { slug: m.slug, publicado: false, ...data },
    });
    console.log(`✓ ${m.nombreMarca} (/${m.slug}) — ${m.campos.length} campos`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
