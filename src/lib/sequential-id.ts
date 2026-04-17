import type { Prisma, PrismaClient } from "@prisma/client";

export type IdEntity =
  | "paquete"
  | "aereo"
  | "alojamiento"
  | "traslado"
  | "seguro"
  | "circuito";

type Client = PrismaClient | Prisma.TransactionClient;

function format(value: number): string {
  return value < 1000 ? String(value).padStart(3, "0") : String(value);
}

export async function generateSequentialId(
  client: Client,
  entity: IdEntity,
): Promise<string> {
  const counter = await client.idCounter.upsert({
    where: { entity },
    create: { entity, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return format(counter.lastValue);
}
