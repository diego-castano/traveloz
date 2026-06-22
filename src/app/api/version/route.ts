import { NextResponse } from "next/server";

// Endpoint liviano (sin chequeos de DB/storage) para que el panel detecte
// cuándo hubo un deploy nuevo y ofrezca recargar. Devuelve el id del deploy
// actual. En local no hay deploy id → "dev" (estable, nunca dispara el cartel).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const version =
    process.env.RAILWAY_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "dev";
  return NextResponse.json(
    { version },
    { headers: { "Cache-Control": "no-store" } },
  );
}
