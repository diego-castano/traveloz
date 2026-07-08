/**
 * One-shot: set SiteSetting.workwithus_video_url to the optimised video URL
 * stored in the traveloz bucket. Idempotent.
 *
 * Run with: npx tsx scripts/set-workwithus-video.ts
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const KEY = "workwithus_video_url";
const URL = "/api/image/site/workwithus.mp4";

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    if (!existing) {
      console.log(`[seed] ${KEY} not present — creating.`);
      await prisma.siteSetting.create({
        data: {
          key: KEY,
          value: URL,
          type: "url",
          group: "workwithus",
          label: "Video lateral (opcional)",
        },
      });
    } else {
      console.log(
        `[seed] ${KEY} current value: ${JSON.stringify(existing.value)}`,
      );
      await prisma.siteSetting.update({
        where: { key: KEY },
        data: { value: URL, type: "url", group: "workwithus" },
      });
    }
    const after = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    console.log(`[seed] ${KEY} -> ${JSON.stringify(after?.value)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
