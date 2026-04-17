"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
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
    ] = await Promise.all([
      prisma.paqueteAereo.findMany({ where: paqueteFilter }),
      prisma.paqueteAlojamiento.findMany({ where: paqueteFilter }),
      prisma.paqueteTraslado.findMany({ where: paqueteFilter }),
      prisma.paqueteSeguro.findMany({ where: paqueteFilter }),
      prisma.paqueteCircuito.findMany({ where: paqueteFilter }),
      prisma.paqueteFoto.findMany({ where: paqueteFilter }),
      prisma.paqueteEtiqueta.findMany({ where: paqueteFilter }),
      prisma.opcionHotelera.findMany({ where: paqueteFilter }),
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
          noches: source.noches,
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
      ] = await Promise.all([
        tx.paqueteAereo.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteAlojamiento.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteTraslado.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteSeguro.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteCircuito.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteFoto.findMany({ where: { paqueteId: sourceId } }),
        tx.paqueteEtiqueta.findMany({ where: { paqueteId: sourceId } }),
        tx.opcionHotelera.findMany({ where: { paqueteId: sourceId } }),
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
            nochesEnEste: a.nochesEnEste,
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

      if (sourceOpciones.length > 0) {
        await tx.opcionHotelera.createMany({
          data: sourceOpciones.map((o) => ({
            paqueteId: newPaquete.id,
            nombre: o.nombre,
            alojamientoIds: o.alojamientoIds,
            factor: o.factor,
            precioVenta: o.precioVenta,
            orden: o.orden,
          })),
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
      ] = await Promise.all([
        tx.paqueteAereo.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteAlojamiento.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteTraslado.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteSeguro.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteCircuito.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteFoto.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteEtiqueta.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.opcionHotelera.findMany({ where: { paqueteId: newPaquete.id } }),
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
  alojamientoIds: string[];
  nochesPorAlojamiento?: Record<string, number> | null;
  factor: number;
  precioVenta: number;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.create({
      data: {
        ...data,
        nochesPorAlojamiento: data.nochesPorAlojamiento ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("Error creating opcion hotelera:", error);
    throw new Error("No se pudo crear la opción hotelera.");
  }
}

export async function updateOpcionHotelera(
  id: string,
  data: {
    nombre?: string;
    alojamientoIds?: string[];
    nochesPorAlojamiento?: Record<string, number> | null;
    factor?: number;
    precioVenta?: number;
    orden?: number;
  }
) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.update({
      where: { id },
      data: {
        ...data,
        nochesPorAlojamiento:
          data.nochesPorAlojamiento === undefined
            ? undefined
            : data.nochesPorAlojamiento === null
              ? Prisma.DbNull
              : data.nochesPorAlojamiento,
      },
    });
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
