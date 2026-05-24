// ---------------------------------------------------------------------------
// `npx prisma db seed` entry point.
//
// The old prototype-era seed loaded ~15 demo paquetes from `src/lib/data/*`.
// That data has been retired now that the admin operates against real
// content; the canonical idempotent seed lives in `seed-public.ts` and only
// touches CMS-style rows (SiteSettings + a couple of bootstrap catalogs).
//
// This wrapper exists so the `prisma.seed` config in package.json keeps
// working without re-introducing the legacy mock paquetes. For richer demo
// data use `tsx scripts/seed-modelo.ts` (with bucket-backed images) or
// `npm run seed:real` for the JSON-based import.
// ---------------------------------------------------------------------------

import "./seed-public";
