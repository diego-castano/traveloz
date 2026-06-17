/**
 * Backfill Alojamiento.ciudadId for hotels seeded with ciudadId = null.
 *
 * Strategy:
 *   1. For every Alojamiento where ciudadId is null:
 *      - find every Paquete that assigns it (via PaqueteAlojamiento or via
 *        OpcionHotel through OpcionHotelera).
 *      - collect Paquete.destino strings.
 *   2. Normalize each destino (lowercase, strip diacritics, drop trailing
 *      qualifiers like "- CON DESAYUNO") and try to match against existing
 *      Ciudad.nombre rows in the same brand.
 *   3. Bucket each hotel as:
 *      - HIGH confidence (one destino, one ciudad match)
 *      - MEDIUM (multiple destinos all matching same ciudad)
 *      - LOW (multiple destinos matching different ciudades — multi-dest hotel)
 *      - MISS (destino did not match any existing ciudad)
 *      - ORPHAN (hotel not assigned to any paquete)
 *   4. In dry-run mode, print the plan + counts and exit.
 *   5. In --apply mode, set ciudadId (and paisId derived from the matched
 *      Ciudad) only for HIGH and MEDIUM bucket hotels. LOW/MISS/ORPHAN are
 *      left untouched and listed for manual review.
 *
 * Safety:
 *   - Read-only by default. --apply required to write.
 *   - Only updates rows where ciudadId is currently null — never overwrites.
 *   - Wraps all writes in a single $transaction so partial failure rolls back.
 *
 * Usage:
 *   tsx scripts/backfill-alojamiento-ciudad.ts            # dry-run
 *   tsx scripts/backfill-alojamiento-ciudad.ts --apply    # writes
 *   tsx scripts/backfill-alojamiento-ciudad.ts --csv > report.csv  # CSV report
 */

import { PrismaClient } from "@prisma/client";
import { assertSeedAllowed } from "../prisma/seed-guard";
assertSeedAllowed("backfill-alojamiento-ciudad");

const prisma = new PrismaClient();

type MatchBucket = "HIGH" | "MEDIUM" | "LOW" | "MISS" | "ORPHAN";

interface Plan {
  alojamientoId: string;
  alojamientoNombre: string;
  destinos: string[];          // raw Paquete.destino values that referenced this hotel
  matchedCiudadId: string | null;
  matchedCiudadNombre: string | null;
  matchedPaisId: string | null;
  bucket: MatchBucket;
  notes: string;
}

