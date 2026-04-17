import { NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION ?? "auto";
const bucket = process.env.STORAGE_BUCKET;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Storage not configured");
  }
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return client;
}

export async function GET(
  _req: Request,
  ctx: { params: { path: string[] } },
) {
  const key = ctx.params.path.join("/");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: bucket!, Key: key }),
    );
    const body = res.Body;
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const stream = body.transformToWebStream();
    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(res.ContentLength
          ? { "Content-Length": String(res.ContentLength) }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const isNotFound = /not ?found|NoSuchKey/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isNotFound ? 404 : 500 },
    );
  }
}
