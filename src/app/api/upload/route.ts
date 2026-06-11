import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { deleteObject, keyFromUrl } from "@/lib/storage";
import {
  MAX_BYTES,
  PipelineError,
  processAndUpload,
} from "@/lib/file-pipeline";

export const runtime = "nodejs";

function sanitiseFolder(input: string | null | undefined) {
  return (input ?? "uploads")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 80) || "uploads";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = sanitiseFolder(form.get("folder") as string | null);
  const convertToWebp =
    (form.get("convertToWebp") as string | null)?.toLowerCase() !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo excede ${Math.round(MAX_BYTES / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processAndUpload(buffer, file.type, {
      folder,
      filename: file.name,
      convertToWebp,
      metadata: {
        uploader: String(session.user.email ?? session.user.id ?? "unknown"),
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PipelineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[upload] failed:", err);
    return NextResponse.json(
      { error: "No se pudo subir el archivo." },
      { status: 500 },
    );
  }
}

/**
 * Remove an object from the bucket.
 *
 * Accepts either:
 *   - `key`: raw bucket key (e.g. "paquetes/123/foto.jpg")
 *   - `url`: a stored `/api/image/<key>` URL — the key is extracted server-side
 *
 * Authenticated callers only. Returns 204 even if the object did not exist
 * (delete is idempotent and orphan rows must be deletable).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { key?: string; url?: string } = {};
  try {
    body = (await req.json()) as { key?: string; url?: string };
  } catch {
    /* allow query-string fallback */
    const sp = new URL(req.url).searchParams;
    body = { key: sp.get("key") ?? undefined, url: sp.get("url") ?? undefined };
  }

  const rawKey = body.key ?? keyFromUrl(body.url);
  if (!rawKey) {
    return NextResponse.json(
      { error: "Falta key o url" },
      { status: 400 },
    );
  }

  // Keep keys constrained to the same charset we generate. Prevents path-
  // traversal-ish keys (../something) from reaching the bucket.
  if (!/^[a-zA-Z0-9._/-]+$/.test(rawKey) || rawKey.includes("..")) {
    return NextResponse.json({ error: "Key inválida" }, { status: 400 });
  }

  try {
    await deleteObject(rawKey);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[upload:delete] failed:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el archivo." },
      { status: 500 },
    );
  }
}
