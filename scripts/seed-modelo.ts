/**
 * seed-modelo.ts — Datos de demostración "modelo" para validar el frontend
 * end-to-end con contenido realista, todo conectado a la base de datos y al
 * bucket de Railway.
 *
 * Crea / actualiza:
 *   1. Hero image de cada región (brand-1) — descarga una foto temática,
 *      la sube al bucket S3 de Railway, persiste Region.heroImage.
 *   2. 6 testimonios — 4 generales (Home "Relatos de nuestros viajeros") +
 *      2 vinculados al paquete modelo (aparecen en el detalle del paquete).
 *      Cada uno con foto de autor subida al bucket.
 *   3. Paquete modelo "Punta Cana Premium" — completo y publicado:
 *      datos, aéreo + traslado + seguro, itinerario, 3 opciones hoteleras
 *      con hoteles + precios, galería de 6 fotos subidas al bucket, y todos
 *      los campos de frontend (slug, SEO, textos públicos).
 *
 * Imágenes: se descargan de fuentes públicas (Unsplash) y se RE-SUBEN al
 * bucket de Railway vía processAndUpload — el sitio nunca hot-linkea, todo
 * queda hospedado en el bucket propio. Cada slot tiene URLs candidatas con
 * fallback a picsum.photos (foto real genérica) si las temáticas fallan.
 *
 * Idempotente: re-correrlo actualiza en vez de duplicar.
 *
 * Uso:
 *   tsx scripts/seed-modelo.ts            # todo
 *   tsx scripts/seed-modelo.ts --skip-images   # sin re-subir imágenes
 */

import { PrismaClient } from "@prisma/client";
import { processAndUpload } from "../src/lib/file-pipeline";
import { generateSequentialId } from "../src/lib/sequential-id";

const prisma = new PrismaClient();
const BRAND = "brand-1";
const SKIP_IMAGES = process.argv.includes("--skip-images");

// ---------------------------------------------------------------------------
// Image helper — try each candidate URL, upload the first that works to the
// Railway bucket. Returns the bucket URL (/api/image/...) or null.
// ---------------------------------------------------------------------------
async function uploadFromWeb(
  candidates: string[],
  folder: string,
  filename: string,
): Promise<string | null> {
  if (SKIP_IMAGES) return null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 TravelOz-seed" },
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      if (!ct.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 5000) continue; // guard against error pages
      const up = await processAndUpload(buf, ct, { folder, filename });
      console.log(`    ✓ ${filename} ← ${url.slice(0, 60)}… (${(up.size / 1024).toFixed(0)}KB)`);
      return up.url;
    } catch (err) {
      console.log(`    · fallo ${url.slice(0, 50)}… (${(err as Error).message})`);
    }
  }
  console.log(`    ✗ ${filename}: ninguna URL funcionó`);
  return null;
}

// Unsplash photo URLs (w=1600 q=80). picsum.photos as last-resort fallback.
const uns = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
const picsum = (seed: string) => `https://picsum.photos/seed/${seed}/1600/900`;

// ---------------------------------------------------------------------------
// 1. Hero images de regiones
// ---------------------------------------------------------------------------
const REGION_IMAGES: Record<string, string[]> = {
  caribe: [uns("1507525428034-b723cf961d3e"), uns("1505881402582-c5bc11054f91"), picsum("caribe-beach")],
  brasil: [uns("1483729558449-99ef09a8c325"), uns("1518639192441-8fce0a366e2e"), picsum("rio-brasil")],
  sudamerica: [uns("1531168556467-80aace0d0144"), uns("1526392060635-9d6019884377"), picsum("patagonia")],
  europa: [uns("1502602898657-3e91760cbb34"), uns("1499856871958-5b9627545d1a"), picsum("europa-city")],
  asia: [uns("1528181304800-259b08848526"), uns("1535139262971-c51845709a48"), picsum("asia-temple")],
  oceania: [uns("1506973035872-a4ec16b8e8d9"), uns("1523482580672-f109ba8cb9be"), picsum("oceania")],
  "estados-unidos": [uns("1496442226666-8d4d0e62e6e9"), uns("1485871981521-5b1fd3805eee"), picsum("usa-nyc")],
};

