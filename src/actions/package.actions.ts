"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";
import type { EstadoPaquete } from "@prisma/client";

// ──────────────────────────────────────────────
// Paquete — Main entity (soft delete)
// ──────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Two-wave loading for paquetes.
// Wave 1 — getBasePackages: only the Paquete rows. Fast; lifts the skeleton.
// Wave 2 — getPackageSubEntities: all paquete-X join rows. Background fill.
// ---------------------------------------------------------------------------

export async function getBasePackages(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const paquetes = await prisma.paquete.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { paquetes };
  } catch (error) {
    console.error("Error fetching base packages:", error);
    throw new Error("No se pudieron obtener los paquetes.");
  }
}

export async function getPackageSubEntities(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);

    // Filter sub-entities by brand via their parent Paquete.
    const paqueteFilter = { paquete: { brandId, deletedAt: null } };

    const [
      paqueteAereos,
      paqueteAlojamientos,
      paqueteTraslados,
      paqueteSeguros,
      paqueteCircuitos,
      paqueteFotos,
      paqueteEtiquetas,
      opcionesHoteleras,
      destinos,
      opcionHoteles,
    ] = await Promise.all([
      prisma.paqueteAereo.findMany({ where: paqueteFilter }),
      prisma.paqueteAlojamiento.findMany({ where: paqueteFilter }),
      prisma.paqueteTraslado.findMany({ where: paqueteFilter }),
      prisma.paqueteSeguro.findMany({ where: paqueteFilter }),
      prisma.paqueteCircuito.findMany({ where: paqueteFilter }),
      prisma.paqueteFoto.findMany({ where: paqueteFilter }),
      prisma.paqueteEtiqueta.findMany({ where: paqueteFilter }),
      prisma.opcionHotelera.findMany({ where: paqueteFilter }),
      prisma.paqueteDestino.findMany({ where: paqueteFilter }),
      prisma.opcionHotel.findMany({
        where: { opcion: { paquete: { brandId, deletedAt: null } } },
      }),
    ]);

    return {
      paqueteAereos,
      paqueteAlojamientos,
      paqueteTraslados,
      paqueteSeguros,
      paqueteCircuitos,
      paqueteFotos,
      paqueteEtiquetas,
      opcionesHoteleras,
      destinos,
      opcionHoteles,
    };
  } catch (error) {
    console.error("Error fetching package sub-entities:", error);
    throw new Error("No se pudieron obtener los datos relacionales de paquetes.");
  }
}

// Compat wrapper — still used by legacy callers that want everything at once.
export async function getAllPackageData(requestedBrandId?: string) {
  const [base, sub] = await Promise.all([
    getBasePackages(requestedBrandId),
    getPackageSubEntities(requestedBrandId),
  ]);
  return { ...base, ...sub };
}

export async function createPaquete(data: {
  titulo: string;
  destino: string;
  descripcion?: string;
  textoVisual?: string;
  noches: number;
  salidas?: string;
  temporadaId?: string;
  tipoPaqueteId?: string;
  validezDesde?: string;
  validezHasta?: string;
  estado?: EstadoPaquete;
  destacado?: boolean;
  netoCalculado?: number;
  markup?: number;
  precioVenta?: number;
  moneda?: string;
  ordenServicios?: string[];
}) {
  try {
    const { brandId } = await requireAuth();

    const schema = z.object({
      titulo: z.string().min(1),
      destino: z.string(),
      noches: z.number().int().positive(),
    });
    schema.parse(data);

    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "paquete");
      return await tx.paquete.create({ data: { ...data, id, brandId } });
    });
  } catch (error) {
    console.error("Error creating paquete:", error);
    throw new Error("No se pudo crear el paquete.");
  }
}

export async function updatePaquete(
  id: string,
  data: {
    titulo?: string;
    destino?: string;
    descripcion?: string;
    textoVisual?: string;
    noches?: number;
    salidas?: string;
    temporadaId?: string | null;
    tipoPaqueteId?: string | null;
    validezDesde?: string | null;
    validezHasta?: string | null;
    estado?: EstadoPaquete;
    destacado?: boolean;
    netoCalculado?: number;
    markup?: number;
    precioVenta?: number;
    moneda?: string;
    ordenServicios?: string[];
  }
) {
  try {
    await requireAuth();
    return await prisma.paquete.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating paquete:", error);
    throw new Error("No se pudo actualizar el paquete.");
  }
}

