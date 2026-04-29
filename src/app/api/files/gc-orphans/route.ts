import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { deleteObjects, listAllKeys, keyFromUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Garbage-collect orphan bucket objects.
 *
 *   1. List every key under each managed prefix in the bucket.
 *   2. Build a Set of every URL referenced by the DB (PaqueteFoto.url,
 *      AlojamientoFoto.url, Aereo.itinerarioImagenes[]).
 *   3. Diff → any bucket key not in the referenced set is an orphan.
 *
 * GET  → reports orphan keys without touching the bucket. Always safe to run.
 * POST → actually deletes the orphans. Requires `?confirm=1` to avoid
 *        accidental wipes during tab refreshes.
 *
 * Auth-protected. There's no `cron` here — fire it from a Railway scheduled
 * job, or hit it manually from the admin console.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const stats = await collectOrphans();
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  if (sp.get("confirm") !== "1") {
    return NextResponse.json(
      {
        error:
          "Llamá con ?confirm=1 para ejecutar el borrado real. Sin esa flag solo se reporta.",
      },
      { status: 400 },
    );
  }
  const stats = await collectOrphans();
  if (stats.orphans.length > 0) {
    await deleteObjects(stats.orphans);
  }
  return NextResponse.json({ ...stats, deleted: stats.orphans.length });
}

async function collectOrphans() {
  // 1. Bucket — every managed prefix. Using a generic empty prefix lists the
  //    whole bucket, fine while volume is small.
  const allKeys = await listAllKeys();

  // 2. DB — every URL/key referenced. Anything that lands as a `/api/image/...`
  //    URL or as a raw key is mapped back to a key.
  const referenced = new Set<string>();
  const addUrl = (u: string | null | undefined) => {
    const k = keyFromUrl(u);
    if (k) referenced.add(k);
  };

  const [paqueteFotos, alojamientoFotos, aereos] = await Promise.all([
    prisma.paqueteFoto.findMany({ select: { url: true } }),
    prisma.alojamientoFoto.findMany({ select: { url: true } }),
    prisma.aereo.findMany({ select: { itinerarioImagenes: true } }),
  ]);

  for (const f of paqueteFotos) addUrl(f.url);
  for (const f of alojamientoFotos) addUrl(f.url);
  for (const a of aereos) {
    for (const u of a.itinerarioImagenes ?? []) addUrl(u);
  }

  const orphans = allKeys.filter((k) => !referenced.has(k));

  return {
    bucketKeys: allKeys.length,
    referencedKeys: referenced.size,
    orphanCount: orphans.length,
    orphans,
  };
}
