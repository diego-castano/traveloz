/**
 * One-shot upload of the optimised workwithus hero video to the traveloz
 * bucket. Pinned key `site/workwithus.mp4` so the seeded
 * SiteSetting.workwithus_video_url stays stable across re-runs.
 *
 * Run with: npx tsx scripts/upload-workwithus-video.ts
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "path";
import fs from "fs/promises";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const SOURCE = path.resolve(process.cwd(), "public/site/video/workwithus.mp4");
const KEY = "site/workwithus.mp4";

const endpoint = process.env.STORAGE_ENDPOINT ?? process.env.AWS_ENDPOINT_URL;
const region =
  process.env.STORAGE_REGION ?? process.env.AWS_DEFAULT_REGION ?? "auto";
const bucket = process.env.STORAGE_BUCKET ?? process.env.AWS_S3_BUCKET_NAME;
const accessKeyId =
  process.env.STORAGE_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.STORAGE_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error(
    "Storage env vars missing. Need AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (or STORAGE_* equivalents).",
  );
}

const client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  const buffer = await fs.readFile(SOURCE);
  const stat = await fs.stat(SOURCE);

  console.log(`[upload] source  ${SOURCE} (${stat.size} bytes)`);
  console.log(`[upload] target  s3://${bucket}/${KEY}`);
  console.log(`[upload] content-type video/mp4`);

  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: KEY }));
  } catch (err) {
    head = null;
  }
  if (head) {
    console.log(
      `[upload] existing object: size=${head.ContentLength} etag=${head.ETag}`,
    );
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: KEY,
      Body: buffer,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  console.log(`[upload] OK  -> /api/image/${KEY}`);
}

main().catch((err) => {
  console.error("[upload] failed:", err);
  process.exit(1);
});
