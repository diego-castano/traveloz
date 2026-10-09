"use server";

// Preguntas frecuentes de Traveloz Collection. Contrato { ok, data } | { ok, error }.
// Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { sanitizarHtml } from "@/lib/collection/sanitizar";
import { preguntaVista } from "@/lib/collection/paginas-servidor";
import type { PreguntaVista } from "@/lib/collection/paginas/contenido";

const ENTIDAD = "pregunta";
const idSchema = z.string().min(1).max(40);
const categoriaSchema = z.string().trim().min(1, "Falta la categoría.").max(60);

export interface PreguntaItem extends PreguntaVista {
  publicada: boolean;
  orden: number;
}

export async function listarPreguntas(): Promise<Resultado<PreguntaItem[]>> {
  return ejecutar("listarPreguntas", async () => {
    await requireCollection("panel");
    const filas = await prisma.colPregunta.findMany({ orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
    return filas.map((f) => ({ ...preguntaVista(f), publicada: f.publicada, orden: f.orden }));
  });
}

export async function crearPregunta(input: { pregunta: string; categoria?: string }): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearPregunta", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z
      .object({ pregunta: z.string().trim().min(1, "Falta la pregunta.").max(300), categoria: categoriaSchema.optional() })
      .safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const ultimo = await prisma.colPregunta.aggregate({ _max: { orden: true } });
    const fila = await prisma.colPregunta.create({
      data: { pregunta: p.data.pregunta, categoria: p.data.categoria ?? "General", orden: (ultimo._max.orden ?? -1) + 1 },
      select: { id: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId });
    return fila;
  });
}

const actualizarSchema = z.object({
  pregunta: z.string().trim().min(1, "Falta la pregunta.").max(300),
  respuesta: z.string().max(6000),
  categoria: categoriaSchema,
  publicada: z.boolean(),
});

export async function actualizarPregunta(
  id: string,
  input: z.input<typeof actualizarSchema>,
): Promise<Resultado<null>> {
  return ejecutar("actualizarPregunta", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const f = await prisma.colPregunta.findUnique({ where: { id }, select: { id: true } });
    if (!f) fallar("No encontramos esa pregunta.");
    await prisma.colPregunta.update({ where: { id }, data: { ...p.data, respuesta: sanitizarHtml(p.data.respuesta) } });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "editar", userId, detalle: { publicada: p.data.publicada } });
    return null;
  });
}

export async function reordenarPreguntas(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarPreguntas", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.array(idSchema).max(500).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      await prisma.colPregunta.updateMany({ where: { id: p.data[orden] }, data: { orden } });
    }
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function eliminarPregunta(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarPregunta", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const f = await prisma.colPregunta.findUnique({ where: { id }, select: { id: true } });
    if (!f) fallar("No encontramos esa pregunta.");
    await prisma.colPregunta.delete({ where: { id } });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "eliminar", userId });
    return null;
  });
}

/** Categorías en uso, más "General" siempre disponible. */
export async function listarCategorias(): Promise<Resultado<string[]>> {
  return ejecutar("listarCategorias", async () => {
    await requireCollection("panel");
    const filas = await prisma.colPregunta.findMany({ distinct: ["categoria"], select: { categoria: true }, orderBy: { categoria: "asc" } });
    const set = new Set(filas.map((f) => f.categoria));
    set.add("General");
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  });
}