export async function deletePaquete(id: string) {
  try {
    await requireAuth();
    return await prisma.paquete.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    console.error("Error deleting paquete:", error);
    throw new Error("No se pudo eliminar el paquete.");
  }
}

export async function clonePaquete(sourceId: string) {
  try {
    await requireAuth();
    return await prisma.$transaction(async (tx) => {
      // 1. Read source paquete
      const source = await tx.paquete.findUniqueOrThrow({
        where: { id: sourceId },
      });

      // 2. Create new paquete with a sequential id
      const newId = await generateSequentialId(tx, "paquete");
      const newPaquete = await tx.paquete.create({
        data: {
          id: newId,
          brandId: source.brandId,
          titulo: `Copia de ${source.titulo}`,
          destino: source.destino,
          descripcion: source.descripcion,
          textoVisual: source.textoVisual,
          salidas: source.salidas,
          temporadaId: source.temporadaId,
          tipoPaqueteId: source.tipoPaqueteId,
          validezDesde: source.validezDesde,
          validezHasta: source.validezHasta,
          estado: "BORRADOR",
          destacado: false,
          netoCalculado: source.netoCalculado,
          markup: source.markup,
          precioVenta: source.precioVenta,
          moneda: source.moneda,
          ordenServicios: source.ordenServicios,
        },
      });

      // 3. Read all junction tables for source
      const [
        sourceAereos,
        sourceAlojamientos,
        sourceTraslados,
        sourceSeguros,
        sourceCircuitos,
        sourceFotos,
        sourceEtiquetas,
        sourceOpciones,
        sourceDestinos,
        sourceOpcionHoteles,
      ] = await Promise.all([
        tx.paqueteAereo.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteAlojamiento.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteTraslado.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteSeguro.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteCircuito.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteFoto.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteEtiqueta.findMany({ where: { paqueteId: sourceId } }),
        tx.opcionHotelera.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteDestino.findMany({ where: { paqueteId: sourceId } }),
        tx.opcionHotel.findMany({
          where: { opcion: { paqueteId: sourceId } },
        }),
      ]);

      // 4. Clone all junction tables using createMany, then re-fetch
      if (sourceAereos.length > 0) {
        await tx.paqueteAereo.createMany({
          data: sourceAereos.map((a) => ({
            paqueteId: newPaquete.id,
            aereoId: a.aereoId,
            textoDisplay: a.textoDisplay,
            orden: a.orden,
          })),
        });
      }

      if (sourceAlojamientos.length > 0) {
        await tx.paqueteAlojamiento.createMany({
          data: sourceAlojamientos.map((a) => ({
            paqueteId: newPaquete.id,
            alojamientoId: a.alojamientoId,
            textoDisplay: a.textoDisplay,
            orden: a.orden,
          })),
        });
      }

      if (sourceTraslados.length > 0) {
        await tx.paqueteTraslado.createMany({
          data: sourceTraslados.map((t) => ({
            paqueteId: newPaquete.id,
            trasladoId: t.trasladoId,
            textoDisplay: t.textoDisplay,
            orden: t.orden,
          })),
        });
      }

      if (sourceSeguros.length > 0) {
        await tx.paqueteSeguro.createMany({
          data: sourceSeguros.map((s) => ({
            paqueteId: newPaquete.id,
            seguroId: s.seguroId,
            diasCobertura: s.diasCobertura,
            textoDisplay: s.textoDisplay,
            orden: s.orden,
          })),
        });
      }

      if (sourceCircuitos.length > 0) {
        await tx.paqueteCircuito.createMany({
          data: sourceCircuitos.map((c) => ({
            paqueteId: newPaquete.id,
            circuitoId: c.circuitoId,
            textoDisplay: c.textoDisplay,
            orden: c.orden,
          })),
        });
      }

      if (sourceFotos.length > 0) {
        await tx.paqueteFoto.createMany({
          data: sourceFotos.map((f) => ({
            paqueteId: newPaquete.id,
            url: f.url,
            alt: f.alt,
            orden: f.orden,
          })),
        });
      }

      if (sourceEtiquetas.length > 0) {
        await tx.paqueteEtiqueta.createMany({
          data: sourceEtiquetas.map((e) => ({
            paqueteId: newPaquete.id,
            etiquetaId: e.etiquetaId,
          })),
        });
      }

      // Clone opciones one by one so we can map oldId → newId for OpcionHotel.
      const opcionIdMap = new Map<string, string>();
      for (const o of sourceOpciones) {
        const created = await tx.opcionHotelera.create({
          data: {
            paqueteId: newPaquete.id,
            nombre: o.nombre,
            factor: o.factor,
            precioVenta: o.precioVenta,
            orden: o.orden,
            proveedorId: o.proveedorId,
          },
        });
        opcionIdMap.set(o.id, created.id);
      }

      // Clone destinos — keep oldId → newId map for OpcionHotel link-through.
      const destinoIdMap = new Map<string, string>();
      for (const d of sourceDestinos) {
        const created = await tx.paqueteDestino.create({
          data: {
            paqueteId: newPaquete.id,
            ciudadId: d.ciudadId,
            noches: d.noches,
            orden: d.orden,
          },
        });
        destinoIdMap.set(d.id, created.id);
      }

      // Clone OpcionHotel rows using the two maps above.
      if (sourceOpcionHoteles.length > 0) {
        await tx.opcionHotel.createMany({
          data: sourceOpcionHoteles
            .map((oh) => {
              const newOpcionId = opcionIdMap.get(oh.opcionHoteleraId);
              const newDestinoId = destinoIdMap.get(oh.destinoId);
              if (!newOpcionId || !newDestinoId) return null;
              return {
                opcionHoteleraId: newOpcionId,
                destinoId: newDestinoId,
                alojamientoId: oh.alojamientoId,
                orden: oh.orden,
              };
            })
            .filter(
              (x): x is NonNullable<typeof x> => x !== null,
            ),
        });
      }

      // 5. Re-fetch all cloned junction records
      const [
        newAereos,
        newAlojamientos,
        newTraslados,
        newSeguros,
        newCircuitos,
        newFotos,
        newEtiquetas,
        newOpciones,
        newDestinos,
        newOpcionHoteles,
      ] = await Promise.all([
        tx.paqueteAereo.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteAlojamiento.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteTraslado.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteSeguro.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteCircuito.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteFoto.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteEtiqueta.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.opcionHotelera.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteDestino.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.opcionHotel.findMany({
          where: { opcion: { paqueteId: newPaquete.id } },
        }),
      ]);

      return {
        paquete: newPaquete,
        paqueteAereos: newAereos,
        paqueteAlojamientos: newAlojamientos,
        paqueteTraslados: newTraslados,
        paqueteSeguros: newSeguros,
        paqueteCircuitos: newCircuitos,
        paqueteFotos: newFotos,
        paqueteEtiquetas: newEtiquetas,
        opcionesHoteleras: newOpciones,
        destinos: newDestinos,
        opcionHoteles: newOpcionHoteles,
      };
    });
  } catch (error) {
    console.error("Error cloning paquete:", error);
    throw new Error("No se pudo clonar el paquete.");
  }
}

