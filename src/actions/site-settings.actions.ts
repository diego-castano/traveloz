"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCanEdit } from "@/lib/require-auth";
import { SITE_SETTINGS_BOOTSTRAP } from "@/lib/site-settings-bootstrap";

/**
 * Best-effort self-heal: if this group has a bootstrap manifest (see
 * site-settings-bootstrap.ts) and the DB is missing one of its keys —
 * typically because the key was added after this install was seeded —
 * upsert it with its default (empty) value so it just appears in the
 * backend instead of silently not rendering. Never throws: a failure here
 * shouldn't block reading the settings that do exist.
 */
async function ensureBootstrapped(group: string): Promise<void> {
  const manifest = SITE_SETTINGS_BOOTSTRAP[group];
  if (!manifest?.length) return;
  try {
    const existing = await prisma.siteSetting.findMany({
      where: { key: { in: manifest.map((m) => m.key) } },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((e) => e.key));
    const missing = manifest.filter((m) => !existingKeys.has(m.key));
    if (missing.length === 0) return;
    await Promise.all(
      missing.map((m) =>
        prisma.siteSetting
          .upsert({
            where: { key: m.key },
            update: {},
            create: { key: m.key, value: m.value, group: m.group, label: m.label },
          })
          .catch(() => null),
      ),
    );
  } catch {
    // Best-effort — swallow and fall through to the regular read below.
  }
}

export async function getSettingsByGroup(group: string) {
  await ensureBootstrapped(group);
  return prisma.siteSetting.findMany({
    where: { group },
    orderBy: { key: "asc" },
  });
}

export async function getSetting(key: string) {
  return prisma.siteSetting.findUnique({ where: { key } });
}

export async function updateSettings(
  updates: Array<{ key: string; value: string }>,
) {
  await requireCanEdit();
  await prisma.$transaction(
    updates.map((u) =>
      prisma.siteSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  );
  revalidatePath("/backend/web", "layout");
  revalidatePath("/", "layout");
  revalidateTag("site-settings");
}