async function seedRegionHeroes() {
  console.log("▸ Hero images de regiones");
  const regiones = await prisma.region.findMany({
    where: { brandId: BRAND },
    select: { id: true, slug: true, nombre: true, heroImage: true },
  });
  for (const r of regiones) {
    const candidates = REGION_IMAGES[r.slug];
    if (!candidates) {
      console.log(`  · ${r.slug}: sin imagen candidata, skip`);
      continue;
    }
    if (r.heroImage && r.heroImage.startsWith("/api/image/")) {
      console.log(`  · ${r.slug}: ya tiene hero en bucket, skip`);
      continue;
    }
    const url = await uploadFromWeb(candidates, "regiones", `region-${r.slug}.jpg`);
    if (url) {
      await prisma.region.update({ where: { id: r.id }, data: { heroImage: url } });
      console.log(`  ✓ ${r.slug} → heroImage actualizado`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Testimonios
// ---------------------------------------------------------------------------
// El mockup del Home ("Relatos de nuestros viajeros") usa una foto APAISADA
// del destino, no un retrato del autor. Cada testimonio lleva una foto de
// viaje acorde a su relato.
const TESTI_IMAGES: Record<string, string[]> = {
  "seed-testi-1": [uns("1505228395891-9a51e7e86bf6"), picsum("testi-1")], // atardecer playa
  "seed-testi-2": [uns("1483729558449-99ef09a8c325"), picsum("testi-2")], // Rio / Brasil
  "seed-testi-3": [uns("1473116763249-2faaef81ccda"), picsum("testi-3")], // costa / palmeras
  "seed-testi-4": [uns("1571896349842-33c89424de2d"), picsum("testi-4")], // resort
  "seed-testi-5": [uns("1507525428034-b723cf961d3e"), picsum("testi-5")], // playa caribe
  "seed-testi-6": [uns("1582719508461-905c673771fd"), picsum("testi-6")], // piscina resort
};

interface TestimonioSeed {
  id: string;
  autor: string;
  ubicacion: string;
  titulo: string;
  texto: string;
  rating: number;
  orden: number;
  linkPaqueteModelo?: boolean;
}

const TESTIMONIOS: TestimonioSeed[] = [
  {
    id: "seed-testi-1",
    autor: "Carolina Méndez",
    ubicacion: "Montevideo, Uruguay",
    titulo: "Un viaje impecable de principio a fin",
    texto: "Reservamos nuestra luna de miel con TravelOz y superó todas las expectativas. La atención fue personalizada, nos respondieron cada duda en minutos y el itinerario estuvo perfecto. Volveríamos a elegirlos sin pensarlo.",
    rating: 5,
    orden: 1,
  },
  {
    id: "seed-testi-2",
    autor: "Martín Olivera",
    ubicacion: "Punta del Este, Uruguay",
    titulo: "Profesionalismo y trato cercano",
    texto: "Viajé con mi familia a Brasil y todo salió tal cual lo planeamos. Los traslados puntuales, el hotel tal como nos lo mostraron. Se nota la experiencia del equipo. Recomendado 100%.",
    rating: 5,
    orden: 2,
  },
  {
    id: "seed-testi-3",
    autor: "Lucía Fernández",
    ubicacion: "Salto, Uruguay",
    titulo: "Nos armaron el viaje a medida",
    texto: "Queríamos algo distinto y nos diseñaron un circuito que combinó playa y ciudad. Cada detalle pensado. El acompañamiento durante el viaje fue clave cuando tuvimos que reprogramar un vuelo.",
    rating: 5,
    orden: 3,
  },
  {
    id: "seed-testi-4",
    autor: "Diego Rodríguez",
    ubicacion: "Maldonado, Uruguay",
    titulo: "Precios competitivos y sin sorpresas",
    texto: "Comparé con varias agencias y TravelOz tenía la mejor relación precio-calidad. Lo más importante: cero sorpresas, todo lo cotizado fue exactamente lo que pagamos. Transparencia total.",
    rating: 4,
    orden: 4,
  },
  {
    id: "seed-testi-5",
    autor: "Valentina Castro",
    ubicacion: "Montevideo, Uruguay",
    titulo: "Punta Cana fue un sueño",
    texto: "El paquete a Punta Cana fue exactamente lo que necesitábamos para descansar. Resort all inclusive impecable, playa increíble y los traslados sin esperas. Gracias TravelOz por la #ExperienciaOZ.",
    rating: 5,
    orden: 5,
    linkPaqueteModelo: true,
  },
  {
    id: "seed-testi-6",
    autor: "Sebastián Pereyra",
    ubicacion: "Colonia, Uruguay",
    titulo: "Repetiríamos el viaje a Punta Cana",
    texto: "Segunda vez que viajamos con ellos al Caribe y otra vez nos sorprendieron. El hotel que nos recomendaron fue el punto justo entre precio y categoría. Atención de primera todo el tiempo.",
    rating: 5,
    orden: 6,
    linkPaqueteModelo: true,
  },
];

async function seedTestimonios(paqueteModeloId: string | null) {
  console.log("▸ Testimonios");
  for (const t of TESTIMONIOS) {
    const existing = await prisma.testimonio.findUnique({ where: { id: t.id } });
    let imageUrl = existing?.imageUrl ?? null;
    if (!imageUrl || !imageUrl.startsWith("/api/image/")) {
      imageUrl = await uploadFromWeb(
        TESTI_IMAGES[t.id] ?? [picsum(t.id)],
        "testimonios",
        `${t.id}.jpg`,
      );
    }
    const data = {
      autor: t.autor,
      ubicacion: t.ubicacion,
      titulo: t.titulo,
      texto: t.texto,
      rating: t.rating,
      orden: t.orden,
      publicado: true,
      imageUrl,
      paqueteId: t.linkPaqueteModelo ? paqueteModeloId : null,
    };
    await prisma.testimonio.upsert({
      where: { id: t.id },
      update: data,
      create: { id: t.id, ...data },
    });
    console.log(`  ✓ ${t.autor}${t.linkPaqueteModelo ? " (→ paquete modelo)" : ""}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Paquete modelo "Punta Cana Premium"
// ---------------------------------------------------------------------------
const PAQUETE_GALERIA: { seed: string; urls: string[] }[] = [
  { seed: "pc-playa", urls: [uns("1507525428034-b723cf961d3e"), picsum("pc-playa")] },
  { seed: "pc-resort", urls: [uns("1571896349842-33c89424de2d"), picsum("pc-resort")] },
  { seed: "pc-piscina", urls: [uns("1582719508461-905c673771fd"), picsum("pc-piscina")] },
  { seed: "pc-palmeras", urls: [uns("1473116763249-2faaef81ccda"), picsum("pc-palmeras")] },
  { seed: "pc-atardecer", urls: [uns("1505228395891-9a51e7e86bf6"), picsum("pc-atardecer")] },
  { seed: "pc-habitacion", urls: [uns("1566073771259-6a8506099945"), picsum("pc-habitacion")] },
];

async function seedPaqueteModelo(): Promise<string | null> {
  console.log("▸ Paquete modelo: Punta Cana Premium");

  const ciudad = await prisma.ciudad.findFirst({
    where: { nombre: "Punta Cana", pais: { region: { brandId: BRAND } } },
    select: { id: true },
  });
  if (!ciudad) {
    console.log("  ✗ Ciudad Punta Cana no encontrada — abortando paquete modelo");
    return null;
  }

  const MODELO_ID = "seed-modelo-punta-cana";
  const noches = 7;

  // ── Galería: subir 6 fotos al bucket ──
  const fotos: string[] = [];
  for (const g of PAQUETE_GALERIA) {
    const url = await uploadFromWeb(g.urls, "paquetes/modelo", `${g.seed}.jpg`);
    if (url) fotos.push(url);
  }
  console.log(`  ✓ Galería: ${fotos.length} fotos en el bucket`);

  // ── Paquete principal ──
  const paqueteData = {
    brandId: BRAND,
    titulo: "Punta Cana Premium — All Inclusive",
    destino: "Punta Cana, República Dominicana",
    descripcion:
      "7 noches en Punta Cana con régimen all inclusive en resort 5 estrellas frente al mar. Aéreo, traslados y asistencia al viajero incluidos.",
    textoVisual: "Caribe all inclusive · 7 noches · salidas todo el año",
    salidas: "Salidas semanales todo el año",
    noches,
    estado: "ACTIVO" as const,
    moneda: "USD",
    // Frontend / public-site fields
    slug: "punta-cana-premium-all-inclusive",
    publicado: true,
    metaTitle: "Punta Cana Premium All Inclusive | TravelOz",
    metaDescription:
      "Viajá a Punta Cana 7 noches all inclusive en resort 5★. Aéreo + traslados + asistencia. Cotizá tu viaje al Caribe con TravelOz.",
    textoIntro:
      "Escapate al Caribe con todo resuelto. Este paquete combina un resort all inclusive 5 estrellas frente a la playa de Bávaro con vuelos directos y traslados privados — solo tenés que pensar en relajarte.",
    textoIncluye:
      "Aéreo Montevideo · Punta Cana · Montevideo\nTraslados aeropuerto - hotel - aeropuerto\n7 noches de alojamiento con régimen all inclusive\nAsistencia al viajero durante todo el viaje\nImpuestos y tasas incluidos",
    itinerarioPublico:
      "Día 1 — Salida desde Montevideo, llegada a Punta Cana y traslado al resort.\nDías 2 a 7 — Días libres para disfrutar playa, piscinas, gastronomía all inclusive y excursiones opcionales.\nDía 8 — Traslado al aeropuerto y regreso a Montevideo.",
    textoCondiciones:
      "Precios por persona en base doble, sujetos a disponibilidad al momento de la reserva. No incluye gastos personales ni excursiones opcionales. Consultá condiciones de cancelación.",
    precioDesde: 1299,
    precioDesdeMoneda: "USD",
    heroImage: fotos[0] ?? null,
  };

  const existing = await prisma.paquete.findUnique({ where: { id: MODELO_ID } });
  if (existing) {
    await prisma.paquete.update({ where: { id: MODELO_ID }, data: paqueteData });
    console.log("  ✓ Paquete modelo actualizado");
  } else {
    await prisma.paquete.create({ data: { id: MODELO_ID, ...paqueteData } });
    console.log("  ✓ Paquete modelo creado");
  }

  // ── Galería de fotos (reset + recreate) ──
  await prisma.paqueteFoto.deleteMany({ where: { paqueteId: MODELO_ID } });
  if (fotos.length > 0) {
    await prisma.paqueteFoto.createMany({
      data: fotos.map((url, i) => ({
        paqueteId: MODELO_ID,
        url,
        alt: `Punta Cana Premium — foto ${i + 1}`,
        orden: i,
      })),
    });
  }

  // ── Servicios: aéreo + traslado + seguro (crear si no existen) ──
  // Precios netos fijos del paquete (compartidos entre todas las opciones):
  const NETO_AEREO = 780;
  const NETO_TRASLADO = 30;
  const SEGURO_POR_DIA = 3;
  const netoFijos = NETO_AEREO + NETO_TRASLADO + SEGURO_POR_DIA * noches;

  const aereoId = await ensureAereo();
  const trasladoId = await ensureTraslado();
  const seguroId = await ensureSeguro();

  await prisma.paqueteAereo.deleteMany({ where: { paqueteId: MODELO_ID } });
  await prisma.paqueteTraslado.deleteMany({ where: { paqueteId: MODELO_ID } });
  await prisma.paqueteSeguro.deleteMany({ where: { paqueteId: MODELO_ID } });
  if (aereoId)
    await prisma.paqueteAereo.create({
      data: { paqueteId: MODELO_ID, aereoId, orden: 0 },
    });
  if (trasladoId)
    await prisma.paqueteTraslado.create({
      data: { paqueteId: MODELO_ID, trasladoId, orden: 0 },
    });
  if (seguroId)
    await prisma.paqueteSeguro.create({
      data: { paqueteId: MODELO_ID, seguroId, diasCobertura: noches, orden: 0 },
    });
  console.log("  ✓ Servicios asignados (aéreo + traslado + seguro)");

  // ── Itinerario: 1 destino Punta Cana, 7 noches ──
  await prisma.opcionHotel.deleteMany({
    where: { destino: { paqueteId: MODELO_ID } },
  });
  await prisma.paqueteDestino.deleteMany({ where: { paqueteId: MODELO_ID } });
  const destino = await prisma.paqueteDestino.create({
    data: { paqueteId: MODELO_ID, ciudadId: ciudad.id, noches, orden: 0 },
  });

  // ── 3 opciones hoteleras con hoteles + precios ──
  const hoteles = await prisma.alojamiento.findMany({
    where: { ciudadId: ciudad.id, deletedAt: null },
    select: { id: true, nombre: true, categoria: true, precios: { select: { id: true } } },
    orderBy: { categoria: "asc" },
    take: 3,
  });

  await prisma.opcionHotelera.deleteMany({ where: { paqueteId: MODELO_ID } });
  const opcionDefs = [
    { nombre: "Económica", factor: 0.82, precioNoche: 110 },
    { nombre: "Recomendada", factor: 0.78, precioNoche: 165 },
    { nombre: "Premium", factor: 0.74, precioNoche: 240 },
  ];
  const ventas: number[] = [];
  for (let i = 0; i < Math.min(3, hoteles.length); i++) {
    const hotel = hoteles[i];
    const def = opcionDefs[i];
    // Cargar precio al hotel si no tiene
    if (hotel.precios.length === 0) {
      await prisma.precioAlojamiento.create({
        data: {
          alojamientoId: hotel.id,
          periodoDesde: "2026-01-01",
          periodoHasta: "2026-12-31",
          precioPorNoche: def.precioNoche,
        },
      });
    }
    // Venta = (netoFijos + netoAlojamiento) / factor — misma fórmula que utils.ts
    const netoAloj = def.precioNoche * noches;
    const precioVenta = Math.round((netoFijos + netoAloj) / def.factor);
    ventas.push(precioVenta);
    const opcion = await prisma.opcionHotelera.create({
      data: {
        paqueteId: MODELO_ID,
        nombre: def.nombre,
        factor: def.factor,
        precioVenta,
        orden: i,
        textoDisplay: `${hotel.nombre} · All Inclusive`,
      },
    });
    await prisma.opcionHotel.create({
      data: {
        opcionHoteleraId: opcion.id,
        destinoId: destino.id,
        alojamientoId: hotel.id,
        orden: 0,
      },
    });
    console.log(`  ✓ Opción "${def.nombre}" → ${hotel.nombre} · venta USD ${precioVenta}`);
  }

  // precioDesde del paquete = la opción más barata
  if (ventas.length > 0) {
    const precioDesde = Math.min(...ventas);
    await prisma.paquete.update({
      where: { id: MODELO_ID },
      data: { precioDesde, netoCalculado: netoFijos, precioVenta: precioDesde },
    });
    console.log(`  ✓ precioDesde recalculado: USD ${precioDesde}`);
  }

  return MODELO_ID;
}

async function ensureAereo(): Promise<string | null> {
  const existing = await prisma.aereo.findFirst({
    where: { brandId: BRAND, ruta: { contains: "PUJ" }, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const id = await generateSequentialId(prisma, "aereo");
  await prisma.aereo.create({
    data: {
      id,
      brandId: BRAND,
      ruta: "MVD - PUJ - MVD",
      destino: "Punta Cana",
      aerolinea: "Copa Airlines",
      equipaje: "Equipaje de mano + Equipaje en bodega",
      escalas: 1,
      itinerario: "MVD → PTY → PUJ (ida) · PUJ → PTY → MVD (vuelta)",
      precios: {
        create: {
          periodoDesde: "2026-01-01",
          periodoHasta: "2026-12-31",
          precioAdulto: 780,
        },
      },
    },
  });
  return id;
}

async function ensureTraslado(): Promise<string | null> {
  const existing = await prisma.traslado.findFirst({
    where: { brandId: BRAND, nombre: { contains: "Punta Cana" }, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const id = await generateSequentialId(prisma, "traslado");
  await prisma.traslado.create({
    data: {
      id,
      brandId: BRAND,
      nombre: "Traslado aeropuerto Punta Cana - hotel",
      tipo: "REGULAR",
      precio: 30,
    },
  });
  return id;
}

async function ensureSeguro(): Promise<string | null> {
  const existing = await prisma.seguro.findFirst({
    where: { brandId: BRAND, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const id = await generateSequentialId(prisma, "seguro");
  await prisma.seguro.create({
    data: {
      id,
      brandId: BRAND,
      plan: "Asistencia al viajero - Caribe",
      cobertura: "USD 40.000",
      costoPorDia: 3,
    },
  });
  return id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`▸ seed-modelo — ${SKIP_IMAGES ? "SIN imágenes" : "con imágenes al bucket"}`);
  console.log();

  await seedRegionHeroes();
  console.log();

  const paqueteModeloId = await seedPaqueteModelo();
  console.log();

  await seedTestimonios(paqueteModeloId);
  console.log();

  console.log("✓ seed-modelo completado.");
  if (paqueteModeloId) {
    console.log(`  Paquete modelo publicado: /destinos/caribe/punta-cana-premium-all-inclusive`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