// ──────────────────────────────────────────────
// PaqueteAereo — Junction CRUD
// ──────────────────────────────────────────────

export async function assignAereo(data: {
  paqueteId: string;
  aereoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.create({ data });
  } catch (error) {
    console.error("Error assigning aereo:", error);
    throw new Error("No se pudo asignar el aéreo al paquete.");
  }
}

export async function removeAereo(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing aereo:", error);
    throw new Error("No se pudo quitar el aéreo del paquete.");
  }
}

export async function updateAereoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating aereo assignment:", error);
    throw new Error("No se pudo actualizar la asignación del aéreo.");
  }
}

// ──────────────────────────────────────────────
// PaqueteAlojamiento — Junction CRUD
// ──────────────────────────────────────────────

export async function assignAlojamiento(data: {
  paqueteId: string;
  alojamientoId: string;
  nochesEnEste?: number;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.create({ data });
  } catch (error) {
    console.error("Error assigning alojamiento:", error);
    throw new Error("No se pudo asignar el alojamiento al paquete.");
  }
}

export async function removeAlojamiento(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing alojamiento:", error);
    throw new Error("No se pudo quitar el alojamiento del paquete.");
  }
}

export async function updateAlojamientoAssignment(
  id: string,
  data: { nochesEnEste?: number; textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating alojamiento assignment:", error);
    throw new Error("No se pudo actualizar la asignación del alojamiento.");
  }
}

