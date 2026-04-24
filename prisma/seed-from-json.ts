/**
 * seed-from-json.ts — DESTRUCTIVE seed loader for Destínico real data.
 *
 * Wipes the entire DB except for the `User` table and re-seeds with data
 * from `seed_data_inicial/seed_data.json`.
 *
 * Run with:  npm run seed:real -- --confirm
 *
 * Safety: requires the `--confirm` CLI flag and aborts if the User count
 * changes during the wipe.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateSequentialId, type IdEntity } from '../src/lib/sequential-id';

const prisma = new PrismaClient();

async function nextId(entity: IdEntity) {
  return generateSequentialId(prisma, entity);
}

// ---------------------------------------------------------------------------
// JSON shape
// ---------------------------------------------------------------------------

interface SeedJson {
  _meta: { brand: string };
  proveedores: Array<{
    nombre: string;
    condiciones?: string[];
    ejecutivo?: string;
    email?: string;
    whatsapp?: string;
  }>;
  traslados: Array<{
    aeropuerto: string;
    destino: string;
    precio_1pax: number | null;
    precio_2pax: number | null;
    operador: string | null;
  }>;
  hoteles_catalogo: Array<{
    nombre: string;
    cantidad_paquetes: number;
    proveedores: string[];
  }>;
  paquetes: Array<{
    nombre: string;
    campana: string | null;
    servicios: Array<{
      tipo: string;
      neto: number | null;
      observaciones: string | null;
    }>;
    opciones_hoteleras: Array<{
      hotel: string;
      neto_hotel: number | null;
      neto_total: number | null;
      precio_venta: number | null;
      proveedor: string | null;
    }>;
    itinerario: string[] | null;
    notas: string | null;
    web_id: string | null;
    ultima_actualizacion: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND_ID = 'brand-1';
const VALIDEZ_DESDE = '2026-01-01';
const VALIDEZ_HASTA = '2026-12-31';
const DEFAULT_FACTOR = 0.9;
const NOCHES_FALLBACK_DIVISOR = 7; // for per-night cost calc when noches=0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function colorFromName(name: string): string {
  // Deterministic color from name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const palette = [
    '#3BBFAD',
    '#CC2030',
    '#7C3AED',
    '#F59E0B',
    '#10B981',
    '#EC4899',
    '#3B82F6',
    '#F97316',
    '#84CC16',
    '#06B6D4',
  ];
  return palette[Math.abs(hash) % palette.length];
}

function parseNochesFromNotas(notas: string | null): number {
  if (!notas) return 0;
  const m = notas.match(/(\d+)\s*noches?/i);
  return m ? parseInt(m[1], 10) : 0;
}

function deriveDestino(nombre: string): string {
  // Heuristic: take the first word(s) before "|" or numbers
  const cleaned = nombre.split('|')[0].trim();
  return cleaned.length > 0 ? cleaned : nombre;
}

type ServicioBucket = 'aereo' | 'traslado' | 'seguro' | 'circuito' | 'otro';

function bucketServicio(tipo: string | null | undefined): ServicioBucket {
  if (!tipo) return 'otro';
  const u = tipo.toUpperCase();
  if (u.includes('AEREO') || u.includes('AÉREO') || u.includes('VUELO') || u.includes('TREN'))
    return 'aereo';
  if (u.includes('TRASLADO')) return 'traslado';
  if (u.includes('SEGURO')) return 'seguro';
  if (u.includes('CIRCUITO')) return 'circuito';
  return 'traslado'; // ENTRADAS, OTROS — bucket as traslado with display text
}

const KNOWN_PROVEEDORES: Record<string, string> = {
  siur: 'Siur',
  planet: 'Planet',
  freeway: 'Freeway',
  abtour: 'Abtour',
  liberty: 'Liberty',
  sendas: 'Sendas',
  sevens: 'Sevens',
  mtur: 'Mtur',
  funtour: 'Funtour',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // ── Safety: require --confirm flag ────────────────────────────────────────
  if (!process.argv.includes('--confirm')) {
    console.error(
      '\n❌ ABORT — destructive operation requires --confirm flag.\n' +
        '   Run: npm run seed:real -- --confirm\n',
    );
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DESTÍNICO SEED — DESTRUCTIVE LOAD FROM seed_data.json');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Load JSON ─────────────────────────────────────────────────────────────
  const jsonPath = resolve(__dirname, '../seed_data_inicial/seed_data.json');
  const raw = readFileSync(jsonPath, 'utf-8');
  const data: SeedJson = JSON.parse(raw);
  console.log(
    `📄 Loaded ${data.paquetes.length} paquetes, ${data.hoteles_catalogo.length} hoteles, ` +
      `${data.traslados.length} traslados, ${data.proveedores.length} proveedores\n`,
  );

  // ── Snapshot User count (red line) ────────────────────────────────────────
  const preUsers = await prisma.user.count();
  console.log(`🛡  Users en DB ANTES del wipe: ${preUsers}`);

  // ── WIPE everything except User & _prisma_migrations ──────────────────────
  console.log('\n🗑  Wiping DB (preserving User)...');
  await prisma.$transaction([
    prisma.notificacion.deleteMany(),
    prisma.paqueteEtiqueta.deleteMany(),
    prisma.paqueteFoto.deleteMany(),
    prisma.paqueteAereo.deleteMany(),
    prisma.paqueteAlojamiento.deleteMany(),
    prisma.paqueteTraslado.deleteMany(),
    prisma.paqueteSeguro.deleteMany(),
    prisma.paqueteCircuito.deleteMany(),
    prisma.opcionHotelera.deleteMany(),
    prisma.precioAereo.deleteMany(),
    prisma.precioAlojamiento.deleteMany(),
    prisma.precioCircuito.deleteMany(),
    prisma.circuitoDia.deleteMany(),
    prisma.alojamientoFoto.deleteMany(),
    prisma.paquete.deleteMany(),
    prisma.alojamiento.deleteMany(),
    prisma.aereo.deleteMany(),
    prisma.traslado.deleteMany(),
    prisma.seguro.deleteMany(),
    prisma.circuito.deleteMany(),
    prisma.etiqueta.deleteMany(),
    prisma.temporada.deleteMany(),
    prisma.tipoPaquete.deleteMany(),
    prisma.regimen.deleteMany(),
    prisma.proveedor.deleteMany(),
    prisma.ciudad.deleteMany(),
    prisma.pais.deleteMany(),
  ]);

  const postWipeUsers = await prisma.user.count();
  if (postWipeUsers !== preUsers) {
    throw new Error(
      `[ABORT] User count changed during wipe: ${preUsers} → ${postWipeUsers}. Aborting.`,
    );
  }
  console.log(`✓ Wipe complete. Users intactos: ${postWipeUsers}\n`);

  // ── 1. Proveedores (HOTELES) ──────────────────────────────────────────────
  console.log('🏢 Inserting proveedores hoteleros...');
  const proveedorByName = new Map<string, string>();
  for (const p of data.proveedores) {
    const created = await prisma.proveedor.create({
      data: {
        brandId: BRAND_ID,
        nombre: p.nombre,
        servicio: 'HOTELES',
        ejecutivo: p.ejecutivo ?? null,
        email: p.email ?? null,
        whatsapp: p.whatsapp ?? null,
        notas: p.condiciones?.length ? p.condiciones.join(' | ') : null,
      },
    });
    proveedorByName.set(normalizeName(p.nombre), created.id);
  }
  console.log(`   ✓ ${data.proveedores.length} proveedores creados`);

  function fuzzyMatchProveedor(raw: string | null): string | null {
    if (!raw) return null;
    const clean = raw.toLowerCase().replace(/[^a-z]/g, '');
    for (const [key, name] of Object.entries(KNOWN_PROVEEDORES)) {
      if (clean.includes(key)) return proveedorByName.get(normalizeName(name)) ?? null;
    }
    return null;
  }

  // ── 2. Traslados ──────────────────────────────────────────────────────────
  console.log('🚐 Inserting traslados del catálogo...');
  let trasladosCreados = 0;
  for (const t of data.traslados) {
    const precio = t.precio_2pax ?? t.precio_1pax ?? 0;
    const operadorId = t.operador ? fuzzyMatchProveedor(t.operador) : null;
    await prisma.traslado.create({
      data: {
        id: await nextId('traslado'),
        brandId: BRAND_ID,
        nombre: `${t.aeropuerto} → ${t.destino}`,
        tipo: 'REGULAR',
        precio,
        proveedorId: operadorId,
      },
    });
    trasladosCreados++;
  }
  console.log(`   ✓ ${trasladosCreados} traslados creados`);

  // ── 3. Alojamientos del catálogo ──────────────────────────────────────────
  console.log('🏨 Inserting alojamientos del catálogo...');
  const alojamientoByName = new Map<string, string>();
  for (const h of data.hoteles_catalogo) {
    const key = normalizeName(h.nombre);
    if (alojamientoByName.has(key)) continue; // dedupe
    const created = await prisma.alojamiento.create({
      data: {
        id: await nextId('alojamiento'),
        brandId: BRAND_ID,
        nombre: h.nombre,
        // ciudadId, paisId, categoria stay null — admin will fill in later
      },
    });
    alojamientoByName.set(key, created.id);
  }
  console.log(`   ✓ ${alojamientoByName.size} alojamientos únicos creados`);

  // ── 4. Etiquetas (campañas) ───────────────────────────────────────────────
  console.log('🏷  Inserting etiquetas (campañas)...');
  const etiquetaByCampana = new Map<string, string>();
  const uniqueCampanas = Array.from(
    new Set(data.paquetes.map((p) => p.campana).filter((c): c is string => !!c)),
  );
  for (const campana of uniqueCampanas) {
    const slug = slugify(campana);
    const created = await prisma.etiqueta.create({
      data: {
        brandId: BRAND_ID,
        nombre: campana,
        slug,
        color: colorFromName(campana),
      },
    });
    etiquetaByCampana.set(campana, created.id);
  }
  console.log(`   ✓ ${uniqueCampanas.length} etiquetas creadas`);

  // ── 5. Paquetes + servicios + opciones ────────────────────────────────────
  console.log('\n📦 Inserting paquetes (this is the big one)...');
  let pkgIdx = 0;
  let totalAereosSynth = 0;
  let totalTrasladosSynth = 0;
  let totalSegurosSynth = 0;
  let totalCircuitosSynth = 0;
  let totalOpciones = 0;
  let totalPrecios = 0;
  let opcionesSinHotel = 0;
  let paqueteAlojCreados = 0;

  for (const p of data.paquetes) {
    pkgIdx++;
    const noches = parseNochesFromNotas(p.notas);
    const nochesDivisor = noches > 0 ? noches : NOCHES_FALLBACK_DIVISOR;

    // -- Create Paquete --
    const paquete = await prisma.paquete.create({
      data: {
        id: await nextId('paquete'),
        brandId: BRAND_ID,
        titulo: p.nombre,
        destino: deriveDestino(p.nombre),
        descripcion: p.notas ?? null,
        webId: p.web_id ?? null,
        itinerarioAmadeus: p.itinerario?.join('\n') ?? null,
        campana: p.campana ?? null,
        estado: 'ACTIVO',
        noches: noches > 0 ? noches : 0,
        validezDesde: VALIDEZ_DESDE,
        validezHasta: VALIDEZ_HASTA,
        markup: DEFAULT_FACTOR,
        precioVenta: 0,
        netoCalculado: 0,
      },
    });

    // -- Link Etiqueta de campaña --
    if (p.campana && etiquetaByCampana.has(p.campana)) {
      await prisma.paqueteEtiqueta.create({
        data: {
          paqueteId: paquete.id,
          etiquetaId: etiquetaByCampana.get(p.campana)!,
        },
      });
    }

    // -- Create services as synthetic entities --
    let aereoOrden = 0;
    let trasladoOrden = 0;
    let seguroOrden = 0;
    let circuitoOrden = 0;
    for (const s of p.servicios ?? []) {
      const bucket = bucketServicio(s.tipo);
      const neto = s.neto ?? 0;
      if (neto <= 0) continue;
      const display = s.observaciones ? `${s.tipo} · ${s.observaciones}` : s.tipo;

      switch (bucket) {
        case 'aereo': {
          const aereo = await prisma.aereo.create({
            data: {
              id: await nextId('aereo'),
              brandId: BRAND_ID,
              ruta: `MVD → ${deriveDestino(p.nombre)}`,
              destino: deriveDestino(p.nombre),
              aerolinea: s.observaciones ?? null,
            },
          });
          await prisma.precioAereo.create({
            data: {
              aereoId: aereo.id,
              periodoDesde: VALIDEZ_DESDE,
              periodoHasta: VALIDEZ_HASTA,
              precioAdulto: neto,
            },
          });
          await prisma.paqueteAereo.create({
            data: {
              paqueteId: paquete.id,
              aereoId: aereo.id,
              textoDisplay: display,
              orden: aereoOrden++,
            },
          });
          totalAereosSynth++;
          break;
        }
        case 'traslado': {
          const traslado = await prisma.traslado.create({
            data: {
              id: await nextId('traslado'),
              brandId: BRAND_ID,
              nombre: display,
              tipo: 'REGULAR',
              precio: neto,
            },
          });
          await prisma.paqueteTraslado.create({
            data: {
              paqueteId: paquete.id,
              trasladoId: traslado.id,
              textoDisplay: display,
              orden: trasladoOrden++,
            },
          });
          totalTrasladosSynth++;
          break;
        }
        case 'seguro': {
          const seguro = await prisma.seguro.create({
            data: {
              id: await nextId('seguro'),
              brandId: BRAND_ID,
              plan: display,
              cobertura: s.observaciones ?? null,
              costoPorDia: neto / nochesDivisor,
            },
          });
          await prisma.paqueteSeguro.create({
            data: {
              paqueteId: paquete.id,
              seguroId: seguro.id,
              diasCobertura: noches > 0 ? noches : null,
              textoDisplay: display,
              orden: seguroOrden++,
            },
          });
          totalSegurosSynth++;
          break;
        }
        case 'circuito': {
          const circuito = await prisma.circuito.create({
            data: {
              id: await nextId('circuito'),
              brandId: BRAND_ID,
              nombre: display,
              noches: noches > 0 ? noches : 1,
            },
          });
          await prisma.precioCircuito.create({
            data: {
              circuitoId: circuito.id,
              periodoDesde: VALIDEZ_DESDE,
              periodoHasta: VALIDEZ_HASTA,
              precio: neto,
            },
          });
          await prisma.paqueteCircuito.create({
            data: {
              paqueteId: paquete.id,
              circuitoId: circuito.id,
              textoDisplay: display,
              orden: circuitoOrden++,
            },
          });
          totalCircuitosSynth++;
          break;
        }
      }
    }

    // -- Create opciones hoteleras with their hotels (pool + opciones) --
    const paqueteAlojIds = new Map<string, string>(); // alojId → paqueteAlojId
    let opcionIdx = 0;

    for (const opcion of p.opciones_hoteleras ?? []) {
      const hotelKey = normalizeName(opcion.hotel || '');
      const alojId = alojamientoByName.get(hotelKey);
      if (!alojId) {
        opcionesSinHotel++;
        continue;
      }

      // Ensure PaqueteAlojamiento (pool) row exists
      let paqueteAlojId = paqueteAlojIds.get(alojId);
      if (!paqueteAlojId) {
        const pa = await prisma.paqueteAlojamiento.create({
          data: {
            paqueteId: paquete.id,
            alojamientoId: alojId,
            orden: paqueteAlojIds.size,
          },
        });
        paqueteAlojId = pa.id;
        paqueteAlojIds.set(alojId, paqueteAlojId);
        paqueteAlojCreados++;
      }

      // Create PrecioAlojamiento (per-night cost derived from neto_hotel)
      const netoHotel = opcion.neto_hotel ?? 0;
      if (netoHotel > 0) {
        await prisma.precioAlojamiento.create({
          data: {
            alojamientoId: alojId,
            periodoDesde: VALIDEZ_DESDE,
            periodoHasta: VALIDEZ_HASTA,
            precioPorNoche: netoHotel / nochesDivisor,
          },
        });
        totalPrecios++;
      }

      // Compute factor and clamp
      const netoTotal = opcion.neto_total ?? 0;
      const precioVenta = (opcion.precio_venta ?? 0) > 0
        ? opcion.precio_venta!
        : netoTotal / DEFAULT_FACTOR;
      const rawFactor = precioVenta > 0 && netoTotal > 0 ? netoTotal / precioVenta : DEFAULT_FACTOR;
      const factor = Math.min(1, Math.max(0.01, rawFactor));

      await prisma.opcionHotelera.create({
        data: {
          paqueteId: paquete.id,
          nombre: `Opción ${opcionIdx + 1} · ${opcion.hotel}`,
          factor,
          precioVenta,
          orden: opcionIdx,
          proveedorId: fuzzyMatchProveedor(opcion.proveedor),
        },
      });
      totalOpciones++;
      opcionIdx++;
    }

    if (pkgIdx % 25 === 0) {
      console.log(`   ... ${pkgIdx}/${data.paquetes.length} paquetes procesados`);
    }
  }
  console.log(`   ✓ ${pkgIdx} paquetes creados`);
  console.log(`   ✓ ${totalAereosSynth} aereos sintéticos`);
  console.log(`   ✓ ${totalTrasladosSynth} traslados sintéticos`);
  console.log(`   ✓ ${totalSegurosSynth} seguros sintéticos`);
  console.log(`   ✓ ${totalCircuitosSynth} circuitos sintéticos`);
  console.log(`   ✓ ${paqueteAlojCreados} hoteles asignados a paquetes (PaqueteAlojamiento)`);
  console.log(`   ✓ ${totalOpciones} opciones hoteleras`);
  console.log(`   ✓ ${totalPrecios} precios de alojamiento`);
  if (opcionesSinHotel > 0) {
    console.log(`   ⚠ ${opcionesSinHotel} opciones omitidas (hotel no encontrado en catálogo)`);
  }

  // ── Final safety check ─────────────────────────────────────────────────────
  const finalUsers = await prisma.user.count();
  if (finalUsers !== preUsers) {
    throw new Error(
      `[ABORT] User count changed at end: ${preUsers} → ${finalUsers}.`,
    );
  }
  console.log(`\n🛡  Users intactos al final: ${finalUsers}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ SEED COMPLETO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
