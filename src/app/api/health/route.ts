/**
 * Liveness + readiness probe for uptime monitors and Railway health checks.
 *
 * Returns one of:
 *   200 OK         — both DB and storage reachable
 *   200 OK degraded — DB up, storage missing/misconfigured (storage is optional)
 *   503 ERROR      — DB unreachable; deployment must NOT receive traffic
 *
 * Each dependency is probed in parallel with a 2 s timeout so an unresponsive
 * S3 endpoint never holds up the whole probe past Railway's window.
 *
 * The route is force-dynamic so health responses never get cached by Next's
 * data cache — every poll hits the live infrastructure.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageClient, getStorageBucket } from "@/lib/storage";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROBE_TIMEOUT_MS = 2000;
const log = logger.child({ module: "health" });

type CheckResult =
  | { ok: true; latency_ms: number }
  | { ok: false; latency_ms: number; error: string };

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

async function checkDb(): Promise<CheckResult> {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, PROBE_TIMEOUT_MS, "db");
    return { ok: true, latency_ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkStorage(): Promise<CheckResult & { configured: boolean }> {
  const started = Date.now();
  let bucket: string;
  try {
    bucket = getStorageBucket();
  } catch {
    return {
      ok: false,
      configured: false,
      latency_ms: 0,
      error: "storage not configured",
    };
  }
  try {
    const client = getStorageClient();
    await withTimeout(
      client.send(new HeadBucketCommand({ Bucket: bucket })),
      PROBE_TIMEOUT_MS,
      "storage",
    );
    return { ok: true, configured: true, latency_ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [db, storage] = await Promise.all([checkDb(), checkStorage()]);

  // Storage being missing is NOT enough to fail the probe — fresh deploys may
  // not have credentials yet, and the public site renders without uploads.
  // Database failure on the other hand means we cannot serve any read.
  const status = db.ok ? (storage.ok || !storage.configured ? "ok" : "degraded") : "error";
  const httpStatus = db.ok ? 200 : 503;

  if (!db.ok) {
    log.error("health.db_down", { db, storage });
  } else if (!storage.ok && storage.configured) {
    log.warn("health.storage_down", { storage });
  }

  return NextResponse.json(
    {
      status,
      ts: new Date().toISOString(),
      version: process.env.RAILWAY_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      checks: { db, storage },
    },
    { status: httpStatus, headers: { "Cache-Control": "no-store" } },
  );
}
