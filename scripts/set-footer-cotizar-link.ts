import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const KEY = "footer_links_json";
const NEW_LINK = { label: "Cotizá tu viaje", href: "/cotizar" };

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    if (!existing) {
      console.log(`[footer] ${KEY} not present — create it via seed first.`);
      return;
    }
    let list: Array<{ label: string; href: string }> = [];
    try {
      const parsed = JSON.parse(existing.value || "[]");
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      // ignore, start empty
    }
    if (list.some((l) => l.href === NEW_LINK.href)) {
      console.log(`[footer] ${KEY} already has ${NEW_LINK.href} — no-op.`);
      return;
    }
    list.unshift(NEW_LINK);
    await prisma.siteSetting.update({
      where: { key: KEY },
      data: { value: JSON.stringify(list) },
    });
    console.log(`[footer] ${KEY} updated -> ${JSON.stringify(list)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[footer] failed:", err);
  process.exit(1);
});
