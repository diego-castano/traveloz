import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getStorageBucket, getStorageClient } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: { path: string[] } },
) {
  const key = ctx.params.path.join("/");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const res = await getStorageClient().send(
      new GetObjectCommand({ Bucket: getStorageBucket(), Key: key }),
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
