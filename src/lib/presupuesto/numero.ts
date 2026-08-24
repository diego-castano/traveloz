// ---------------------------------------------------------------------------
// Numeración de cotizaciones: COT-2026-0148.
//
// Mismo mecanismo que src/lib/sequential-id.ts (un upsert sobre IdCounter),
// con dos diferencias: el contador se reinicia por año (entidad
// "presupuesto:2026") y el correlativo se rellena a 4 dígitos en vez de 3.
// No se toca sequential-id.ts para no cambiarle el formato a los paquetes.
// ---------------------------------------------------------------------------

import type { Prisma, PrismaClient } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

/** Entidad del contador para un año dado. */
export function entidadDelAnio(anio: number): string {
  return `presupuesto:${anio}`;
}

/**
 * Reserva el próximo número del año en curso. El upsert es atómico: dos
 * vendedores guardando al mismo tiempo no se pisan el correlativo.
 */
export async function generarNumeroPresupuesto(
  client: Client,
  anio: number = new Date().getFullYear(),
): Promise<string> {
  const entity = entidadDelAnio(anio);
  const counter = await client.idCounter.upsert({
    where: { entity },
    create: { entity, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `COT-${anio}-${String(counter.lastValue).padStart(4, "0")}`;
}
