/**
 * One-shot price recomputation across every paquete in the brand.
 *
 * From now on, mutating a precio (Aereo/Alojamiento/Circuito) or a service
 * field that affects pricing (Traslado.precio, Seguro.costoPorDia) triggers
 * the recompute hook in src/lib/recompute-prices.ts. This script exists to
 * heal the snapshot — every paquete created or last edited BEFORE the hook
 * landed may have stale `OpcionHotelera.precioVenta`, `Paquete.precioVenta`,
 * `Paquete.netoCalculado`, or `Paquete.precioDesde`.
 *
 * Usage:
 *   tsx scripts/recompute-all-prices.ts             # dry-run (default, no writes)
 *   tsx scripts/recompute-all-prices.ts --apply     # actually persists changes
 *   tsx scripts/recompute-all-prices.ts --brand brand-1 --apply
 *   tsx scripts/recompute-all-prices.ts --verbose   # show every drift row
 *
 * Idempotent. Safe to re-run.
 */

import { prisma } from "@/lib/db";
import { recomputePaqueteOpciones } from "@/lib/recompute-prices";

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const brandArgIdx = process.argv.indexOf("--brand");
const BRAND_ID = brandArgIdx >= 0 ? process.argv[brandArgIdx + 1] : undefined;

interface DriftRow {
  id: string;
  titulo: string;
  beforePrecioDesde: number | null;
  afterPrecioDesde: number;
  opcionesUpdated: number;
}

async function main() {
  console.log(`▸ Mode: ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
  if (BRAND_ID) console.log(`▸ Brand: ${BRAND_ID}`);
  console.log();

  const paquetes = await prisma.paquete.findMany({
    where: {
      deletedAt: null,
      ...(BRAND_ID ? { brandId: BRAND_ID } : {}),
    },
    select: { id: true, titulo: true },
    orderBy: { id: "asc" },
  });

  console.log(`▸ Paquetes a evaluar: ${paquetes.length}`);
  console.log();

  let drift = 0;
  let inSync = 0;
  let noOpciones = 0;
  let errors = 0;
  const driftRows: DriftRow[] = [];

  // First pass: ALWAYS dry-run to collect drift. If --apply, then a second
  // pass actually persists. This is safer than wiring "apply" into the helper
  // call and risking a partial write if something fails mid-way.
  for (const p of paquetes) {
    try {
      const result = await recomputePaqueteOpciones(p.id, undefined, { dryRun: true });

      if (result.opciones === 0) {
        noOpciones++;
        continue;
      }

      if (result.updated) {
        drift++;
        driftRows.push({
          id: p.id,
          titulo: p.titulo,
          beforePrecioDesde: result.changes?.paquete?.precioDesde.before ?? null,
          afterPrecioDesde: result.precioDesde ?? 0,
          opcionesUpdated: result.changes?.opciones.length ?? 0,
        });
      } else {
        inSync++;
      }
    } catch (err) {
      errors++;
      console.error(`  ${p.id} — ERROR:`, err);
    }
  }

  // Print sample/all drift rows.
  if (driftRows.length > 0) {
    console.log("─── Paquetes con drift ─────────────────────────");
    const show = VERBOSE ? driftRows : driftRows.slice(0, 20);
    for (const r of show) {
      const before = r.beforePrecioDesde !== null ? `${r.beforePrecioDesde}` : "(null)";
      console.log(
        `  ${r.id.padEnd(14)} ${r.titulo.slice(0, 40).padEnd(40)} ` +
        `precioDesde ${before.padStart(7)} → ${String(r.afterPrecioDesde).padStart(6)}  ` +
        `(${r.opcionesUpdated} opcion${r.opcionesUpdated === 1 ? "" : "es"})`
      );
    }
    if (!VERBOSE && driftRows.length > 20) {
      console.log(`  … +${driftRows.length - 20} más (usar --verbose para ver todos)`);
    }
    console.log();
  }

  console.log("─── Resumen ───────────────────────────────────");
  console.log(`En sync (sin cambio):   ${inSync}`);
  console.log(`Con drift:              ${drift}`);
  console.log(`Sin opciones (skip):    ${noOpciones}`);
  console.log(`Errores:                ${errors}`);
  console.log(`Total:                  ${paquetes.length}`);

  if (!APPLY) {
    console.log();
    console.log(`▸ DRY-RUN: ${drift} paquetes se actualizarían con --apply.`);
    return;
  }

  if (drift === 0) {
    console.log();
    console.log("✓ Nada que aplicar — todos los paquetes están en sync.");
    return;
  }

  console.log();
  console.log(`▸ APPLY: persistiendo cambios en ${drift} paquetes…`);

  let applied = 0;
  let applyErrors = 0;
  for (const r of driftRows) {
    try {
      await recomputePaqueteOpciones(r.id);
      applied++;
    } catch (err) {
      applyErrors++;
      console.error(`  ${r.id} — APPLY ERROR:`, err);
    }
  }

  console.log();
  console.log(`✓ Aplicado a ${applied} paquetes.`);
  if (applyErrors > 0) console.log(`✗ ${applyErrors} fallos al aplicar (ver logs arriba).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