// ──────────────────────────────────────────────
// PaqueteTraslado — Junction CRUD
// ──────────────────────────────────────────────

export async function assignTraslado(data: {
  paqueteId: string;
  trasladoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.create({ data });
  } catch (error) {
    console.error("Error assigning traslado:", error);
    throw new Error("No se pudo asignar el traslado al paquete.");
  }
}

export async function removeTraslado(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing traslado:", error);
    throw new Error("No se pudo quitar el traslado del paquete.");
  }
}

export async function updateTrasladoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating traslado assignment:", error);
    throw new Error("No se pudo actualizar la asignación del traslado.");
  }
}

// ──────────────────────────────────────────────
// PaqueteSeguro — Junction CRUD
// ──────────────────────────────────────────────

export async function assignSeguro(data: {
  paqueteId: string;
  seguroId: string;
  diasCobertura?: number;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.create({ data });
  } catch (error) {
    console.error("Error assigning seguro:", error);
    throw new Error("No se pudo asignar el seguro al paquete.");
  }
}

export async function removeSeguro(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing seguro:", error);
    throw new Error("No se pudo quitar el seguro del paquete.");
  }
}

export async function updateSeguroAssignment(
  id: string,
  data: { diasCobertura?: number; textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating seguro assignment:", error);
    throw new Error("No se pudo actualizar la asignación del seguro.");
  }
}

// ──────────────────────────────────────────────
// PaqueteCircuito — Junction CRUD
// ──────────────────────────────────────────────

export async function assignCircuito(data: {
  paqueteId: string;
  circuitoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.create({ data });
  } catch (error) {
    console.error("Error assigning circuito:", error);
    throw new Error("No se pudo asignar el circuito al paquete.");
  }
}

export async function removeCircuito(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing circuito:", error);
    throw new Error("No se pudo quitar el circuito del paquete.");
  }
}

export async function updateCircuitoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating circuito assignment:", error);
    throw new Error("No se pudo actualizar la asignación del circuito.");
  }
}

// ──────────────────────────────────────────────
// PaqueteFoto — Photo CRUD
// ──────────────────────────────────────────────

export async function addPaqueteFoto(data: {
  paqueteId: string;
  url: string;
  alt: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.create({ data });
  } catch (error) {
    console.error("Error adding paquete foto:", error);
    throw new Error("No se pudo agregar la foto al paquete.");
  }
}

export async function removePaqueteFoto(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing paquete foto:", error);
    throw new Error("No se pudo eliminar la foto del paquete.");
  }
}

export async function updatePaqueteFoto(
  id: string,
  data: { url?: string; alt?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating paquete foto:", error);
    throw new Error("No se pudo actualizar la foto del paquete.");
  }
}

// ──────────────────────────────────────────────
// PaqueteEtiqueta — Etiqueta assignment
// ──────────────────────────────────────────────

export async function assignEtiqueta(data: {
  paqueteId: string;
  etiquetaId: string;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteEtiqueta.create({ data });
  } catch (error) {
    console.error("Error assigning etiqueta:", error);
    throw new Error("No se pudo asignar la etiqueta al paquete.");
  }
}

export async function removeEtiqueta(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteEtiqueta.delete({ where: { id } });
  } catch (error) {
    console.error("Error removing etiqueta:", error);
    throw new Error("No se pudo quitar la etiqueta del paquete.");
  }
}

// ──────────────────────────────────────────────
// OpcionHotelera — CRUD
// ──────────────────────────────────────────────

