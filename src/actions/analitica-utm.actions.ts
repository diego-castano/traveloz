"use server";

import { requireAuth } from "@/lib/require-auth";
import { roleConfig, type Role } from "@/lib/auth";
import { calcularAnaliticaUtm } from "@/lib/analitica-utm";
import type { DatosAnaliticaUtm } from "@/lib/analitica-utm-tipos";

export async function getAnaliticaUtm(): Promise<DatosAnaliticaUtm> {
  const ctx = await requireAuth();
  const modulos = roleConfig[ctx.role as Role]?.visibleModules ?? [];
  if (!modulos.includes("analitica")) {
    throw new Error("Tu rol no tiene acceso a la analítica.");
  }
  // Los nombres de las consultas solo para quien ya ve Contactos: MARKETING
  // ve los números pero no las personas.
  return calcularAnaliticaUtm(modulos.includes("leads"));
}
