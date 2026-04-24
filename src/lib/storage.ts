import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

let cachedClient: S3Client | null = null;

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
      forcePathStyle: true,
    });
  }
  return cachedClient;
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadBuffer(params: {
  buffer: Buffer;
  contentType: string;
  folder?: string;
  filename?: string;
}): Promise<UploadResult> {
  const { buffer, contentType, folder = "uploads", filename } = params;
  const client = getClient();
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
  const safeFilename = (filename ?? randomId()).replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeFilename}${filename ? "" : `.${ext}`}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  // Serve via the Next.js /api/image proxy so we don't depend on the bucket
  // being publicly readable. The proxy streams from the bucket on demand.
  const url = `/api/image/${key}`;
  return { key, url };
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
