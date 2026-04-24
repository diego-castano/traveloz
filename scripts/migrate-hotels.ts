/**
 * migrate-hotels.ts — fuzzy-matches the 260 pre-import hotels to the 1020
 * new hotels imported from the client's Sheets, remaps PaqueteAlojamiento
 * and OpcionHotel references, and wipes the old ones.
 *
 * Design:
 *   - Discriminator: Alojamiento.createdAt < CUTOFF = OLD, else NEW.
 *   - Scoring: Levenshtein ratio on normalized names (accent-stripped,
 *     lowercase, non-alphanumeric chars collapsed to single space).
 *   - Match preference: same ciudad first (boosted +5), then any ciudad.
 *   - Buckets: auto (>=90), review (70-89), orphan (<70).
 *
 * Modes:
 *   (no flag)            dry-run. Writes `/tmp/hotel-remap-review.csv` and
 *                        `/tmp/hotel-remap-orphans.csv` for the user to inspect.
 *   --review-file=<p>    Overrides the review bucket with user decisions from
 *                        a CSV (columns: viejoId, accion, nuevoId).
 *                        Actions: `map` (needs nuevoId), `orphan`, `keep_empty`.
 *   --confirm            Executes the migration: creates backup JSON, applies
 *                        FK remaps in a single transaction, drops orphan refs,
 *                        deletes old Alojamiento rows.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();
const CUTOFF = new Date('2026-04-24T13:00:00Z');
const AUTO_THRESHOLD = 90;
const REVIEW_THRESHOLD = 70;
const SAME_CITY_BONUS = 5;

// ---------------------------------------------------------------------------
// Normalisation + Levenshtein
// ---------------------------------------------------------------------------

// Common hospitality words that add noise to hotel-name matching. Removing them
// lets "Hotel Capilla del Mar" match "Capilla del Mar" at a useful score.
const STOP_WORDS = new Set([
  'hotel',
  'hoteles',
  'hostal',
  'hosteria',
  'posada',
  'pousada',
  'resort',
  'suites',
  'suite',
  'inn',
  'spa',
  'boutique',
  'apart',
  'lodge',
  'beach',
  'club',
  'by',
  'the',
  'all',
  'inclusive',
  'casino',
  'palace',
  'plaza',
  'grand',
]);

function normalize(s: string): string {
  const cleaned = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip stop-words but keep a fallback: if stripping empties the string, keep original
  const stripped = cleaned
    .split(' ')
    .filter((w) => !STOP_WORDS.has(w))
    .join(' ')
    .trim();
  return stripped || cleaned;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // delete
        curr[j - 1] + 1,  // insert
        prev[j - 1] + cost // substitute
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const dist = levenshtein(a, b);
  return Math.round((1 - dist / maxLen) * 100);
}

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface OldHotel {
  id: string;
  nombre: string;
  ciudadId: string | null;
  ciudadNombre: string | null;
  paquetes: number;
  opciones: number;
}

interface NewHotel {
  id: string;
  nombre: string;
  ciudadId: string;
  ciudadNombre: string;
}

interface MatchResult {
  old: OldHotel;
  bestMatch: NewHotel | null;
  score: number;
  sameCity: boolean;
  bucket: 'auto' | 'review' | 'orphan';
  topCandidates: Array<{ newId: string; newName: string; newCity: string; score: number }>;
}

// ---------------------------------------------------------------------------
// Load DB state
// ---------------------------------------------------------------------------

async function loadState(): Promise<{ old: OldHotel[]; new: NewHotel[] }> {
  const oldRows = await prisma.alojamiento.findMany({
    where: { createdAt: { lt: CUTOFF } },
    include: {
      ciudad: { select: { nombre: true } },
      _count: { select: { paquetes: true, opcionHoteles: true } },
    },
  });
  const old: OldHotel[] = oldRows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    ciudadId: r.ciudadId,
    ciudadNombre: r.ciudad?.nombre ?? null,
    paquetes: r._count.paquetes,
    opciones: r._count.opcionHoteles,
  }));

  const newRows = await prisma.alojamiento.findMany({
    where: { createdAt: { gte: CUTOFF } },
    include: { ciudad: { select: { nombre: true } } },
  });
  const neu: NewHotel[] = newRows
    .filter((r) => r.ciudadId && r.ciudad)
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      ciudadId: r.ciudadId!,
      ciudadNombre: r.ciudad!.nombre,
    }));

  return { old, new: neu };
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

function matchAll(olds: OldHotel[], news: NewHotel[]): MatchResult[] {
  // Precompute normalized new names
  const newNorm: Array<{ n: NewHotel; norm: string }> = news.map((n) => ({
    n,
    norm: normalize(n.nombre),
  }));
  // Group by ciudad for fast same-city lookup
  const byCity = new Map<string, Array<{ n: NewHotel; norm: string }>>();
  for (const entry of newNorm) {
    const arr = byCity.get(entry.n.ciudadId) ?? [];
    arr.push(entry);
    byCity.set(entry.n.ciudadId, arr);
  }

  const results: MatchResult[] = [];
  for (const o of olds) {
    const oNorm = normalize(o.nombre);
    const candidates: Array<{ newId: string; newName: string; newCity: string; score: number; sameCity: boolean }> = [];

    // Same-city candidates
    const sameCity = o.ciudadId ? byCity.get(o.ciudadId) ?? [] : [];
    for (const c of sameCity) {
      const raw = similarity(oNorm, c.norm);
      candidates.push({
        newId: c.n.id,
        newName: c.n.nombre,
        newCity: c.n.ciudadNombre,
        score: Math.min(100, raw + SAME_CITY_BONUS),
        sameCity: true,
      });
    }
    // Any-city as fallback (only if best same-city < AUTO_THRESHOLD or no same-city hotels)
    const bestSameCity = Math.max(0, ...candidates.map((c) => c.score));
    if (bestSameCity < AUTO_THRESHOLD) {
      for (const c of newNorm) {
        if (o.ciudadId && c.n.ciudadId === o.ciudadId) continue; // already scored
        const raw = similarity(oNorm, c.norm);
        if (raw < REVIEW_THRESHOLD - 10) continue; // prune way below
        candidates.push({
          newId: c.n.id,
          newName: c.n.nombre,
          newCity: c.n.ciudadNombre,
          score: raw,
          sameCity: false,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top3 = candidates.slice(0, 3).map((c) => ({
      newId: c.newId,
      newName: c.newName,
      newCity: c.newCity,
      score: c.score,
    }));

    const best = candidates[0] ?? null;
    const score = best?.score ?? 0;
    const bucket: MatchResult['bucket'] =
      score >= AUTO_THRESHOLD ? 'auto' : score >= REVIEW_THRESHOLD ? 'review' : 'orphan';
    const bestMatchObj = best
      ? news.find((n) => n.id === best.newId) ?? null
      : null;

    results.push({
      old: o,
      bestMatch: bestMatchObj,
      score,
      sameCity: best?.sameCity ?? false,
      bucket,
      topCandidates: top3,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Report + CSV outputs
// ---------------------------------------------------------------------------

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeReviewCSV(path: string, results: MatchResult[]): void {
  const header = 'viejoId,viejoNombre,viejoCiudad,paquetes,opciones,accion,nuevoId,nuevoNombre,nuevoCiudad,score,sameCity,top2_id,top2_nombre,top2_score,top3_id,top3_nombre,top3_score\n';
  const rows = results
    .filter((r) => r.bucket === 'review')
    .map((r) => {
      const [, c2, c3] = r.topCandidates;
      return [
        r.old.id,
        csvEscape(r.old.nombre),
        csvEscape(r.old.ciudadNombre ?? ''),
        r.old.paquetes,
        r.old.opciones,
        'map', // default action; user can change to 'orphan' or 'keep_empty'
        r.bestMatch?.id ?? '',
        csvEscape(r.bestMatch?.nombre ?? ''),
        csvEscape(r.bestMatch?.ciudadNombre ?? ''),
        r.score,
        r.sameCity ? 'yes' : 'no',
        c2?.newId ?? '',
        csvEscape(c2?.newName ?? ''),
        c2?.score ?? '',
        c3?.newId ?? '',
        csvEscape(c3?.newName ?? ''),
        c3?.score ?? '',
      ].join(',');
    });
  writeFileSync(path, header + rows.join('\n') + '\n');
}

function writeOrphansCSV(path: string, results: MatchResult[]): void {
  const header = 'viejoId,viejoNombre,viejoCiudad,paquetes,opciones,bestNuevoNombre,bestScore\n';
  const rows = results
    .filter((r) => r.bucket === 'orphan')
    .map((r) =>
      [
        r.old.id,
        csvEscape(r.old.nombre),
        csvEscape(r.old.ciudadNombre ?? ''),
        r.old.paquetes,
        r.old.opciones,
        csvEscape(r.bestMatch?.nombre ?? ''),
        r.score,
      ].join(','),
    );
  writeFileSync(path, header + rows.join('\n') + '\n');
}

function writeAutoCSV(path: string, results: MatchResult[]): void {
  const header = 'viejoId,viejoNombre,viejoCiudad,paquetes,opciones,nuevoId,nuevoNombre,nuevoCiudad,score,sameCity\n';
  const rows = results
    .filter((r) => r.bucket === 'auto' && r.bestMatch)
    .map((r) =>
      [
        r.old.id,
        csvEscape(r.old.nombre),
        csvEscape(r.old.ciudadNombre ?? ''),
        r.old.paquetes,
        r.old.opciones,
        r.bestMatch!.id,
        csvEscape(r.bestMatch!.nombre),
        csvEscape(r.bestMatch!.ciudadNombre),
        r.score,
        r.sameCity ? 'yes' : 'no',
      ].join(','),
    );
  writeFileSync(path, header + rows.join('\n') + '\n');
}

function printReport(results: MatchResult[]): void {
  const auto = results.filter((r) => r.bucket === 'auto');
  const review = results.filter((r) => r.bucket === 'review');
  const orphan = results.filter((r) => r.bucket === 'orphan');
  const totalRefsAuto = auto.reduce((s, r) => s + r.old.paquetes + r.old.opciones, 0);
  const totalRefsReview = review.reduce((s, r) => s + r.old.paquetes + r.old.opciones, 0);
  const totalRefsOrphan = orphan.reduce((s, r) => s + r.old.paquetes + r.old.opciones, 0);

  console.log('='.repeat(70));
  console.log('HOTEL REMAP — DRY RUN');
  console.log('='.repeat(70));
  console.log(`Old hotels to remap: ${results.length}`);
  console.log();
  console.log(`  auto   (score ≥ ${AUTO_THRESHOLD}):  ${auto.length} hotels — ${totalRefsAuto} refs`);
  console.log(`  review (${REVIEW_THRESHOLD}–${AUTO_THRESHOLD - 1}):      ${review.length} hotels — ${totalRefsReview} refs (needs manual review)`);
  console.log(`  orphan (< ${REVIEW_THRESHOLD}):        ${orphan.length} hotels — ${totalRefsOrphan} refs (references will be DELETED)`);
  console.log();
  console.log('Outputs:');
  console.log('  /tmp/hotel-remap-auto.csv      (auto-matches for reference)');
  console.log('  /tmp/hotel-remap-review.csv    (edit "accion" column: map / orphan / keep_empty)');
  console.log('  /tmp/hotel-remap-orphans.csv   (no match found, refs will be dropped)');
  console.log();
  if (orphan.length > 0) {
    console.log(`⚠️  ${orphan.length} orphans will cause ${totalRefsOrphan} references to be deleted.`);
    console.log('   Their paquetes may lose hotel options. Review the CSV before --confirm.');
  }
}

// ---------------------------------------------------------------------------
// Apply migration
// ---------------------------------------------------------------------------

interface Decision {
  oldId: string;
  action: 'map' | 'orphan' | 'keep_empty';
  newId: string | null;
}

function parseReviewCSV(path: string): Map<string, Decision> {
  const text = readFileSync(path, 'utf-8');
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return new Map();
  const header = lines[0].split(',').map((h) => h.trim());
  const idxOldId = header.indexOf('viejoId');
  const idxAccion = header.indexOf('accion');
  const idxNuevoId = header.indexOf('nuevoId');
  if (idxOldId < 0 || idxAccion < 0) throw new Error(`review CSV missing required columns: ${path}`);
  const out = new Map<string, Decision>();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const oldId = cells[idxOldId]?.trim();
    const action = cells[idxAccion]?.trim() as Decision['action'];
    const newId = cells[idxNuevoId]?.trim() || null;
    if (!oldId || !action) continue;
    out.set(oldId, { oldId, action, newId });
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(field); field = ''; }
      else field += c;
    }
  }
  out.push(field);
  return out;
}

async function apply(results: MatchResult[], reviewOverrides: Map<string, Decision>): Promise<void> {
  // Build final decision map
  const decisions = new Map<string, Decision>();
  for (const r of results) {
    const override = reviewOverrides.get(r.old.id);
    if (override) {
      decisions.set(r.old.id, override);
      continue;
    }
    if (r.bucket === 'auto' && r.bestMatch) {
      decisions.set(r.old.id, { oldId: r.old.id, action: 'map', newId: r.bestMatch.id });
    } else {
      // review & orphan default to dropping refs — user must pass --review-file
      // with explicit 'map' decisions to remap a review-bucket hotel.
      decisions.set(r.old.id, { oldId: r.old.id, action: 'orphan', newId: null });
    }
  }

  // Backup
  const backupPath = resolve(`seed_data_inicial/backup-hoteles-${Date.now()}.json`);
  console.log(`💾 Backing up old hotels + references to ${backupPath}…`);
  const oldIds = Array.from(decisions.keys());
  const oldHotels = await prisma.alojamiento.findMany({ where: { id: { in: oldIds } } });
  const paRows = await prisma.paqueteAlojamiento.findMany({ where: { alojamientoId: { in: oldIds } } });
  const ohRows = await prisma.opcionHotel.findMany({ where: { alojamientoId: { in: oldIds } } });
  writeFileSync(backupPath, JSON.stringify({ oldHotels, paqueteAlojamiento: paRows, opcionHotel: ohRows }, null, 2));
  console.log(`   ✓ backup written (${oldHotels.length} hotels, ${paRows.length} PA, ${ohRows.length} OH)`);

  console.log('🔄 Planning operations (in memory)…');
  // Load all PA and OH rows for existing alojamientos — both old (to remap) and
  // new (to detect conflicts when remapping old→new).
  const allPA = await prisma.paqueteAlojamiento.findMany();
  const allOH = await prisma.opcionHotel.findMany();
  // Index existing refs on their unique key for O(1) conflict lookup.
  const paByKey = new Map<string, string>();   // `${paqueteId}|${alojamientoId}` → paId
  for (const pa of allPA) paByKey.set(`${pa.paqueteId}|${pa.alojamientoId}`, pa.id);
  const ohByKey = new Map<string, string>();   // `${opcionHoteleraId}|${destinoId}` → ohId
  for (const oh of allOH) ohByKey.set(`${oh.opcionHoteleraId}|${oh.destinoId}`, oh.id);

  const paIdsToDelete: string[] = [];
  const ohIdsToDelete: string[] = [];
  const paIdsToRemap: Array<{ id: string; newAlojamientoId: string }> = [];
  const ohIdsToRemap: Array<{ id: string; newAlojamientoId: string }> = [];

  const paForOldId = new Map<string, typeof allPA>();
  for (const pa of allPA) {
    if (decisions.has(pa.alojamientoId)) {
      const arr = paForOldId.get(pa.alojamientoId) ?? [];
      arr.push(pa);
      paForOldId.set(pa.alojamientoId, arr);
    }
  }
  const ohForOldId = new Map<string, typeof allOH>();
  for (const oh of allOH) {
    if (decisions.has(oh.alojamientoId)) {
      const arr = ohForOldId.get(oh.alojamientoId) ?? [];
      arr.push(oh);
      ohForOldId.set(oh.alojamientoId, arr);
    }
  }

  for (const [oldId, decision] of Array.from(decisions.entries())) {
    const paList = paForOldId.get(oldId) ?? [];
    const ohList = ohForOldId.get(oldId) ?? [];

    if (decision.action === 'map' && decision.newId) {
      for (const pa of paList) {
        const conflictKey = `${pa.paqueteId}|${decision.newId}`;
        if (paByKey.has(conflictKey) && paByKey.get(conflictKey) !== pa.id) {
          paIdsToDelete.push(pa.id);
        } else {
          paIdsToRemap.push({ id: pa.id, newAlojamientoId: decision.newId });
          // After remap, the key points to this row
          paByKey.delete(`${pa.paqueteId}|${oldId}`);
          paByKey.set(conflictKey, pa.id);
        }
      }
      for (const oh of ohList) {
        const conflictKey = `${oh.opcionHoteleraId}|${oh.destinoId}`;
        const existing = ohByKey.get(conflictKey);
        if (existing && existing !== oh.id) {
          ohIdsToDelete.push(oh.id);
        } else {
          ohIdsToRemap.push({ id: oh.id, newAlojamientoId: decision.newId });
        }
      }
    } else {
      // orphan or keep_empty: delete all refs
      for (const pa of paList) paIdsToDelete.push(pa.id);
      for (const oh of ohList) ohIdsToDelete.push(oh.id);
    }
  }

  console.log(`   plan: remap ${paIdsToRemap.length} PA + ${ohIdsToRemap.length} OH; delete ${paIdsToDelete.length} PA + ${ohIdsToDelete.length} OH + ${decisions.size} viejos`);

  console.log('🔄 Executing in single transaction…');
  await prisma.$transaction(async (tx) => {
    // 1. Delete orphan/conflict refs first (so remap updates don't hit UNIQUE conflicts).
    if (paIdsToDelete.length) {
      await tx.paqueteAlojamiento.deleteMany({ where: { id: { in: paIdsToDelete } } });
    }
    if (ohIdsToDelete.length) {
      await tx.opcionHotel.deleteMany({ where: { id: { in: ohIdsToDelete } } });
    }
    // 2. Remap refs. Updates are sequential (Prisma can't batch different values) but
    //    with no per-row finds it's ~500 simple updates → ~30s total.
    for (const { id, newAlojamientoId } of paIdsToRemap) {
      await tx.paqueteAlojamiento.update({ where: { id }, data: { alojamientoId: newAlojamientoId } });
    }
    for (const { id, newAlojamientoId } of ohIdsToRemap) {
      await tx.opcionHotel.update({ where: { id }, data: { alojamientoId: newAlojamientoId } });
    }
    // 3. Delete old alojamientos (refs are all gone by now).
    await tx.alojamiento.deleteMany({ where: { id: { in: Array.from(decisions.keys()) } } });
  }, { timeout: 600_000 });

  const remappedPA = paIdsToRemap.length;
  const remappedOH = ohIdsToRemap.length;
  const deletedPA = paIdsToDelete.length;
  const deletedOH = ohIdsToDelete.length;
  const deletedOld = decisions.size;

  console.log(`   ✓ remapped ${remappedPA} PaqueteAlojamiento refs`);
  console.log(`   ✓ remapped ${remappedOH} OpcionHotel refs`);
  console.log(`   ✓ deleted ${deletedPA} orphan/conflict PaqueteAlojamiento rows`);
  console.log(`   ✓ deleted ${deletedOH} orphan/conflict OpcionHotel rows`);
  console.log(`   ✓ deleted ${deletedOld} old Alojamiento rows`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const reviewFileArg = args.find((a) => a.startsWith('--review-file='));
  const reviewFile = reviewFileArg ? reviewFileArg.split('=', 2)[1] : null;

  console.log('📥 Loading hotels from DB…');
  const { old, new: news } = await loadState();
  console.log(`   OLD: ${old.length}, NEW: ${news.length}`);
  console.log();

  console.log('🔍 Fuzzy-matching…');
  const results = matchAll(old, news);

  writeAutoCSV('/tmp/hotel-remap-auto.csv', results);
  writeReviewCSV('/tmp/hotel-remap-review.csv', results);
  writeOrphansCSV('/tmp/hotel-remap-orphans.csv', results);

  printReport(results);

  if (!confirm) {
    console.log();
    console.log('Dry-run only. Run with --confirm (optionally --review-file=...) to apply.');
    return;
  }

  const overrides = reviewFile && existsSync(reviewFile) ? parseReviewCSV(reviewFile) : new Map<string, Decision>();
  if (reviewFile) console.log(`Using review overrides from ${reviewFile} (${overrides.size} decisions)`);

  console.log();
  console.log('⚠️  --confirm flag detected. Applying in 3 seconds…');
  await new Promise((r) => setTimeout(r, 3000));
  await apply(results, overrides);
  console.log('✅ Migration complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
