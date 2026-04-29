import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import {
  PipelineError,
  processAndUpload,
  MAX_BYTES,
} from "@/lib/file-pipeline";

export const runtime = "nodejs";

/**
 * Server-side fetch + upload. Lets the user paste an external URL (e.g.
 * Booking.com photo, supplier brochure PDF) and have us re-host it on the
 * bucket without their browser dealing with CORS, mixed-content, etc.
 *
 * Safety guards:
 *   - Auth required (admin only).
 *   - Only http(s) URLs.
 *   - Hard timeout + size cap to prevent abuse.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { url?: string; folder?: string; filename?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Falta url" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "Solo se aceptan URLs http(s)" },
      { status: 400 },
    );
  }

  const folder = (body.folder ?? "uploads")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 80) || "uploads";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "TravelozUploader/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Origen devolvió ${res.status}` },
        { status: 502 },
      );
    }
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `Archivo excede ${Math.round(MAX_BYTES / 1024 / 1024)} MB`,
        },
        { status: 413 },
      );
    }
    const declaredType =
      res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `Archivo excede ${Math.round(MAX_BYTES / 1024 / 1024)} MB`,
        },
        { status: 413 },
      );
    }

    const inferredName =
      body.filename?.trim() ||
      decodeURIComponent(url.split("?")[0].split("/").pop() ?? "remote-file");

    const result = await processAndUpload(buffer, declaredType, {
      folder,
      filename: inferredName,
      metadata: {
        source: "by-url",
        sourceUrl: url.slice(0, 500),
        uploader: String(session.user.email ?? session.user.id ?? "unknown"),
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PipelineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Tiempo de espera agotado" },
        { status: 504 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Error fetcheando el origen";
    console.error("[upload/by-url] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