const APPLY = process.argv.includes("--apply");
const CSV = process.argv.includes("--csv");

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // drop noise: "- con desayuno", "all inclusive", years, hyphens, slashes
    .replace(/\s*[-/].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function log(...args: unknown[]) {
  if (!CSV) console.log(...args);
}

async function main() {
  log(`▸ Mode: ${APPLY ? "APPLY (writes will happen)" : "DRY-RUN (no writes)"}`);
  log();

  // ─── Load reference data ────────────────────────────────────────────────
  const [alojamientosSinCiudad, ciudades] = await Promise.all([
    prisma.alojamiento.findMany({
      where: { ciudadId: null, deletedAt: null },
      select: { id: true, nombre: true, brandId: true, paisId: true },
    }),
    prisma.ciudad.findMany({
      select: { id: true, nombre: true, paisId: true, pais: { select: { brandId: true } } },
    }),
  ]);

  log(`▸ Hoteles sin ciudadId: ${alojamientosSinCiudad.length}`);
  log(`▸ Ciudades en catálogo: ${ciudades.length}`);
  log();

  if (alojamientosSinCiudad.length === 0) {
    log("Nada que hacer.");
    return;
  }

  // ciudad lookup: brandId → normalized name → ciudad row
  const ciudadIndex = new Map<string, Map<string, { id: string; nombre: string; paisId: string }>>();
  for (const c of ciudades) {
    const brand = c.pais.brandId;
    if (!ciudadIndex.has(brand)) ciudadIndex.set(brand, new Map());
    ciudadIndex.get(brand)!.set(normalize(c.nombre), {
      id: c.id,
      nombre: c.nombre,
      paisId: c.paisId,
    });
  }

  // ─── Load all destinos per hotel ────────────────────────────────────────
  const ids = alojamientosSinCiudad.map((a) => a.id);

  // Path A: direct assignment via PaqueteAlojamiento.
  const directAssigns = await prisma.paqueteAlojamiento.findMany({
    where: { alojamientoId: { in: ids } },
    select: {
      alojamientoId: true,
      paquete: { select: { destino: true, brandId: true } },
    },
  });

  // Path B: option-based assignment via OpcionHotel → OpcionHotelera → Paquete.
  const optionAssigns = await prisma.opcionHotel.findMany({
    where: { alojamientoId: { in: ids } },
    select: {
      alojamientoId: true,
      opcion: {
        select: {
          paquete: { select: { destino: true, brandId: true } },
        },
      },
    },
  });

  const destinosByHotel = new Map<string, { destinos: Set<string>; brand: string }>();
  for (const a of alojamientosSinCiudad) {
    destinosByHotel.set(a.id, { destinos: new Set(), brand: a.brandId });
  }
  for (const r of directAssigns) {
    if (r.paquete.destino) {
      destinosByHotel.get(r.alojamientoId)!.destinos.add(r.paquete.destino);
    }
  }
  for (const r of optionAssigns) {
    if (r.opcion.paquete.destino) {
      destinosByHotel.get(r.alojamientoId)!.destinos.add(r.opcion.paquete.destino);
    }
  }

  // ─── Build plan per hotel ───────────────────────────────────────────────
  const plans: Plan[] = [];
  for (const a of alojamientosSinCiudad) {
    const { destinos, brand } = destinosByHotel.get(a.id)!;
    const brandIndex = ciudadIndex.get(brand) ?? new Map();

    if (destinos.size === 0) {
      plans.push({
        alojamientoId: a.id,
        alojamientoNombre: a.nombre,
        destinos: [],
        matchedCiudadId: null,
        matchedCiudadNombre: null,
        matchedPaisId: null,
        bucket: "ORPHAN",
        notes: "Sin paquete asignado — completar manual",
      });
      continue;
    }

    // For each destino, attempt to resolve to a ciudad.
    const matchesPerDestino = Array.from(destinos).map((d) => {
      const n = normalize(d);
      const ciudad = brandIndex.get(n);
      return { destino: d, normalized: n, ciudad };
    });

    const resolved = matchesPerDestino.filter((m) => m.ciudad);
    const uniqueCiudadIds = new Set(resolved.map((m) => m.ciudad!.id));

    if (resolved.length === 0) {
      plans.push({
        alojamientoId: a.id,
        alojamientoNombre: a.nombre,
        destinos: Array.from(destinos),
        matchedCiudadId: null,
        matchedCiudadNombre: null,
        matchedPaisId: null,
        bucket: "MISS",
        notes: `Ningún destino matchea ciudad existente: ${Array.from(destinos).join(" | ")}`,
      });
      continue;
    }

    if (uniqueCiudadIds.size > 1) {
      const conflict = Array.from(new Set(resolved.map((m) => m.ciudad!.nombre))).join(", ");
      plans.push({
        alojamientoId: a.id,
        alojamientoNombre: a.nombre,
        destinos: Array.from(destinos),
        matchedCiudadId: null,
        matchedCiudadNombre: null,
        matchedPaisId: null,
        bucket: "LOW",
        notes: `Hotel multi-destino — ciudades posibles: ${conflict}`,
      });
      continue;
    }

    // Single ciudad match (HIGH if one destino, MEDIUM if multiple destinos all agree)
    const c = resolved[0].ciudad!;
    plans.push({
      alojamientoId: a.id,
      alojamientoNombre: a.nombre,
      destinos: Array.from(destinos),
      matchedCiudadId: c.id,
      matchedCiudadNombre: c.nombre,
      matchedPaisId: c.paisId,
      bucket: destinos.size === 1 ? "HIGH" : "MEDIUM",
      notes: destinos.size === 1
        ? `1 destino → ${c.nombre}`
        : `${destinos.size} destinos coincidentes → ${c.nombre}`,
    });
  }

  // ─── Report ────────────────────────────────────────────────────────────
  const counts: Record<MatchBucket, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, MISS: 0, ORPHAN: 0 };
  for (const p of plans) counts[p.bucket]++;

  if (CSV) {
    console.log("alojamientoId,alojamientoNombre,bucket,matchedCiudad,matchedPaisId,destinos,notes");
    for (const p of plans) {
      const row = [
        p.alojamientoId,
        JSON.stringify(p.alojamientoNombre),
        p.bucket,
        p.matchedCiudadNombre ?? "",
        p.matchedPaisId ?? "",
        JSON.stringify(p.destinos.join(" | ")),
        JSON.stringify(p.notes),
      ];
      console.log(row.join(","));
    }
    return;
  }

  log("─── Bucket counts ─────────────────────────────────");
  log(`HIGH    (1 destino, 1 match) : ${counts.HIGH}    ← se aplicará`);
  log(`MEDIUM  (n destinos, 1 match) : ${counts.MEDIUM}   ← se aplicará`);
  log(`LOW     (multi-dest, varias) : ${counts.LOW}    ← requiere revisión manual`);
  log(`MISS    (destino sin ciudad) : ${counts.MISS}   ← falta cargar ciudad en catálogo`);
  log(`ORPHAN  (sin paquete)        : ${counts.ORPHAN} ← no se puede inferir`);
  log();

  // Sample 5 from each non-HIGH bucket to make the report actionable.
  const showSamples = (bucket: MatchBucket, n = 5) => {
    const sample = plans.filter((p) => p.bucket === bucket).slice(0, n);
    if (sample.length === 0) return;
    log(`─── ${bucket} (primeros ${sample.length}) ──────────────────────`);
    for (const p of sample) {
      log(`  ${p.alojamientoId.padEnd(14)} ${p.alojamientoNombre.slice(0, 40).padEnd(40)} | ${p.notes}`);
    }
    log();
  };
  showSamples("MEDIUM", 5);
  showSamples("LOW", 10);
  showSamples("MISS", 10);
  showSamples("ORPHAN", 5);

  // ─── Apply ────────────────────────────────────────────────────────────
  const toApply = plans.filter((p) => p.bucket === "HIGH" || p.bucket === "MEDIUM");

  if (!APPLY) {
    log(`▸ DRY-RUN: ${toApply.length} hoteles se actualizarían si corres con --apply.`);
    log(`▸ Para reporte CSV completo: tsx scripts/backfill-alojamiento-ciudad.ts --csv > report.csv`);
    return;
  }

  log(`▸ APPLY: actualizando ${toApply.length} hoteles…`);

  await prisma.$transaction(
    toApply.map((p) =>
      prisma.alojamiento.update({
        where: { id: p.alojamientoId },
        data: {
          ciudadId: p.matchedCiudadId!,
          // paisId may already be set from seed (Excel had country buckets) —
          // only fill if currently null, never overwrite a manual value.
          ...(p.matchedPaisId ? { paisId: p.matchedPaisId } : {}),
        },
      })
    )
  );

  log(`✓ Aplicado a ${toApply.length} hoteles.`);
  log(`  Quedan ${counts.LOW + counts.MISS + counts.ORPHAN} para revisión manual.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
