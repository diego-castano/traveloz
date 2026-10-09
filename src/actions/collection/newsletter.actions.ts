"use server";

// Newsletter de Collection con doble confirmación. Acciones públicas (sin
// auth). Contrato { ok, data } | { ok, error }.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkFormRate } from "@/lib/rate-limit";
import { fallar } from "@/lib/presupuesto/acceso";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { ipDelCliente, pedirConfirmacionNewsletter } from "@/lib/collection/consultas-servidor";

const emailSchema = z.string().trim().toLowerCase().min(1, "Ingresá tu email.").max(254).email("Email inválido.");
const tokenSchema = z.string().trim().min(10).max(80);

/** Siempre responde igual, así no se filtra quién ya está suscripto. */
export async function suscribirNewsletter(input: {
  email: string;
  origen?: string;
  /** Honeypot: los bots lo completan. */
  website?: string;
}): Promise<Resultado<null>> {
  return ejecutar("suscribirNewsletter", async () => {
    if (input.website?.trim()) return null;
    if (!checkFormRate("col-newsletter", ipDelCliente()).allowed) {
      fallar("Recibimos varios envíos desde tu conexión. Probá de nuevo más tarde.");
    }
    const email = emailSchema.safeParse(input.email);
    if (!email.success) fallar(email.error.issues[0]?.message ?? "Email inválido.");
    await pedirConfirmacionNewsletter(email.data, String(input.origen ?? ""));
    return null;
  });
}

export async function confirmarSuscripcion(token: string): Promise<Resultado<{ estado: "CONFIRMADO" }>> {
  return ejecutar("confirmarSuscripcion", async () => {
    const t = tokenSchema.safeParse(token);
    if (!t.success) fallar("El enlace no es válido.");
    const s = await prisma.colSuscriptor.findUnique({ where: { token: t.data }, select: { id: true, estado: true } });
    if (!s) fallar("El enlace no es válido.");
    if (s.estado === "BAJA") fallar("Te diste de baja. Suscribite de nuevo desde el sitio.");
    if (s.estado === "PENDIENTE") {
      await prisma.colSuscriptor.update({ where: { id: s.id }, data: { estado: "CONFIRMADO", confirmadoEn: new Date() } });
    }
    return { estado: "CONFIRMADO" as const };
  });
}

export async function bajaSuscripcion(token: string): Promise<Resultado<{ estado: "BAJA" }>> {
  return ejecutar("bajaSuscripcion", async () => {
    const t = tokenSchema.safeParse(token);
    if (!t.success) fallar("El enlace no es válido.");
    const s = await prisma.colSuscriptor.findUnique({ where: { token: t.data }, select: { id: true, estado: true } });
    if (!s) fallar("El enlace no es válido.");
    if (s.estado !== "BAJA") {
      await prisma.colSuscriptor.update({ where: { id: s.id }, data: { estado: "BAJA", bajaEn: new Date() } });
    }
    return { estado: "BAJA" as const };
  });
}
