"use server";

// Aliados de Traveloz Collection (logos y descripciones del sitio). Contrato
// { ok, data } | { ok, error }. Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { invalidarSitio } from "@/lib/collection/sitio-datos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { aliadoVista } from "@/lib/collection/paginas-servidor";
import { medioAVista } from "@/lib/collection/vista-servidor";
import type { AliadoVista } from "@/lib/collection/paginas/contenido";

const ENTIDAD = "aliado";
const idSchema = z.string().min(1).max(40);

export interface AliadoItem extends AliadoVista {
  publicado: boolean;
  orden: number;
  /** Interno, nunca público. */
  proveedorId: string | null;
}

export async function listarAliados(): Promise<Resultado<AliadoItem[]>> {
  return ejecutar("listarAliados", async () => {
    await requireCollection("panel");
    const filas = await prisma.colAliado.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { logo: true },
    });
    return filas.map((a) => ({
      ...aliadoVista(a, new Map(a.logo ? [[a.logo.id, medioAVista(a.logo)]] : [])),
      publicado: a.publicado,
      orden: a.orden,
      proveedorId: a.proveedorId,
    }));
  });
}

export async function crearAliado(input: { nombre: string }): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearAliado", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.object({ nombre: z.string().trim().min(1, "Falta el nombre.").max(100) }).safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const ultimo = await prisma.colAliado.aggregate({ _max: { orden: true } });
    const fila = await prisma.colAliado.create({
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
  tipo: z.string().trim().max(60),
  descripcion: z.string().trim().max(400),
  url: z.string().trim().max(300),
  logoId: idSchema.nullable(),
  proveedorId: idSchema.nullable(),
  publicado: z.boolean(),
});

export async function actualizarAliado(
  id: string,
  input: z.input<typeof actualizarSchema>,
): Promise<Resultado<null>> {
  return ejecutar("actualizarAliado", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const d = p.data;
    if (d.url && !/^https?:\/\//i.test(d.url)) fallar("La dirección web debe empezar con http:// o https://.");

    const a = await prisma.colAliado.findUnique({ where: { id }, select: { id: true } });
    if (!a) fallar("No encontramos a ese aliado.");
    if (d.logoId) {
      const m = await prisma.colMedio.findUnique({ where: { id: d.logoId }, select: { id: true } });
      if (!m) fallar("El logo elegido ya no existe.");
    }
    if (d.proveedorId) {
      const pr = await prisma.proveedor.findUnique({ where: { id: d.proveedorId }, select: { id: true } });
      if (!pr) fallar("El proveedor elegido ya no existe.");
    }
    await prisma.colAliado.update({ where: { id }, data: d });
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "editar", userId, detalle: { publicado: d.publicado } });
    return null;
  });
}

export async function reordenarAliados(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarAliados", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = z.array(idSchema).max(200).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      await prisma.colAliado.updateMany({ where: { id: p.data[orden] }, data: { orden } });
    }
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function eliminarAliado(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarAliado", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const a = await prisma.colAliado.findUnique({ where: { id }, select: { nombre: true } });
    if (!a) fallar("No encontramos a ese aliado.");
    await prisma.colAliado.delete({ where: { id } });
    invalidarSitio();
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "eliminar", userId, detalle: { nombre: a.nombre } });
    return null;
  });
}
