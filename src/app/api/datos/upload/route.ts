// ---------------------------------------------------------------------------
// POST /api/datos/upload — subida de UN adjunto del formulario público de
// datos de pasajeros (documento o pasaporte).
//
// ¿Por qué un route handler y no la server action? Las server actions de
// Next 14 bufean el body entero en RAM y tienen un tope de 1 MB por defecto.
// Un grupo de 12 pasajeros con dos adjuntos cada uno serían decenas de MB en
// la memoria de la única instancia de Railway. Acá cada archivo viaja en su
// propia request, se procesa y se tira; la server action final recibe solo las
// keys del bucket como strings.
//
// Endurecido: rate-limit por slug + IP, el slug tiene que ser un vendedor
// activo con link encendido, el formulario tiene que estar publicado, tope de
// 8 MB y sniff de magic bytes (nunca confiamos en file.type del cliente).
//
// Los archivos van bajo `leads/…`, prefijo que /api/image ya sirve solo con
// sesión (y con chequeo de pertenencia para este sub-prefijo).
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/db";
import { checkFormRate } from "@/lib/rate-limit";
import { processAndUpload, PipelineError } from "@/lib/file-pipeline";
import { ADJUNTO_MIMES, MAX_ADJUNTO_BYTES, PREFIJO_ADJUNTOS } from "@/lib/datos-form";
import { logger } from "@/lib/logger";

// sharp y file-type son nativos/Node: nunca edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ module: "api.datos.upload" });

const EXT_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const slug = String(form.get("slug") ?? "").trim().toLowerCase();
    const lote = String(form.get("lote") ?? "").trim().toLowerCase();
    const file = form.get("file");

    if (!slug || !/^[a-z0-9-]{1,60}$/.test(slug)) {
      return error("Link inválido.", 400);
    }
    // El lote lo genera el navegador (crypto.randomUUID) al abrir el formulario
    // y agrupa los adjuntos de un mismo envío. Validamos la forma para que
    // nadie escriba fuera de su carpeta.
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(lote)) {
      return error("Sesión de carga inválida. Recargá la página.", 400);
    }
    if (!(file instanceof File) || file.size === 0) {
      return error("No llegó ningún archivo.", 400);
    }
    if (file.size > MAX_ADJUNTO_BYTES) {
      return error(
        `El archivo supera los ${Math.round(MAX_ADJUNTO_BYTES / 1024 / 1024)} MB.`,
        413,
      );
    }

    const rate = checkFormRate(`datos-upload:${slug}`, clientIp(req));
    if (!rate.allowed) {
      return error("Demasiadas subidas desde tu conexión. Probá de nuevo más tarde.", 429);
    }

    // El link tiene que existir, estar activo y con el formulario publicado:
    // así el endpoint no es un depósito abierto para cualquiera.
    const [vendedor, formulario] = await Promise.all([
      prisma.user.findFirst({
        where: { slug, isActive: true, linkActivo: true },
        select: { id: true },
      }),
      prisma.formularioDato.findUnique({
        where: { tipo: "PASAJEROS" },
        select: { publicado: true },
      }),
    ]);
    if (!vendedor || !formulario?.publicado) {
      return error("Este enlace no está disponible.", 404);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes: el Content-Type del cliente se ignora por completo.
    const sniffed = await fileTypeFromBuffer(buffer);
    const mime = sniffed?.mime ?? "";
    if (!ADJUNTO_MIMES.has(mime)) {
      return error("Formato no permitido. Subí una foto (JPG, PNG, WEBP) o un PDF.", 415);
    }

    // Nombre propio: el original puede traer el nombre real del pasajero y no
    // aporta nada. Las imágenes además salen re-encodeadas a WebP sin EXIF/GPS.
    const nombre = `${randomUUID()}.${EXT_POR_MIME[mime]}`;
    const subido = await processAndUpload(buffer, mime, {
      folder: `${PREFIJO_ADJUNTOS}/${lote}`,
      filename: nombre,
      metadata: { source: "datos-pasajeros" },
      convertToWebp: mime !== "application/pdf",
    });

    log.info("datos.upload.ok", { slug, lote, key: subido.key, bytes: subido.size });
    return NextResponse.json({ ok: true, key: subido.key });
  } catch (err) {
    if (err instanceof PipelineError) {
      return error(err.message, err.status);
    }
    log.error("datos.upload.fail", err);
    return error("No pudimos subir el archivo. Probá de nuevo.", 500);
  }
}
