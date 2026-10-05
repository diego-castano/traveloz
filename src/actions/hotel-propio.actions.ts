"use server";

// Hoteles que el vendedor escribió a mano en el cotizador. Son solo suyos:
// no tocan Alojamientos. Mismo contrato { ok, data } | { ok, error } que
// presupuesto.actions.ts: los errores de negocio no se tiran porque Next los
// enmascara en producción.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normHotel } from "@/lib/presupuesto/hotel-propio";
import { ErrorDeNegocio, fallar, scopeVendedor } from "@/lib/presupuesto/acceso";

const log = logger.child({ module: "hotel-propio.actions" });

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

const GENERICO = "No pudimos completar la operación. Probá de nuevo.";

async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ErrorDeNegocio) return { ok: false, error: err.message };
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}

const guardarSchema = z.object({
  vendedorId: z.string().nullish(),
  nombre: z.string().trim().min(1, "Falta el nombre del hotel.").max(200),
  ciudad: z.string().trim().max(120).nullish(),
  cat: z.number().int().min(0).max(5).nullish(),
});

export interface HotelPropioDto {
  id: string;
  vendedorId: string;
  nombre: string;
  ciudad: string;
  cat: number;
}

/** Alta o actualización: el mismo nombre en la misma ciudad no se duplica. */
export async function guardarHotelPropio(input: {
  vendedorId?: string | null;
  nombre: string;
  ciudad?: string | null;
  cat?: number | null;
}): Promise<Resultado<HotelPropioDto>> {
  return ejecutar("guardarHotelPropio", async () => {
    const parsed = guardarSchema.safeParse(input);
    if (!parsed.success) fallar(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    const { nombre, ciudad = "", cat = 0 } = parsed.data;

    const s = await scopeVendedor(parsed.data.vendedorId);
    const vendedorId = s.targetId ?? s.userId;

    const nombreNorm = normHotel(nombre);
    const ciudadNorm = normHotel(ciudad ?? "");
    const datos = { nombre, ciudad: ciudad ?? "", categoria: cat ?? 0 };

    const row = await prisma.hotelPropio.upsert({
      where: { vendedorId_nombreNorm_ciudadNorm: { vendedorId, nombreNorm, ciudadNorm } },
      update: datos,
      create: { vendedorId, nombreNorm, ciudadNorm, ...datos },
    });
    return {
      id: row.id,
      vendedorId: row.vendedorId,
      nombre: row.nombre,
      ciudad: row.ciudad,
      cat: row.categoria,
    };
  });
}

/** El vendedor borra solo los suyos; el admin, cualquiera. */
export async function eliminarHotelPropio(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarHotelPropio", async () => {
    const s = await scopeVendedor();
    const hotelId = String(id ?? "").trim();
    if (!hotelId) fallar("Falta el hotel.");
    await prisma.hotelPropio.deleteMany({
      where: s.isAdmin ? { id: hotelId } : { id: hotelId, vendedorId: s.userId },
    });
    return null;
  });
}
