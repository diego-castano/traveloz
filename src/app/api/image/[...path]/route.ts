import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth.config";
import { getStorageBucket, getStorageClient } from "@/lib/storage";

export const runtime = "nodejs";

// Prefijos del bucket que contienen PII y solo puede ver un usuario logueado
// del admin (CVs de postulantes, adjuntos de leads). El resto del bucket son
// assets públicos del sitio (fotos de paquetes, imágenes del CMS).
const PROTECTED_PREFIXES = ["leads/"];

export async function GET(
  _req: Request,
  ctx: { params: { path: string[] } },
) {
  const key = ctx.params.path.join("/");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  // Normalizar para que "leads/../foo" o "./leads/x" no esquiven el check.
  const normalized = key
    .split("/")
    .filter((seg) => seg !== "." && seg !== ".." && seg !== "")
    .join("/");

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    normalized.startsWith(p),
  );
  if (isProtected) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const res = await getStorageClient().send(
      new GetObjectCommand({ Bucket: getStorageBucket(), Key: normalized }),
    );
    const body = res.Body;
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const stream = body.transformToWebStream();
    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        // PII detrás de auth: nunca en caches compartidos.
        "Cache-Control": isProtected
          ? "private, no-store"
          : "public, max-age=31536000, immutable",
        ...(res.ContentLength
          ? { "Content-Length": String(res.ContentLength) }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const isNotFound = /not ?found|NoSuchKey/i.test(message);
    if (!isNotFound) console.error("[api/image] failed:", err);
    // No devolver message: puede contener keys/paths del bucket.
    return NextResponse.json(
      { error: isNotFound ? "Not found" : "Error interno" },
      { status: isNotFound ? 404 : 500 },
    );
  }
}
