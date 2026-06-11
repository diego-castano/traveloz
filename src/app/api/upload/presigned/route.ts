import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { getPresignedPutUrl } from "@/lib/storage";
import { isAllowed } from "@/lib/file-pipeline";

export const runtime = "nodejs";

/**
 * Issues a short-lived presigned PUT URL so the browser uploads directly to
 * the bucket. Skipping the Next.js round-trip cuts latency in half and lets
 * us accept files larger than the API body parser limit.
 *
 * NOTE: this path bypasses the sharp pipeline (no EXIF strip, no WebP
 * convert). Only call from contexts where the client has already pre-
 * processed the bytes (e.g. ImageCropper output) or where the file is
 * inherently opaque (PDFs).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    contentType?: string;
    filename?: string;
    folder?: string;
    expiresIn?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* fall through */
  }

  const contentType = body.contentType ?? "application/octet-stream";
  if (!isAllowed(contentType)) {
    return NextResponse.json(
      { error: `Tipo no permitido: ${contentType}` },
      { status: 415 },
    );
  }

  const folder = (body.folder ?? "uploads")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 80) || "uploads";

  const safeFilename = (body.filename ?? "file").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const ext = safeFilename.includes(".")
    ? ""
    : `.${(contentType.split("/")[1] ?? "bin").split(";")[0]}`;
  const key = `${folder}/${Date.now()}-${safeFilename}${ext}`;

  try {
    const result = await getPresignedPutUrl({
      key,
      contentType,
      expiresIn: Math.min(body.expiresIn ?? 300, 900),
      metadata: {
        uploader: String(session.user.email ?? session.user.id ?? "unknown"),
      },
    });
    // We also surface the eventual public URL so the client can persist it.
    return NextResponse.json({
      ...result,
      publicUrl: `/api/image/${result.key}`,
    });
  } catch (err) {
    console.error("[upload/presigned] failed:", err);
    return NextResponse.json(
      { error: "No se pudo generar la URL de subida." },
      { status: 500 },
    );
  }
}
