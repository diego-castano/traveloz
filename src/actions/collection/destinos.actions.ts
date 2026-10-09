"use server";

// Destinos de Traveloz Collection (Filipinas, Japón...). Contrato
// { ok, data } | { ok, error }. Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";
import { slugify } from "@/lib/utils";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { sanitizarHtml } from "@/lib/collection/sanitizar";
import { medioAVista } from "@/lib/collection/vista-servidor";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";

const ENTIDAD = "destino";
const ESTADOS_DESTINO = ["BORRADOR", "PUBLICADO", "PROXIMAMENTE", "ARCHIVADO"] as const;
export type EstadoDestino = (typeof ESTADOS_DESTINO)[number];

const idSchema = z.string().min(1).max(40);

export interface DestinoItem {
  id: string;
  slug: string;
  nombre: string;
  bajada: string;
  relato: string;
  portada: MedioVista | null;
  estado: EstadoDestino;
  orden: number;
  seoTitulo: string;
  seoDescripcion: string;
  paises: { id: string; nombre: string }[];
  /** Experiencias no archivadas. */
  experiencias: number;
}

export async function listarDestinos(): Promise<Resultado<DestinoItem[]>> {
  return ejecutar("listarDestinos", async () => {
    await requireCollection("experiencias.editar");
    const filas = await prisma.colDestino.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        portada: true,
        paises: { include: { pais: { select: { id: true, nombre: true } } } },
        experiencias: { select: { experiencia: { select: { estado: true } } } },
      },
    });
    return filas.map((d) => ({
      id: d.id,
      slug: d.slug,
      nombre: d.nombre,
      bajada: d.bajada,
      relato: d.relato,
      portada: d.portada ? medioAVista(d.portada) : null,
      estado: d.estado,
      orden: d.orden,
      seoTitulo: d.seoTitulo,
      seoDescripcion: d.seoDescripcion,
      paises: d.paises.map((p) => p.pais),
      experiencias: d.experiencias.filter((e) => e.experiencia.estado !== "ARCHIVADA").length,
    }));
  });
}

export async function listarPaisesCatalogo(): Promise<
  Resultado<{ id: string; nombre: string; regionNombre: string | null }[]>
> {
  return ejecutar("listarPaisesCatalogo", async () => {
    await requireCollection("experiencias.editar");
    const filas = await prisma.pais.findMany({
      where: { brandId: BRAND_ID },
      include: { region: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });
    return filas.map((p) => ({ id: p.id, nombre: p.nombre, regionNombre: p.region?.nombre ?? null }));
  });
}

async function slugLibre(base: string): Promise<string> {
  const raiz = base || "destino";
  let slug = raiz;
  for (let n = 2; await prisma.colDestino.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${raiz}-${n}`;
  }
  return slug;
}

export async function crearDestino(input: { nombre: string }): Promise<Resultado<{ id: string; slug: string }>> {
  return ejecutar("crearDestino", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const p = z.object({ nombre: z.string().trim().min(1, "Falta el nombre.").max(80) }).safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const slug = await slugLibre(slugify(p.data.nombre));
    const ultimo = await prisma.colDestino.aggregate({ _max: { orden: true } });
    const fila = await prisma.colDestino.create({
      data: { nombre: p.data.nombre, slug, orden: (ultimo._max.orden ?? -1) + 1 },
      select: { id: true, slug: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId, detalle: { nombre: p.data.nombre } });
    return fila;
  });
}

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre.").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Falta la dirección web.")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  bajada: z.string().trim().max(240),
  relato: z.string().max(8000),
  portadaId: idSchema.nullable(),
  estado: z.enum(ESTADOS_DESTINO),
  paisIds: z.array(idSchema).max(20),
  seoTitulo: z.string().trim().max(70),
  seoDescripcion: z.string().trim().max(170),
});

export async function actualizarDestino(
  id: string,
  input: z.input<typeof actualizarSchema>,
): Promise<Resultado<null>> {
  return ejecutar("actualizarDestino", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { paisIds, relato, ...resto } = p.data;

    const existe = await prisma.colDestino.findUnique({ where: { id }, select: { id: true } });
    if (!existe) fallar("No encontramos ese destino.");
    const otro = await prisma.colDestino.findFirst({ where: { slug: resto.slug, id: { not: id } }, select: { id: true } });
    if (otro) fallar("Esa dirección web ya la usa otro destino.");
    if (resto.portadaId) {
      const m = await prisma.colMedio.findUnique({ where: { id: resto.portadaId }, select: { id: true } });
      if (!m) fallar("La portada elegida ya no existe.");
    }
    const paises = await prisma.pais.findMany({
      where: { id: { in: Array.from(new Set(paisIds)) }, brandId: BRAND_ID },
      select: { id: true },
    });

    await prisma.colDestino.update({ where: { id }, data: { ...resto, relato: sanitizarHtml(relato) } });
    await prisma.colDestinoPais.deleteMany({ where: { destinoId: id } });
    if (paises.length) {
      await prisma.colDestinoPais.createMany({ data: paises.map((x) => ({ destinoId: id, paisId: x.id })) });
    }
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "editar", userId, detalle: { estado: resto.estado } });
    return null;
  });
}

export async function reordenarDestinos(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarDestinos", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const p = z.array(idSchema).max(200).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      const id = p.data[orden];
      await prisma.colDestino.updateMany({ where: { id }, data: { orden } });
    }
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function eliminarDestino(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarDestino", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const d = await prisma.colDestino.findUnique({ where: { id }, select: { nombre: true } });
    if (!d) fallar("No encontramos ese destino.");
    const usos = await prisma.colExperienciaDestino.count({ where: { destinoId: id } });
    if (usos > 0) {
      fallar(`Este destino tiene ${usos} experiencia${usos === 1 ? "" : "s"}. Archivalo en vez de eliminarlo.`);
    }
    await prisma.colDestino.delete({ where: { id } });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "eliminar", userId, detalle: { nombre: d.nombre } });
    return null;
  });
}
