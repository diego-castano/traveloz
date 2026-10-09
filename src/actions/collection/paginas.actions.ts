"use server";

// Páginas fijas de Traveloz Collection (Inicio, Nosotros, legales). Contrato
// { ok, data } | { ok, error }. Mismo esquema que las experiencias: `revision`
// para el choque de versiones (la respuesta trae `conflicto: true`) y la foto
// `publicado` que lee el sitio. Sin prisma.$transaction (pgbouncer).

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ConflictoDeVersion, ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { sanitizarBloques } from "@/lib/collection/sanitizar";
import { cargarMapasPagina } from "@/lib/collection/paginas-servidor";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  contenidoPaginaSchema,
  leerContenidoPagina,
  mediosDePagina,
  PAGINAS,
  type ContenidoPagina,
  type MapasPagina,
} from "@/lib/collection/paginas/contenido";

const MSG_CONFLICTO = "Alguien más guardó cambios en esta página. Recargá para ver la última versión.";
const MSG_NO_EXISTE = "No encontramos esa página.";
const ENTIDAD = "pagina";

function infoPagina(slug: string) {
  const info = PAGINAS.find((p) => p.slug === slug);
  if (!info) fallar(MSG_NO_EXISTE);
  return info;
}

// ── Listado ────────────────────────────────────────────────────────────────

export interface PaginaItem {
  slug: string;
  titulo: string;
  ruta: string;
  hayCambiosSinPublicar: boolean;
  publicadaEn: string | null;
  updatedAt: string;
  bloques: number;
}

export async function listarPaginas(): Promise<Resultado<PaginaItem[]>> {
  return ejecutar("listarPaginas", async () => {
    await requireCollection("panel");
    const filas = await prisma.colPagina.findMany();
    return PAGINAS.flatMap((info) => {
      const f = filas.find((x) => x.slug === info.slug);
      if (!f) return [];
      return [
        {
          slug: info.slug,
          titulo: info.titulo,
          ruta: info.ruta,
          hayCambiosSinPublicar: f.revision !== f.publicadoRevision,
          publicadaEn: f.publicadaEn?.toISOString() ?? null,
          updatedAt: f.updatedAt.toISOString(),
          bloques: leerContenidoPagina(f.contenido).bloques.length,
        },
      ];
    });
  });
}

// ── Obtener ────────────────────────────────────────────────────────────────

/** `MapasPagina` en formato serializable: el Map de medios va como arreglo. */
export type MapasPaginaSerial = Omit<MapasPagina, "medios"> & { medios: MedioVista[] };

export interface PaginaDetalle {
  slug: string;
  titulo: string;
  revision: number;
  publicadoRevision: number | null;
  publicadaEn: string | null;
  contenido: ContenidoPagina;
  mapas: MapasPaginaSerial;
}

export async function obtenerPagina(slug: string): Promise<Resultado<PaginaDetalle>> {
  return ejecutar("obtenerPagina", async () => {
    await requireCollection("panel");
    infoPagina(slug);
    const fila = await prisma.colPagina.findUnique({ where: { slug } });
    if (!fila) fallar(MSG_NO_EXISTE);
    const contenido = leerContenidoPagina(fila.contenido);
    const mapas = await cargarMapasPagina({ mediosExtra: mediosDePagina(contenido) });
    return {
      slug: fila.slug,
      titulo: fila.titulo,
      revision: fila.revision,
      publicadoRevision: fila.publicadoRevision,
      publicadaEn: fila.publicadaEn?.toISOString() ?? null,
      contenido,
      mapas: { ...mapas, medios: Array.from(mapas.medios.values()) },
    };
  });
}

// ── Guardar / publicar ─────────────────────────────────────────────────────

const guardarSchema = z.object({
  revision: z.number().int().min(0),
  contenido: contenidoPaginaSchema,
});

export async function guardarPagina(
  slug: string,
  input: { revision: number; contenido: ContenidoPagina },
): Promise<Resultado<{ revision: number }>> {
  return ejecutar("guardarPagina", async () => {
    const { userId } = await requireCollection("sitio.editar");
    infoPagina(slug);
    const p = guardarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { revision } = p.data;
    const contenido = sanitizarBloques(p.data.contenido);

    const { count } = await prisma.colPagina.updateMany({
      where: { slug, revision },
      data: {
        contenido: contenido as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
        actualizadaPorId: userId,
      },
    });
    if (count === 0) {
      const existe = await prisma.colPagina.findUnique({ where: { slug }, select: { slug: true } });
      if (!existe) fallar(MSG_NO_EXISTE);
      throw new ConflictoDeVersion(MSG_CONFLICTO);
    }

    // Una entrada de historial por persona cada 15 minutos, no una por autoguardado.
    const reciente = await prisma.colEvento.findFirst({
      where: {
        entidad: ENTIDAD,
        entidadId: slug,
        accion: "guardar",
        userId,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (!reciente) {
      await registrarEventoCol({ entidad: ENTIDAD, entidadId: slug, accion: "guardar", userId, detalle: { revision: revision + 1 } });
    }
    return { revision: revision + 1 };
  });
}

export async function publicarPagina(slug: string): Promise<Resultado<{ publicadaEn: string }>> {
  return ejecutar("publicarPagina", async () => {
    const { userId } = await requireCollection("sitio.editar");
    infoPagina(slug);
    const fila = await prisma.colPagina.findUnique({ where: { slug } });
    if (!fila) fallar(MSG_NO_EXISTE);
    const contenido = leerContenidoPagina(fila.contenido);
    const ahora = new Date();
    // `revision` en el where: si alguien guardó en el medio, la foto publicada
    // no coincidiría con lo que se vio.
    const { count } = await prisma.colPagina.updateMany({
      where: { slug, revision: fila.revision },
      data: {
        publicado: contenido as unknown as Prisma.InputJsonValue,
        publicadoRevision: fila.revision,
        publicadaEn: ahora,
      },
    });
    if (count === 0) throw new ConflictoDeVersion(MSG_CONFLICTO);
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: slug, accion: "publicar", userId, detalle: { revision: fila.revision } });
    return { publicadaEn: ahora.toISOString() };
  });
}
