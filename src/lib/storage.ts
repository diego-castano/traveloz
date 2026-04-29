import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Accept both STORAGE_* and AWS_* env var names (Railway's built-in S3 integration
// populates the AWS_* variants automatically).
const endpoint = process.env.STORAGE_ENDPOINT ?? process.env.AWS_ENDPOINT_URL;
const region =
  process.env.STORAGE_REGION ?? process.env.AWS_DEFAULT_REGION ?? "auto";
const bucket = process.env.STORAGE_BUCKET ?? process.env.AWS_S3_BUCKET_NAME;
const accessKeyId =
  process.env.STORAGE_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.STORAGE_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
// Tigris (and most modern S3-compatible providers) recommend virtual-hosted-style.
// Default to false (= virtual-hosted), but allow opting back into path-style via
// STORAGE_FORCE_PATH_STYLE=true for self-hosted MinIO etc.
const forcePathStyle =
  (process.env.STORAGE_FORCE_PATH_STYLE ?? "").toLowerCase() === "true";

let cachedClient: S3Client | null = null;

export function getStorageBucket(): string {
  if (!bucket) {
    throw new Error("Storage not configured. Missing STORAGE_BUCKET.");
  }
  return bucket;
}

function getClient(): S3Client {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Storage not configured. Missing STORAGE_ENDPOINT / STORAGE_BUCKET / STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY (or the AWS_* equivalents).",
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    });
  }
  return cachedClient;
}

export function getStorageClient(): S3Client {
  return getClient();
}

export interface UploadResult {
  key: string;
  url: string;
  /** Hex-encoded SHA-256 of the bytes that were uploaded. Useful for dedup. */
  hash: string;
  /** Persisted byte length on the bucket. */
  size: number;
  /** ContentType actually written (may differ from input after EXIF strip + WebP convert). */
  contentType: string;
}

export async function uploadBuffer(params: {
  buffer: Buffer;
  contentType: string;
  folder?: string;
  filename?: string;
  /**
   * Optional metadata persisted on the object. Useful for the GC route to
   * trace ownership without hitting the DB. Keys/values must be ASCII only.
   */
  metadata?: Record<string, string>;
}): Promise<UploadResult> {
  const { buffer, contentType, folder = "uploads", filename, metadata } = params;
  const client = getClient();
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
  const safeFilename = (filename ?? randomId()).replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeFilename}${filename ? "" : `.${ext}`}`;

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Long-lived browser cache; the key already includes a timestamp so
      // overwrites get a fresh URL.
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { sha256: hash, ...(metadata ?? {}) },
    }),
  );

  // Serve via the Next.js /api/image proxy so we don't depend on the bucket
  // being publicly readable. The proxy streams from the bucket on demand.
  const url = `/api/image/${key}`;
  return { key, url, hash, size: buffer.byteLength, contentType };
}

/**
 * Issue a short-lived presigned PUT URL so the browser can upload directly to
 * the bucket without proxying bytes through this Next.js server. Use for
 * payloads larger than the 10 MB API guard or when network round-trips matter.
 *
 * The caller still controls auth (must check session before issuing) and the
 * key/folder pattern (clients can't choose arbitrary keys).
 */
export async function getPresignedPutUrl(params: {
  key: string;
  contentType: string;
  expiresIn?: number;
  metadata?: Record<string, string>;
}): Promise<{ url: string; key: string; expiresIn: number }> {
  const { key, contentType, expiresIn = 300, metadata } = params;
  const client = getClient();
  const cmd = new PutObjectCommand({
    Bucket: bucket!,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: metadata,
  });
  const url = await getSignedUrl(client, cmd, { expiresIn });
  return { url, key, expiresIn };
}

/**
 * List every key under a prefix. Used by the GC orphan cleanup route.
 */
export async function listAllKeys(prefix?: string): Promise<string[]> {
  const client = getClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  while (true) {
    const res: import("@aws-sdk/client-s3").ListObjectsV2CommandOutput =
      await client.send(
        new ListObjectsV2Command({
          Bucket: bucket!,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    if (!res.IsTruncated || !res.NextContinuationToken) break;
    continuationToken = res.NextContinuationToken;
  }
  return keys;
}

/** Read an object back into memory (admin / GC operations only). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const client = getClient();
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket!, Key: key }),
  );
  const stream = res.Body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (!stream.transformToByteArray) {
    throw new Error("Stream does not support transformToByteArray");
  }
  return Buffer.from(await stream.transformToByteArray());
}

/**
 * Delete a single object from the bucket. Best-effort: callers may swallow
 * errors so that orphaning a row in the DB never blocks user-visible delete.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket!, Key: key }),
  );
}

/**
 * Batch delete (up to 1000 keys per S3 request). Falls back to per-object
 * deletes when the bucket disallows DeleteObjects (some S3-compatible
 * providers return MalformedXML for the multi-delete payload).
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = getClient();
  try {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket!,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  } catch {
    // Fallback — sequential single-object deletes. Best-effort.
    for (const k of keys) {
      try {
        await deleteObject(k);
      } catch {
        /* ignore — orphan is preferable to user-visible error */
      }
    }
  }
}

/**
 * Best-effort: extracts the bucket key from a stored URL such as
 * `/api/image/<folder>/<file>`. Returns null when the URL is external or
 * malformed so callers can skip the bucket delete cleanly.
 */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Strip query string and any leading domain.
  const path = url.split("?")[0];
  const match = path.match(/\/api\/image\/(.+)$/);
  return match ? match[1] : null;
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
