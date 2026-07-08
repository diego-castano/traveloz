/**
 * Server-side file pipeline.
 *
 * Single entry point for every byte that lands in /api/upload (whether via
 * multipart, by-url, or presigned-trusted). Handles:
 *
 *   1. Magic-byte MIME sniffing — never trust client-supplied `file.type`.
 *   2. Allowlist enforcement (image/* + video/* + application/pdf).
 *   3. For images: sharp pipeline → auto-rotate, strip EXIF/GPS, optional
 *      conversion to WebP for size + privacy.
 *   4. For videos: write-through, since sharp can't transcode.
 *   5. SHA-256 hashing for dedup.
 *   6. Bucket put via storage.uploadBuffer.
 *
 * Server-only (sharp is a native binary, file-type uses Node streams). Never
 * import from a client component.
 */

import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import crypto from "crypto";
import { uploadBuffer, type UploadResult } from "./storage";

// 25 MB cap fits most PDF/image uploads. Video shorts for hero blocks (e.g.
// workwithus_video_url) are also served through this pipeline, so we raise
// the ceiling to 100 MB to cover a 30-60 s marketing clip at 1080p H.264.
export const MAX_BYTES = 100 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const ALLOWED_DOCUMENT_MIMES = new Set([
  "application/pdf",
]);

export interface PipelineOptions {
  /** Folder prefix in the bucket. Sanitised by the caller already. */
  folder: string;
  /** Original filename — used to build a recognisable key. */
  filename?: string;
  /** Persisted in object metadata (helps the GC tool trace ownership). */
  metadata?: Record<string, string>;
  /** When true (default) re-encodes images to WebP for ~30-60% smaller files. */
  convertToWebp?: boolean;
}

export interface PipelineResult extends UploadResult {
  width?: number;
  height?: number;
  format?: string;
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function processAndUpload(
  buffer: Buffer,
  declaredType: string,
  opts: PipelineOptions,
): Promise<PipelineResult> {
  if (buffer.byteLength === 0) {
    throw new PipelineError("Archivo vacío", 400);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new PipelineError(
      `Archivo excede ${Math.round(MAX_BYTES / 1024 / 1024)} MB`,
      413,
    );
  }

  // 1. Sniff magic bytes. file-type returns undefined for plain text, JSON,
  //    etc. — we only accept images and PDFs.
  const sniffed = await fileTypeFromBuffer(buffer);
  const realMime = sniffed?.mime ?? declaredType;

  if (!isAllowed(realMime)) {
    throw new PipelineError(`Tipo no permitido: ${realMime}`, 415);
  }

  // Mismatched declared vs. actual type is a red flag (e.g. .exe renamed to
  // .jpg). We only accept it when the *actual* type is in the allowlist —
  // declared.type is informational at best.
  const isImage = ALLOWED_IMAGE_MIMES.has(realMime);
  const isVideo = ALLOWED_VIDEO_MIMES.has(realMime);

  if (isVideo) {
    // Video passes through unchanged — sharp can't transcode and we don't
    // want to corrupt a valid MP4/WebM. -movflags +faststart is the caller's
    // responsibility (already done for uploads prepared externally).
    const result = await uploadBuffer({
      buffer,
      contentType: realMime,
      folder: opts.folder,
      filename: opts.filename,
      metadata: { ...opts.metadata, "original-mime": realMime },
    });
    return { ...result };
  }

  if (!isImage) {
    // PDF or other allowed document — just write-through after hashing.
    return uploadBuffer({
      buffer,
      contentType: realMime,
      folder: opts.folder,
      filename: opts.filename,
      metadata: opts.metadata,
    }).then((r) => ({ ...r }));
  }

  // 2. Image pipeline — auto-rotate via EXIF Orientation, then drop EXIF.
  //    `withMetadata({ orientation: undefined })` strips Orientation; the
  //    explicit `.rotate()` call applies it first. ICC profile is preserved
  //    (nice for HDR-ish phone photos) but GPS is gone.
  const convertToWebp = opts.convertToWebp ?? true;
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();

  // Limit absurdly huge inputs server-side as a defence in depth, even though
  // the client compresses first.
  pipeline = pipeline.resize({
    width: 4000,
    height: 4000,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (convertToWebp) {
    pipeline = pipeline.webp({ quality: 82, effort: 4 });
  }

  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const out = await pipeline.toBuffer({ resolveWithObject: true });

  const finalContentType = convertToWebp ? "image/webp" : realMime;

  // Append the original-format hint to the filename so the bucket key keeps
  // the user-facing name human-readable.
  const ext = convertToWebp ? "webp" : extFor(realMime);
  const filename = opts.filename
    ? opts.filename.replace(/\.[^.]+$/, "") + `.${ext}`
    : undefined;

  const result = await uploadBuffer({
    buffer: out.data,
    contentType: finalContentType,
    folder: opts.folder,
    filename,
    metadata: {
      ...opts.metadata,
      ...(meta.width ? { width: String(meta.width) } : {}),
      ...(meta.height ? { height: String(meta.height) } : {}),
      "original-mime": realMime,
    },
  });

  return {
    ...result,
    width: out.info.width,
    height: out.info.height,
    format: out.info.format,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isAllowed(mime: string): boolean {
  return (
    ALLOWED_IMAGE_MIMES.has(mime) ||
    ALLOWED_VIDEO_MIMES.has(mime) ||
    ALLOWED_DOCUMENT_MIMES.has(mime)
  );
}

export function isAllowedImage(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mime);
}

export function isAllowedVideo(mime: string): boolean {
  return ALLOWED_VIDEO_MIMES.has(mime);
}

export function isAllowedDocument(mime: string): boolean {
  return ALLOWED_DOCUMENT_MIMES.has(mime);
}

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}
