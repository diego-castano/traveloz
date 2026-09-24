"use server";

import { requireAuth } from "@/lib/require-auth";
import { roleConfig, type Role } from "@/lib/auth";
import { calcularAnaliticaUtm, type AnaliticaUtm } from "@/lib/analitica-utm";

export async function getAnaliticaUtm(dias: number | null): Promise<AnaliticaUtm> {
  const ctx = await requireAuth();
  if (!roleConfig[ctx.role as Role]?.visibleModules.includes("analitica")) {
    throw new Error("Tu rol no tiene acceso a la analítica.");
  }
  return calcularAnaliticaUtm(dias);
}
