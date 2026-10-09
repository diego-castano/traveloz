"use server";

// Especialistas de Traveloz Collection. Contrato { ok, data } | { ok, error }.
// Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { especialistaAVista } from "@/lib/collection/vista-servidor";
import type { EspecialistaVista } from "@/lib/collection/experiencia/contenido";

const ENTIDAD = "especialista";
const idSchema = z.string().min(1).max(40);

export interface EspecialistaItem extends EspecialistaVista {
  publicado: boolean;
  orden: number;
  userId: string | null;
  bio: string;
  /** Experiencias asignadas (todas, archivadas incluidas). */
  experiencias: number;
}

export async function listarEspecialistas(): Promise<Resultado<EspecialistaItem[]>> {
  return ejecutar("listarEspecialistas", async () => {
    await requireCollection("sitio.editar");
    const filas = await prisma.colEspecialista.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { retrato: true, _count: { select: { experiencias: true } } },
    });
    return filas.map((e) => ({
      ...especialistaAVista(e),
      publicado: e.publicado,
      orden: e.orden,
      userId: e.userId,
      bio: e.bio,
      experiencias: e._count.experiencias,
    }));
  });
}

export async function crearEspecialista(input: {
  nombre: string;
  userId?: string | null;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearEspecialista", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z
      .object({ nombre: z.string().trim().min(1, "Falta el nombre.").max(100), userId: idSchema.nullish() })
      .safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    if (p.data.userId) {
      const u = await prisma.user.findUnique({ where: { id: p.data.userId }, select: { id: true } });
      if (!u) fallar("No encontramos ese usuario.");
      const ya = await prisma.colEspecialista.findUnique({ where: { userId: p.data.userId }, select: { id: true } });
      if (ya) fallar("Ese usuario ya es especialista.");
    }
    const ultimo = await prisma.colEspecialista.aggregate({ _max: { orden: true } });
    const fila = await prisma.colEspecialista.create({
      data: { nombre: p.data.nombre, userId: p.data.userId ?? null, orden: (ultimo._max.orden ?? -1) + 1 },
      select: { id: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId, detalle: { nombre: p.data.nombre } });
    return fila;
  });
}

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre.").max(100),
  userId: idSchema.nullable(),
  region: z.string().trim().max(120),
  frase: z.string().trim().max(240),
  bio: z.string().trim().max(3000),
  idiomas: z.array(z.string().trim().min(1).max(40)).max(10),
  retratoId: idSchema.nullable(),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(160),
  telefono: z.string().trim().max(40),
  publicado: z.boolean(),
});

export async function actualizarEspecialista(
  id: string,
  input: z.input<typeof actualizarSchema>,
): Promise<Resultado<null>> {
  return ejecutar("actualizarEspecialista", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const d = p.data;
    if (d.email && !z.string().email().safeParse(d.email).success) fallar("El email no es válido.");

    const e = await prisma.colEspecialista.findUnique({ where: { id }, select: { id: true } });
    if (!e) fallar("No encontramos a ese especialista.");
    if (d.userId) {
      const u = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true } });
      if (!u) fallar("No encontramos ese usuario.");
      const ya = await prisma.colEspecialista.findFirst({ where: { userId: d.userId, id: { not: id } }, select: { id: true } });
      if (ya) fallar("Ese usuario ya es otro especialista.");
    }
    if (d.retratoId) {
      const m = await prisma.colMedio.findUnique({ where: { id: d.retratoId }, select: { id: true } });
      if (!m) fallar("El retrato elegido ya no existe.");
    }
    await prisma.colEspecialista.update({ where: { id }, data: d });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "editar", userId, detalle: { publicado: d.publicado } });
    return null;
  });
}

export async function reordenarEspecialistas(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarEspecialistas", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.array(idSchema).max(200).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      const id = p.data[orden];
      await prisma.colEspecialista.updateMany({ where: { id }, data: { orden } });
    }
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function eliminarEspecialista(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarEspecialista", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const e = await prisma.colEspecialista.findUnique({ where: { id }, select: { nombre: true } });
    if (!e) fallar("No encontramos a ese especialista.");
    const usos = await prisma.colExperiencia.count({ where: { especialistaId: id } });
    if (usos > 0) {
      fallar(`Tiene ${usos} experiencia${usos === 1 ? "" : "s"} a cargo. Despublicalo en vez de eliminarlo.`);
    }
    await prisma.colEspecialista.delete({ where: { id } });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "eliminar", userId, detalle: { nombre: e.nombre } });
    return null;
  });
}
