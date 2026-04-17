import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { uploadBuffer } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = (form.get("folder") as string | null) ?? "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo no permitido: ${file.type}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo excede ${MAX_BYTES / 1024 / 1024}MB` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 60) || "uploads";
    const result = await uploadBuffer({
      buffer,
      contentType: file.type,
      folder: safeFolder,
      filename: file.name,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de almacenamiento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
