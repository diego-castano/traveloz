"use server";

// Testimonios de Traveloz Collection. Contrato { ok, data } | { ok, error }.
// Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { invalidarSitio } from "@/lib/collection/sitio-datos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { testimonioVista } from "@/lib/collection/paginas-servidor";
import { medioAVista } from "@/lib/collection/vista-servidor";
import type { TestimonioVista } from "@/lib/collection/paginas/contenido";

const ENTIDAD = "testimonio";
const idSchema = z.string().min(1).max(40);

export interface TestimonioItem extends TestimonioVista {
  publicado: boolean;
  orden: number;
  experienciaId: string | null;
  fecha: string | null;
}

export async function listarTestimonios(): Promise<Resultado<TestimonioItem[]>> {
  return ejecutar("listarTestimonios", async () => {
    await requireCollection("panel");
    const filas = await prisma.colTestimonio.findMany({
      orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
      include: { foto: true },
    });
    return filas.map((t) => ({
      ...testimonioVista(t, new Map(t.foto ? [[t.foto.id, medioAVista(t.foto)]] : [])),
      publicado: t.publicado,
      orden: t.orden,
      experienciaId: t.experienciaId,
      fecha: t.fecha?.toISOString() ?? null,
    }));
  });
}

export async function crearTestimonio(input: { nombre: string }): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearTestimonio", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.object({ nombre: z.string().trim().min(1, "Falta el nombre.").max(100) }).safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const ultimo = await prisma.colTestimonio.aggregate({ _max: { orden: true } });
    const fila = await prisma.colTestimonio.create({
      data: { nombre: p.data.nombre, orden: (ultimo._max.orden ?? -1) + 1 },
      select: { id: true },
    });
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId, detalle: { nombre: p.data.nombre } });
    return fila;
  });
}

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre.").max(100),
  lugar: z.string().trim().max(120),
  viaje: z.string().trim().max(160),
  cita: z.string().trim().max(1200),
  fotoId: idSchema.nullable(),
  experienciaId: idSchema.nullable(),
  /** ISO o yyyy-mm-dd. */
  fecha: z.string().trim().max(40).nullable(),
  publicado: z.boolean(),
});

export async function actualizarTestimonio(
  id: string,
  input: z.input<typeof actualizarSchema>,
): Promise<Resultado<null>> {
  return ejecutar("actualizarTestimonio", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { fecha: fechaTxt, ...d } = p.data;
    let fecha: Date | null = null;
    if (fechaTxt) {
      fecha = new Date(fechaTxt);
      if (Number.isNaN(fecha.getTime())) fallar("La fecha no es válida.");
    }

    const t = await prisma.colTestimonio.findUnique({ where: { id }, select: { id: true } });
    if (!t) fallar("No encontramos ese testimonio.");
    if (d.fotoId) {
      const m = await prisma.colMedio.findUnique({ where: { id: d.fotoId }, select: { id: true } });
      if (!m) fallar("La foto elegida ya no existe.");
    }
    if (d.experienciaId) {
      const e = await prisma.colExperiencia.findUnique({ where: { id: d.experienciaId }, select: { id: true } });
      if (!e) fallar("La experiencia elegida ya no existe.");
    }
    await prisma.colTestimonio.update({ where: { id }, data: { ...d, fecha } });
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "editar", userId, detalle: { publicado: d.publicado } });
    return null;
  });
}

export async function reordenarTestimonios(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarTestimonios", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.array(idSchema).max(200).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      await prisma.colTestimonio.updateMany({ where: { id: p.data[orden] }, data: { orden } });
    }
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function eliminarTestimonio(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarTestimonio", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const t = await prisma.colTestimonio.findUnique({ where: { id }, select: { nombre: true } });
    if (!t) fallar("No encontramos ese testimonio.");
    await prisma.colTestimonio.delete({ where: { id } });
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "eliminar", userId, detalle: { nombre: t.nombre } });
    return null;
  });
}
