import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { getStorageBucket, getStorageClient } from "@/lib/storage";

// sharp es un módulo nativo: SOLO corre en runtime nodejs (no edge). No cambiar.
export const runtime = "nodejs";

// Prefijos del bucket que contienen PII y solo puede ver un usuario logueado
// del admin (CVs de postulantes, adjuntos de leads). El resto del bucket son
// assets públicos del sitio (fotos de paquetes, imágenes del CMS).
const PROTECTED_PREFIXES = ["leads/"];

// Documentos y pasaportes que cargan los pasajeros desde el link público de un
// vendedor. Sesión sola NO alcanza: son documentos de identidad de terceros y
// cualquier vendedor logueado podría leer los de otro. Acá exigimos además
// pertenencia — ADMIN, o el vendedor dueño del envío.
const DATOS_PASAJEROS_PREFIX = "leads/datos-pasajeros/";

// Anchos permitidos para el thumbnail on-the-fly (?w=). Whitelist fija: cualquier
// otro valor cae al passthrough sin transformar. Evita que un atacante genere
// millones de variantes distintas para saturar CPU/caché.
const THUMB_WIDTHS = new Set([160, 320, 480, 640, 960, 1280]);
// Solo transformamos formatos rasterizados que sharp reencodea a webp sin sorpresas.
// gif (animado), svg y demás → passthrough exacto.
const TRANSFORMABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(
  req: Request,
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

    if (normalized.startsWith(DATOS_PASAJEROS_PREFIX)) {
      const user = session.user as { id?: string; role?: string };
      if (user.role !== "ADMIN") {
        // El archivo se localiza por la URL guardada en el pasajero (misma
        // forma con la que se persistió: /api/image/<key>). Un archivo que se
        // subió pero cuyo envío nunca se completó no tiene fila: no lo abre
        // nadie salvo un admin, y el GC de huérfanos lo termina barriendo.
        const url = `/api/image/${normalized}`;
        const fila = await prisma.pasajeroDato.findFirst({
          where: {
            OR: [{ documentoArchivoUrl: url }, { pasaporteArchivoUrl: url }],
          },
          select: { envio: { select: { vendedorId: true } } },
        });
        if (!fila || fila.envio.vendedorId !== user.id) {
          return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
      }
    }
  }

  try {
    // Reenviar el header Range al storage para que el navegador pueda pedir el
    // video por chunks (206 Partial Content) y empezar a reproducir sin bajar
    // el archivo entero. Sin esto, video/audio bajan completos antes de sonar.
    const range = req.headers.get("range") ?? undefined;

    // ?w=<ancho>: pedido de thumbnail. Solo aplica a assets públicos (no PII) y
    // cuando NO hay Range (un thumbnail se sirve entero, nunca por chunks) — así
    // cualquier request con Range pasa exactamente como antes.
    const wParam = new URL(req.url).searchParams.get("w");
    const wNum = wParam ? Number(wParam) : NaN;
    const wantsThumb = !isProtected && !range && THUMB_WIDTHS.has(wNum);

    const res = await getStorageClient().send(
      new GetObjectCommand({
        Bucket: getStorageBucket(),
        Key: normalized,
        ...(range ? { Range: range } : {}),
      }),
    );
    const body = res.Body;
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contentType = res.ContentType ?? "application/octet-stream";

    // ─── Thumbnail on-the-fly ───────────────────────────────────────────────
    // Solo cuando el ancho está en la whitelist y el formato es rasterizado.
    // Cualquier fallo de sharp → passthrough de los bytes originales (nunca un
    // 500 nuevo). El passthrough usa los mismos bytes ya leídos (no re-fetch).
    if (wantsThumb && TRANSFORMABLE_TYPES.has(contentType)) {
      const input = Buffer.from(await body.transformToByteArray());
      try {
        const output = await sharp(input)
          .resize({ width: wNum, withoutEnlargement: true })
          .webp()
          .toBuffer();
        return new Response(output as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(output.length),
          },
        });
      } catch (sharpErr) {
        // Imagen corrupta / formato inesperado: devolvemos el original tal cual.
        console.error("[api/image] sharp resize failed, passthrough:", sharpErr);
        return new Response(input as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(input.length),
          },
        });
      }
    }

    const stream = body.transformToWebStream();
    // Si el storage respondió con un rango, propagar 206 + Content-Range.
    const isPartial = Boolean(res.ContentRange);
    return new Response(stream as unknown as BodyInit, {
      status: isPartial ? 206 : 200,
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        // Anunciar soporte de rangos para que el navegador lo aproveche.
        "Accept-Ranges": "bytes",
        // PII detrás de auth: nunca en caches compartidos.
        "Cache-Control": isProtected
          ? "private, no-store"
          : "public, max-age=31536000, immutable",
        ...(res.ContentRange ? { "Content-Range": res.ContentRange } : {}),
        ...(res.ContentLength
          ? { "Content-Length": String(res.ContentLength) }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    // El SDK de S3 avisa "archivo inexistente" por el NOMBRE del error
    // (`NotFound` en HeadObject, `NoSuchKey` en GetObject) y a veces deja el
    // message vacio. Mirando solo el message, una imagen borrada del bucket
    // salia 500: parecia una falla nuestra, ensuciaba los logs y escondia el
    // problema real, que es un dato apuntando a un archivo que ya no esta.
    const name = err instanceof Error ? err.name : "";
    const httpStatus =
      typeof err === "object" && err !== null
        ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    const isNotFound =
      /not ?found|NoSuchKey/i.test(message) ||
      /^(NotFound|NoSuchKey)$/i.test(name) ||
      httpStatus === 404;
    if (!isNotFound) console.error("[api/image] failed:", err);
    // No devolver message: puede contener keys/paths del bucket.
    return NextResponse.json(
      { error: isNotFound ? "Not found" : "Error interno" },
      { status: isNotFound ? 404 : 500 },
    );
  }
}
