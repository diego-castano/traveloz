/**
 * Server-side price propagation.
 *
 * The pricing formulas live in `src/lib/utils.ts` (pure, used by the client
 * provider to compute prices on the fly). This module persists those same
 * formulas to the database whenever an underlying service price changes,
 * so that:
 *
 *   - `OpcionHotelera.precioVenta`
 *   - `Paquete.netoCalculado`
 *   - `Paquete.precioVenta`
 *   - `Paquete.precioDesde`
 *
 * stay in sync without forcing the admin to open each affected paquete and
 * resave it. The public site reads `Paquete.precioDesde` directly, so without
 * this propagation any price change leaves stale numbers on /destinos.
 *
 * Trigger contract:
 *   - Service-price mutations (PrecioAereo/PrecioAlojamiento/PrecioCircuito,
 *     Traslado.precio, Seguro.costoPorDia) → call `recomputeFor*(serviceId)`.
 *   - Junction/composition mutations (assign/remove aereo, opcion hotelera
 *     factor change, OpcionHotel/PaqueteDestino edits) → call
 *     `recomputePaqueteOpciones(paqueteId)`.
 *
 * Failure mode: never block the originating mutation. Recompute errors are
 * logged but do not throw — leaving slightly stale prices is preferable to
 * making the user think their save failed.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  calcularNetoFijos,
  calcularVenta,
  calcularVentaOpcion,
  calcularNetoAlojamientosPorOpcion,
  computeNochesTotales,
  resolvePrecioAereo,
  resolvePrecioAlojamiento,
  resolvePrecioCircuito,
} from "@/lib/utils";
import { checkMargen } from "@/actions/package-lifecycle.utils";
import type {
  Aereo,
  Traslado,
  Seguro,
  Circuito,
  PrecioAereo,
  PrecioAlojamiento,
  PrecioCircuito,
  OpcionHotel,
  PaqueteDestino,
} from "@/lib/types";
import type { PrismaClient } from "@prisma/client";

const log = logger.child({ module: "recompute-prices" });

type Tx = Pick<
  PrismaClient,
  | "paquete"
  | "opcionHotelera"
  | "paqueteAereo"
  | "paqueteAlojamiento"
  | "paqueteTraslado"
  | "paqueteSeguro"
  | "paqueteCircuito"
  | "paqueteDestino"
  | "opcionHotel"
  | "precioAereo"
  | "precioAlojamiento"
  | "precioCircuito"
  | "aereo"
  | "alojamiento"
  | "traslado"
  | "seguro"
  | "circuito"
>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recompute persisted prices for a single paquete.
 *
 * Reads every junction + price row needed, applies the same formulas as
 * `computePaquetePrecios` in lib/utils.ts, and writes back:
 *   - `OpcionHotelera.precioVenta` for each opcion of the paquete
 *   - `Paquete.netoCalculado` / `precioVenta` / `precioDesde`
 *
 * Idempotent. Safe to call repeatedly.
 */
