/**
 * update-testimonio-images.ts — Reemplaza las fotos de los testimonios de
 * prueba (seed-testi-*) por fotos APAISADAS de viajes/destinos, para que la
 * sección "Relatos de nuestros viajeros" del Home se vea igual al mockup
 * (el mockup usa una foto de destino, no un retrato del autor).
 *
 * Descarga de Unsplash y RE-SUBE al bucket de Railway vía processAndUpload.
 * Idempotente: sobreescribe la imageUrl de cada testimonio.
 *
 * Uso: tsx scripts/update-testimonio-images.ts
 */

import { PrismaClient } from "@prisma/client";
import { processAndUpload } from "../src/lib/file-pipeline";

const prisma = new PrismaClient();

const uns = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
const picsum = (seed: string) => `https://picsum.photos/seed/${seed}/1600/1090`;

// Cada testimonio → foto apaisada acorde a su relato. URLs conocidas-buenas
// (ya subieron OK en seed-modelo) + fallback picsum.
const IMAGES: { id: string; candidates: string[] }[] = [
  { id: "seed-testi-1", candidates: [uns("1505228395891-9a51e7e86bf6"), picsum("testi-1")] }, // atardecer playa
  { id: "seed-testi-2", candidates: [uns("1483729558449-99ef09a8c325"), picsum("testi-2")] }, // Rio / Brasil
  { id: "seed-testi-3", candidates: [uns("1473116763249-2faaef81ccda"), picsum("testi-3")] }, // costa / palmeras
  { id: "seed-testi-4", candidates: [uns("1571896349842-33c89424de2d"), picsum("testi-4")] }, // resort
  { id: "seed-testi-5", candidates: [uns("1507525428034-b723cf961d3e"), picsum("testi-5")] }, // playa caribe
  { id: "seed-testi-6", candidates: [uns("1582719508461-905c673771fd"), picsum("testi-6")] }, // piscina resort
];

async function uploadFromWeb(
  candidates: string[],
  filename: string,
): Promise<string | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 TravelOz-seed" },
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      if (!ct.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 5000) continue;
      const up = await processAndUpload(buf, ct, { folder: "testimonios", filename });
      console.log(`  ✓ ${filename} ← ${url.slice(0, 56)}… (${(up.size / 1024).toFixed(0)}KB)`);
      return up.url;
    } catch (err) {
      console.log(`  · fallo ${url.slice(0, 48)}… (${(err as Error).message})`);
    }
  }
  return null;
}

async function main() {
  console.log("▸ Actualizando fotos de testimonios (apaisadas)");
  for (const { id, candidates } of IMAGES) {
    const existing = await prisma.testimonio.findUnique({ where: { id } });
    if (!existing) {
      console.log(`  · ${id}: no existe, skip`);
      continue;
    }
    const url = await uploadFromWeb(candidates, `${id}-landscape.jpg`);
    if (url) {
      await prisma.testimonio.update({ where: { id }, data: { imageUrl: url } });
      console.log(`  → ${id} (${existing.autor}) imagen actualizada`);
    }
  }
  console.log("✓ Listo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
