/**
 * update-nosotros-text.ts — Reemplaza el texto de la columna izquierda del
 * primer bloque de /about ("Quiénes somos") por el texto completo del mockup
 * (html_inicial/about.html). El texto que había era una versión resumida que
 * dejaba mucho espacio vacío junto a la imagen.
 *
 * Uso: node --env-file=.env.local --import tsx scripts/update-nosotros-text.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HISTORIA =
  "TravelOz nació en agosto de 2018 como el sueño compartido de cuatro amigos unidos por una misma pasión: viajar y ayudar a otros a descubrir el mundo. Lo que comenzó como una idea entre conversaciones y anécdotas, se transformó en un proyecto firme, impulsado por nuestra formación profesional y por años de experiencia en el sector turístico. Con esa base, decidimos dar el gran paso y crear una agencia con una misión clara: brindar un servicio de excelencia, cercano y verdaderamente personalizado, capaz de transformar cada viaje en una experiencia inolvidable.";

const MISION =
  "Con el tiempo entendimos que ofrecer calidad no se trata solo de elegir buenos destinos o diseñar itinerarios; empieza mucho antes, en lo que sucede puertas adentro. Por eso trabajamos para construir un equipo comprometido, capacitado y profundamente apasionado por lo que hace. Cada integrante aporta su mirada, su energía y su vocación de servicio, permitiéndonos crecer y mejorar de manera constante. Creemos firmemente que solo desde un entorno de trabajo sano, colaborativo y motivador es posible brindar una atención que realmente marque la diferencia.";

async function main() {
  for (const [key, value] of [
    ["nosotros_historia", HISTORIA],
    ["nosotros_mision", MISION],
  ] as const) {
    const r = await prisma.siteSetting.updateMany({ where: { key }, data: { value } });
    console.log(`  ${r.count > 0 ? "✓" : "✗ (no existe)"} ${key} (${value.length} chars)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