export async function recomputePaqueteOpciones(
  paqueteId: string,
  tx?: Tx,
  options: { dryRun?: boolean } = {},
): Promise<{
  updated: boolean;
  opciones: number;
  precioDesde: number | null;
  changes?: {
    opciones: Array<{ id: string; before: number; after: number }>;
    paquete?: {
      precioDesde: { before: number | null; after: number };
      precioVenta: { before: number; after: number };
      netoCalculado: { before: number; after: number };
    };
  };
}> {
  const db: Tx = (tx as Tx) ?? (prisma as unknown as Tx);
  const dryRun = options.dryRun === true;

  const paquete = await db.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      id: true,
      validezDesde: true,
      precioVenta: true,
      netoCalculado: true,
      precioDesde: true,
      precioDesdeMoneda: true,
      moneda: true,
      markup: true,
      noches: true,
      modalidad: true,
    },
  });

  if (!paquete) {
    log.warn("recompute skipped — paquete not found", { paqueteId });
    return { updated: false, opciones: 0, precioDesde: null };
  }

  // Load all junction rows for this paquete in parallel.
  const [
    paqueteAereos,
    paqueteAlojamientos,
    paqueteTraslados,
    paqueteSeguros,
    paqueteCircuitos,
    opciones,
    destinos,
  ] = await Promise.all([
    db.paqueteAereo.findMany({ where: { paqueteId } }),
    db.paqueteAlojamiento.findMany({ where: { paqueteId } }),
    db.paqueteTraslado.findMany({ where: { paqueteId } }),
    db.paqueteSeguro.findMany({ where: { paqueteId } }),
    db.paqueteCircuito.findMany({ where: { paqueteId } }),
    db.opcionHotelera.findMany({ where: { paqueteId } }),
    db.paqueteDestino.findMany({ where: { paqueteId } }),
  ]);

  const opcionIds = opciones.map((o) => o.id);
  const opcionHoteles = opcionIds.length
    ? await db.opcionHotel.findMany({
        where: { opcionHoteleraId: { in: opcionIds } },
      })
    : [];

  // ─── Resolve referenced service entities + prices ──────────────────────
  const aereoIds = paqueteAereos.map((pa) => pa.aereoId);
  const trasladoIds = paqueteTraslados.map((pt) => pt.trasladoId);
  const seguroIds = paqueteSeguros.map((ps) => ps.seguroId);
  const circuitoIds = paqueteCircuitos.map((pc) => pc.circuitoId);
  const alojamientoIdsForPrices = Array.from(
    new Set([
      ...paqueteAlojamientos.map((pa) => pa.alojamientoId),
      ...opcionHoteles.map((oh) => oh.alojamientoId),
    ]),
  );

  const [aereos, traslados, seguros, circuitos, preciosAereo, preciosAlojamiento, preciosCircuito] =
    await Promise.all([
      aereoIds.length
        ? db.aereo.findMany({ where: { id: { in: aereoIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["aereo"]["findMany"]>>),
      trasladoIds.length
        ? db.traslado.findMany({ where: { id: { in: trasladoIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["traslado"]["findMany"]>>),
      seguroIds.length
        ? db.seguro.findMany({ where: { id: { in: seguroIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["seguro"]["findMany"]>>),
      circuitoIds.length
        ? db.circuito.findMany({ where: { id: { in: circuitoIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["circuito"]["findMany"]>>),
      aereoIds.length
        ? db.precioAereo.findMany({ where: { aereoId: { in: aereoIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["precioAereo"]["findMany"]>>),
      alojamientoIdsForPrices.length
        ? db.precioAlojamiento.findMany({
            where: { alojamientoId: { in: alojamientoIdsForPrices }, deletedAt: null },
          })
        : Promise.resolve([] as Awaited<ReturnType<Tx["precioAlojamiento"]["findMany"]>>),
      circuitoIds.length
        ? db.precioCircuito.findMany({ where: { circuitoId: { in: circuitoIds }, deletedAt: null } })
        : Promise.resolve([] as Awaited<ReturnType<Tx["precioCircuito"]["findMany"]>>),
    ]);

  const fecha = paquete.validezDesde;

  // Prisma row types include extra metadata (createdAt as Date, nullable
  // strings instead of empty strings, etc.) that don't line up structurally
  // with the domain types in src/lib/types.ts. The pure helpers only read a
  // small subset of fields (numeric prices, ids), so a single cast at the
  // boundary keeps the helpers strict while letting us pass Prisma rows in.
  // ─── Compute fixed costs (same as calcularNetoFijos) ──────────────────
  const preciosAereoDomain = preciosAereo as unknown as PrecioAereo[];
  const preciosAlojamientoDomain = preciosAlojamiento as unknown as PrecioAlojamiento[];
  const preciosCircuitoDomain = preciosCircuito as unknown as PrecioCircuito[];

  const assignedAereos = paqueteAereos
    .map((pa) => {
      const aereo = aereos.find((a) => a.id === pa.aereoId);
      if (!aereo) return null;
      return {
        aereo: aereo as unknown as Aereo,
        precioAereo: resolvePrecioAereo(preciosAereoDomain, pa.aereoId, fecha),
      };
    })
    .filter((x): x is { aereo: Aereo; precioAereo: PrecioAereo | undefined } => x !== null);

  const assignedTraslados = paqueteTraslados
    .map((pt) => traslados.find((t) => t.id === pt.trasladoId))
    .filter((t): t is typeof traslados[number] => Boolean(t)) as unknown as Traslado[];

  const assignedSeguros = paqueteSeguros
    .map((ps) => {
      const seguro = seguros.find((s) => s.id === ps.seguroId);
      if (!seguro) return null;
      return { seguro: seguro as unknown as Seguro, diasCobertura: ps.diasCobertura ?? undefined };
    })
    .filter((x): x is { seguro: Seguro; diasCobertura: number | undefined } => x !== null);

  const assignedCircuitos = paqueteCircuitos
    .map((pc) => {
      const circuito = circuitos.find((c) => c.id === pc.circuitoId);
      if (!circuito) return null;
      return {
        circuito: circuito as unknown as Circuito,
        precioCircuito: resolvePrecioCircuito(preciosCircuitoDomain, pc.circuitoId, fecha),
      };
    })
    .filter((x): x is { circuito: Circuito; precioCircuito: PrecioCircuito | undefined } => x !== null);

  const destinosDomain = destinos as unknown as PaqueteDestino[];
  const nochesTotales = computeNochesTotales(destinosDomain);

  const netoFijos = calcularNetoFijos(
    assignedAereos,
    assignedTraslados,
    assignedSeguros,
    assignedCircuitos,
    nochesTotales,
  );

  // ─── Compute per-opcion prices and persist them ───────────────────────
  if (opciones.length === 0) {
    // Modalidad CIRCUITO: sin opciones hoteleras, el precio se deriva de los
    // costos fijos (circuito por persona vigente + aéreos + traslados + seguros)
    // y del markup del paquete. Persistimos netoCalculado / precioVenta /
    // precioDesde para que el público lea el precio sin depender de opciones.
    if (paquete.modalidad === "CIRCUITO") {
      // Duración de referencia para seguros sin diasCobertura: la del circuito
      // asignado (fuente de verdad en esta modalidad), fallback a paquete.noches.
      const nochesCircuito =
        assignedCircuitos[0]?.circuito.noches ?? paquete.noches ?? nochesTotales;
      const netoFijosCircuito = calcularNetoFijos(
        assignedAereos,
        assignedTraslados,
        assignedSeguros,
        assignedCircuitos,
        nochesCircuito,
      );
      const precioVentaCircuito = calcularVenta(netoFijosCircuito, paquete.markup);
      const precioDesdeCircuito = precioVentaCircuito > 0 ? precioVentaCircuito : null;

      // Guardarraíl de margen (mismos umbrales que create/update). No bloquea el
      // recálculo (contrato: nunca tirar); sólo deja rastro cuando el markup del
      // circuito queda fuera de umbral. El gate duro sigue en updatePaquete.
      const margen = checkMargen(netoFijosCircuito, precioVentaCircuito, paquete.markup);
      if (!margen.ok || margen.warning) {
        log.warn("recompute circuito: margen fuera de umbral", {
          paqueteId,
          neto: netoFijosCircuito,
          venta: precioVentaCircuito,
          markup: paquete.markup,
          warning: margen.warning,
        });
      }

      const willUpdate =
        Math.round(paquete.netoCalculado) !== Math.round(netoFijosCircuito) ||
        Math.round(paquete.precioVenta) !== precioVentaCircuito ||
        (paquete.precioDesde ?? null) !== precioDesdeCircuito ||
        (paquete.precioDesdeMoneda ?? null) !== paquete.moneda;

      const changes = willUpdate
        ? {
            opciones: [] as Array<{ id: string; before: number; after: number }>,
            paquete: {
              precioDesde: { before: paquete.precioDesde, after: precioDesdeCircuito ?? 0 },
              precioVenta: { before: paquete.precioVenta, after: precioVentaCircuito },
              netoCalculado: { before: paquete.netoCalculado, after: netoFijosCircuito },
            },
          }
        : undefined;

      if (!willUpdate) {
        return { updated: false, opciones: 0, precioDesde: precioDesdeCircuito, changes };
      }
      if (dryRun) {
        return { updated: true, opciones: 0, precioDesde: precioDesdeCircuito, changes };
      }

      const data = {
        netoCalculado: netoFijosCircuito,
        precioVenta: precioVentaCircuito,
        precioDesde: precioDesdeCircuito,
        precioDesdeMoneda: paquete.moneda,
      };
      if (tx) {
        await db.paquete.update({ where: { id: paqueteId }, data });
      } else {
        await prisma.paquete.update({ where: { id: paqueteId }, data });
      }
      log.info("recompute circuito: paquete persisted", {
        paqueteId,
        neto: netoFijosCircuito,
        precioDesde: precioDesdeCircuito,
      });
      return { updated: true, opciones: 0, precioDesde: precioDesdeCircuito, changes };
    }

    // Modalidad CLASICO sin opciones: campos legacy manejados por el operador
    // (clon, carga manual). No los tocamos.
    log.info("recompute: paquete has no opciones, leaving Paquete legacy fields untouched", { paqueteId });
    return { updated: false, opciones: 0, precioDesde: null };
  }

  const opcionPrecios: number[] = [];
  const opcionAlojNetos: number[] = [];
  const updates: Array<{ id: string; precioVenta: number }> = [];

  const opcionHotelesDomain = opcionHoteles as unknown as OpcionHotel[];
  for (const op of opciones) {
    const netoAloj = calcularNetoAlojamientosPorOpcion(
      op.id,
      opcionHotelesDomain,
      destinosDomain,
      preciosAlojamientoDomain,
      fecha,
    );
    const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, op.factor);
    opcionPrecios.push(precioVenta);
    opcionAlojNetos.push(netoAloj);

    if (precioVenta !== Math.round(op.precioVenta)) {
      updates.push({ id: op.id, precioVenta });
    }
  }

  const precioDesde = Math.min(...opcionPrecios);
  // netoCalculado mirrors the "cheapest option" total cost. Useful for the
  // margin calculator and for clone-as-template seeding.
  const netoCalculado = netoFijos + Math.min(...opcionAlojNetos);

  const willUpdatePaquete =
    Math.round(paquete.precioVenta) !== precioDesde ||
    (paquete.precioDesde ?? -1) !== precioDesde ||
    Math.round(paquete.netoCalculado) !== Math.round(netoCalculado);

  const changes = {
    opciones: updates.map((u) => {
      const op = opciones.find((o) => o.id === u.id)!;
      return { id: u.id, before: op.precioVenta, after: u.precioVenta };
    }),
    paquete: willUpdatePaquete
      ? {
          precioDesde: { before: paquete.precioDesde, after: precioDesde },
          precioVenta: { before: paquete.precioVenta, after: precioDesde },
          netoCalculado: { before: paquete.netoCalculado, after: netoCalculado },
        }
      : undefined,
  };

  if (updates.length === 0 && !willUpdatePaquete) {
    return { updated: false, opciones: opciones.length, precioDesde, changes };
  }

  if (dryRun) {
    return { updated: true, opciones: opciones.length, precioDesde, changes };
  }

  // Persist in a single transaction (or in the caller's tx if supplied).
  const runner = tx
    ? async () => {
        for (const u of updates) {
          await db.opcionHotelera.update({
            where: { id: u.id },
            data: { precioVenta: u.precioVenta },
          });
        }
        await db.paquete.update({
          where: { id: paqueteId },
          data: {
            netoCalculado,
            precioVenta: precioDesde,
            precioDesde,
          },
        });
      }
    : async () => {
        await prisma.$transaction([
          ...updates.map((u) =>
            prisma.opcionHotelera.update({
              where: { id: u.id },
              data: { precioVenta: u.precioVenta },
            }),
          ),
          prisma.paquete.update({
            where: { id: paqueteId },
            data: {
              netoCalculado,
              precioVenta: precioDesde,
              precioDesde,
            },
          }),
        ]);
      };

  await runner();
  log.info("recompute: paquete persisted", {
    paqueteId,
    opcionesUpdated: updates.length,
    precioDesde,
  });
  return { updated: true, opciones: opciones.length, precioDesde, changes };
}

// ---------------------------------------------------------------------------
// Affected-paquete resolvers
// ---------------------------------------------------------------------------

/**
 * Recompute every paquete that references the given Aereo via PaqueteAereo.
 * Caller swallows errors — never throws back to the originating mutation.
 */
export async function recomputeForAereo(aereoId: string): Promise<number> {
  return safeRecomputeMany(
    "aereo",
    aereoId,
    () =>
      prisma.paqueteAereo
        .findMany({ where: { aereoId }, select: { paqueteId: true } })
        .then((rows) => rows.map((r) => r.paqueteId)),
  );
}

/**
 * Recompute every paquete that references the given Alojamiento, either
 * directly (PaqueteAlojamiento) or via the option-based path
 * (OpcionHotel → OpcionHotelera → Paquete).
 */
export async function recomputeForAlojamiento(alojamientoId: string): Promise<number> {
  return safeRecomputeMany("alojamiento", alojamientoId, async () => {
    const [direct, optional] = await Promise.all([
      prisma.paqueteAlojamiento.findMany({
        where: { alojamientoId },
        select: { paqueteId: true },
      }),
      prisma.opcionHotel.findMany({
        where: { alojamientoId },
        select: { opcion: { select: { paqueteId: true } } },
      }),
    ]);
    return [
      ...direct.map((r) => r.paqueteId),
      ...optional.map((r) => r.opcion.paqueteId),
    ];
  });
}

export async function recomputeForTraslado(trasladoId: string): Promise<number> {
  return safeRecomputeMany(
    "traslado",
    trasladoId,
    () =>
      prisma.paqueteTraslado
        .findMany({ where: { trasladoId }, select: { paqueteId: true } })
        .then((rows) => rows.map((r) => r.paqueteId)),
  );
}

export async function recomputeForSeguro(seguroId: string): Promise<number> {
  return safeRecomputeMany(
    "seguro",
    seguroId,
    () =>
      prisma.paqueteSeguro
        .findMany({ where: { seguroId }, select: { paqueteId: true } })
        .then((rows) => rows.map((r) => r.paqueteId)),
  );
}

export async function recomputeForCircuito(circuitoId: string): Promise<number> {
  return safeRecomputeMany(
    "circuito",
    circuitoId,
    () =>
      prisma.paqueteCircuito
        .findMany({ where: { circuitoId }, select: { paqueteId: true } })
        .then((rows) => rows.map((r) => r.paqueteId)),
  );
}

/**
 * Find the paquete that owns the given OpcionHotelera and recompute it.
 * Used by junction handlers that mutate the option structure
 * (OpcionHotel CRUD, factor change, destino edits via opcion).
 */
export async function recomputeForOpcionHotelera(opcionHoteleraId: string): Promise<number> {
  const opcion = await prisma.opcionHotelera.findUnique({
    where: { id: opcionHoteleraId },
    select: { paqueteId: true },
  });
  if (!opcion) return 0;
  return safeRecompute(opcion.paqueteId);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function safeRecompute(paqueteId: string): Promise<number> {
  try {
    const r = await recomputePaqueteOpciones(paqueteId);
    return r.updated ? 1 : 0;
  } catch (err) {
    log.error("recompute failed (single)", { paqueteId, err });
    return 0;
  }
}

async function safeRecomputeMany(
  kind: string,
  serviceId: string,
  fetchIds: () => Promise<string[]>,
): Promise<number> {
  try {
    const ids = Array.from(new Set(await fetchIds()));
    if (ids.length === 0) return 0;
    let updated = 0;
    // Sequential to avoid hammering the connection pool with N parallel txns.
    // The number of paquetes per service is small (typically <30 in this dataset).
    for (const id of ids) {
      updated += await safeRecompute(id);
    }
    log.info(`recompute: cascade complete for ${kind}`, {
      serviceId,
      paquetes: ids.length,
      updated,
    });
    return updated;
  } catch (err) {
    log.error(`recompute cascade failed for ${kind}`, { serviceId, err });
    return 0;
  }
}
