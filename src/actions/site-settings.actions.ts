"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function getSettingsByGroup(group: string) {
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
  await requireAuth();
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