export async function createOpcionHotelera(data: {
  paqueteId: string;
  nombre: string;
  factor: number;
  precioVenta: number;
  orden?: number;
  proveedorId?: string | null;
}) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.create({ data });
  } catch (error) {
    console.error("Error creating opcion hotelera:", error);
    throw new Error("No se pudo crear la opción hotelera.");
  }
}

export async function updateOpcionHotelera(
  id: string,
  data: {
    nombre?: string;
    factor?: number;
    precioVenta?: number;
    orden?: number;
    proveedorId?: string | null;
  },
) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating opcion hotelera:", error);
    throw new Error("No se pudo actualizar la opción hotelera.");
  }
}

export async function deleteOpcionHotelera(id: string) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting opcion hotelera:", error);
    throw new Error("No se pudo eliminar la opción hotelera.");
  }
}

// ──────────────────────────────────────────────
// PaqueteDestino — itinerary row CRUD
// ──────────────────────────────────────────────

export async function createPaqueteDestino(data: {
  paqueteId: string;
  ciudadId: string;
  noches: number;
  orden?: number;
}) {
  try {
    await requireAuth();
    const schema = z.object({
      paqueteId: z.string().min(1),
      ciudadId: z.string().min(1),
      noches: z.number().int().min(0).max(365),
      orden: z.number().int().nonnegative().optional(),
    });
    const parsed = schema.parse(data);
    return await prisma.paqueteDestino.create({ data: parsed });
  } catch (error) {
    console.error("Error creating paquete destino:", error);
    throw new Error("No se pudo crear el destino del paquete.");
  }
}

export async function updatePaqueteDestino(
  id: string,
  data: { ciudadId?: string; noches?: number; orden?: number },
) {
  try {
    await requireAuth();
    return await prisma.paqueteDestino.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating paquete destino:", error);
    throw new Error("No se pudo actualizar el destino del paquete.");
  }
}

export async function deletePaqueteDestino(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteDestino.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting paquete destino:", error);
    throw new Error("No se pudo eliminar el destino del paquete.");
  }
}

/**
 * Reorder all destinos of a paquete at once. `orderedIds` is the full list of
 * destino ids in the new order. Missing ids are not touched. Runs in a single
 * transaction to avoid inconsistent partial states.
 */
export async function reorderPaqueteDestinos(
  paqueteId: string,
  orderedIds: string[],
) {
  try {
    await requireAuth();
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.paqueteDestino.update({
          where: { id },
          data: { orden: idx },
        }),
      ),
    );
  } catch (error) {
    console.error("Error reordering paquete destinos:", error);
    throw new Error("No se pudo reordenar los destinos.");
  }
}

// ──────────────────────────────────────────────
// OpcionHotel — per-destino hotel assignment CRUD
// ──────────────────────────────────────────────

export async function createOpcionHotel(data: {
  opcionHoteleraId: string;
  destinoId: string;
  alojamientoId: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.create({ data });
  } catch (error) {
    console.error("Error creating opcion hotel:", error);
    throw new Error("No se pudo asignar el hotel al destino.");
  }
}

export async function updateOpcionHotel(
  id: string,
  data: { alojamientoId?: string; orden?: number },
) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating opcion hotel:", error);
    throw new Error("No se pudo actualizar la asignación del hotel.");
  }
}

export async function deleteOpcionHotel(id: string) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting opcion hotel:", error);
    throw new Error("No se pudo eliminar la asignación del hotel.");
  }
}

/**
 * Upsert the hotel assigned to a (opcion, destino) pair. If no OpcionHotel
 * exists for that pair yet, it's created; otherwise the alojamientoId is
 * updated in place. This is the "single-click" handler used by the UI dropdown.
 */
export async function upsertOpcionHotelPrincipal(
  opcionHoteleraId: string,
  destinoId: string,
  alojamientoId: string,
) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.upsert({
      where: {
        opcionHoteleraId_destinoId: { opcionHoteleraId, destinoId },
      },
      create: { opcionHoteleraId, destinoId, alojamientoId, orden: 0 },
      update: { alojamientoId },
    });
  } catch (error) {
    console.error("Error upserting opcion hotel:", error);
    throw new Error("No se pudo asignar el hotel.");
  }
}
