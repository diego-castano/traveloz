"use server";

// Journal (artículos) de Traveloz Collection. Contrato { ok, data } | { ok, error }.
// Mismo esquema que las experiencias: `revision` para el choque de versiones
// (la respuesta trae `conflicto: true`) y la foto `publicado` que lee el sitio.
// Sin prisma.$transaction (pgbouncer): las escrituras van de a una.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { invalidarSitio } from "@/lib/collection/sitio-datos";
import { ConflictoDeVersion, ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { sanitizarHtml } from "@/lib/collection/sanitizar";
import { cargarMapasPagina, type FotoArticulo } from "@/lib/collection/paginas-servidor";
import { especialistaAVista, medioAVista } from "@/lib/collection/vista-servidor";
import { textoPlano, type EspecialistaVista, type MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  contenidoArticuloSchema,
  leerContenidoArticulo,
  minutosDeLectura,
  TIPOS_ARTICULO,
  type ArticuloCardVista,
  type ContenidoArticulo,
  type ExperienciaCardVista,
  type TipoArticulo,
} from "@/lib/collection/paginas/contenido";

const MSG_CONFLICTO = "Alguien más guardó cambios en este artículo. Recargá para ver la última versión.";
const MSG_NO_EXISTE = "No encontramos ese artículo.";
const ENTIDAD = "articulo";
const MSG_SLUG = "Esa dirección web ya la usa otro artículo.";

type EstadoArticulo = "BORRADOR" | "PUBLICADO" | "ARCHIVADO";

// ── Listado ────────────────────────────────────────────────────────────────

export interface ArticuloItem extends ArticuloCardVista {
  estado: EstadoArticulo;
  hayCambiosSinPublicar: boolean;
  updatedAt: string;
}

export async function listarArticulos(): Promise<Resultado<ArticuloItem[]>> {
  return ejecutar("listarArticulos", async () => {
    await requireCollection("panel");
    const filas = await prisma.colArticulo.findMany({
      where: { estado: { not: "ARCHIVADO" } },
      orderBy: { updatedAt: "desc" },
      include: { portada: true },
    });
    return filas.map((f) => ({
      id: f.id,
      slug: f.slug ?? "",
      tipo: f.tipo,
      titulo: f.titulo,
      bajada: f.bajada,
      minutos: f.minutos,
      portada: f.portada ? medioAVista(f.portada) : null,
      publicadoEn: f.publicadoEn?.toISOString() ?? null,
      estado: f.estado,
      hayCambiosSinPublicar: f.estado === "PUBLICADO" && f.revision !== f.publicadoRevision,
      updatedAt: f.updatedAt.toISOString(),
    }));
  });
}

// ── Crear / obtener ────────────────────────────────────────────────────────

export async function crearArticulo(): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearArticulo", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const fila = await prisma.colArticulo.create({
      data: { creadaPorId: userId, actualizadaPorId: userId },
      select: { id: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId });
    return { id: fila.id };
  });
}

const camposSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Solo minúsculas, números y guiones."),
  tipo: z.enum(TIPOS_ARTICULO),
  titulo: z.string().trim().max(140),
  bajada: z.string().trim().max(240),
  portadaId: z.string().max(40).nullable(),
  autorId: z.string().max(40).nullable(),
  seoTitulo: z.string().trim().max(70),
  seoDescripcion: z.string().trim().max(170),
  experienciaIds: z.array(z.string().max(40)).max(6),
});
export type CamposArticulo = z.infer<typeof camposSchema>;

export interface ArticuloDetalle {
  id: string;
  estado: EstadoArticulo;
  revision: number;
  publicadoRevision: number | null;
  publicadoEn: string | null;
  campos: CamposArticulo;
  contenido: ContenidoArticulo;
  /** Medios que usa el artículo (portada y galería). */
  medios: MedioVista[];
  especialistas: EspecialistaVista[];
  /** Experiencias publicadas que se pueden vincular. */
  experiencias: ExperienciaCardVista[];
}

export async function obtenerArticulo(id: string): Promise<Resultado<ArticuloDetalle>> {
  return ejecutar("obtenerArticulo", async () => {
    await requireCollection("panel");
    const fila = await prisma.colArticulo.findUnique({
      where: { id },
      include: { experiencias: { orderBy: { orden: "asc" } } },
    });
    if (!fila) fallar(MSG_NO_EXISTE);
    const contenido = leerContenidoArticulo(fila.contenido);
    const usados = new Set<string>(contenido.galeria.map((g) => g.medioId));
    if (fila.portadaId) usados.add(fila.portadaId);

    const [mapas, especialistas] = await Promise.all([
      cargarMapasPagina({ mediosExtra: Array.from(usados) }),
      prisma.colEspecialista.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }], include: { retrato: true } }),
    ]);

    return {
      id: fila.id,
      estado: fila.estado,
      revision: fila.revision,
      publicadoRevision: fila.publicadoRevision,
      publicadoEn: fila.publicadoEn?.toISOString() ?? null,
      campos: {
        slug: fila.slug ?? "",
        tipo: fila.tipo,
        titulo: fila.titulo,
        bajada: fila.bajada,
        portadaId: fila.portadaId,
        autorId: fila.autorId,
        seoTitulo: fila.seoTitulo,
        seoDescripcion: fila.seoDescripcion,
        experienciaIds: fila.experiencias.map((e) => e.experienciaId),
      },
      contenido,
      medios: Array.from(usados).flatMap((m) => {
        const v = mapas.medios.get(m);
        return v ? [v] : [];
      }),
      especialistas: especialistas.map(especialistaAVista),
      experiencias: mapas.experiencias.map(({ destacada: _d, ...e }) => e),
    };
  });
}

// ── Guardar ────────────────────────────────────────────────────────────────

const guardarSchema = z.object({
  revision: z.number().int().min(0),
  campos: camposSchema,
  contenido: contenidoArticuloSchema,
});

export async function guardarArticulo(
  id: string,
  input: { revision: number; campos: CamposArticulo; contenido: ContenidoArticulo },
): Promise<Resultado<{ revision: number }>> {
  return ejecutar("guardarArticulo", async () => {
    const { userId } = await requireCollection("sitio.editar");
    const p = guardarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { revision, campos } = p.data;
    const contenido: ContenidoArticulo = { ...p.data.contenido, cuerpo: sanitizarHtml(p.data.contenido.cuerpo) };
    const slug = campos.slug === "" ? null : campos.slug;

    if (slug) {
      const otro = await prisma.colArticulo.findFirst({ where: { slug, id: { not: id } }, select: { id: true } });
      if (otro) fallar(MSG_SLUG);
    }

    // Solo ids que existen: una experiencia borrada no tumba el guardado.
    const pedidas = Array.from(new Set(campos.experienciaIds));
    const ok = await prisma.colExperiencia.findMany({ where: { id: { in: pedidas } }, select: { id: true } });
    const validas = new Set(ok.map((e) => e.id));
    const experienciaIds = pedidas.filter((e) => validas.has(e));

    let count: number;
    try {
      ({ count } = await prisma.colArticulo.updateMany({
        where: { id, revision },
        data: {
          slug,
          tipo: campos.tipo,
          titulo: campos.titulo,
          bajada: campos.bajada,
          portadaId: campos.portadaId,
          autorId: campos.autorId,
          seoTitulo: campos.seoTitulo,
          seoDescripcion: campos.seoDescripcion,
          contenido: contenido as unknown as Prisma.InputJsonValue,
          minutos: minutosDeLectura(contenido.cuerpo),
          revision: { increment: 1 },
          actualizadaPorId: userId,
        },
      }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") fallar(MSG_SLUG);
        if (err.code === "P2003") fallar("Algo de lo elegido (foto o autor) ya no existe. Recargá la página.");
      }
      throw err;
    }

    if (count === 0) {
      const existe = await prisma.colArticulo.findUnique({ where: { id }, select: { id: true } });
      if (!existe) fallar(MSG_NO_EXISTE);
      throw new ConflictoDeVersion(MSG_CONFLICTO);
    }

    await prisma.colArticuloExperiencia.deleteMany({ where: { articuloId: id } });
    if (experienciaIds.length) {
      await prisma.colArticuloExperiencia.createMany({
        data: experienciaIds.map((experienciaId, orden) => ({ articuloId: id, experienciaId, orden })),
      });
    }

    // Una entrada de historial por persona cada 15 minutos, no una por autoguardado.
    const reciente = await prisma.colEvento.findFirst({
      where: {
        entidad: ENTIDAD,
        entidadId: id,
        accion: "guardar",
        userId,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (!reciente) {
      await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "guardar", userId, detalle: { revision: revision + 1 } });
    }
    return { revision: revision + 1 };
  });
}

// ── Estados ────────────────────────────────────────────────────────────────

const ACCIONES = ["publicar", "despublicar", "archivar", "volver-borrador"] as const;
export type AccionArticulo = (typeof ACCIONES)[number];

export async function cambiarEstadoArticulo(
  id: string,
  accion: AccionArticulo,
): Promise<Resultado<{ estado: EstadoArticulo }>> {
  return ejecutar("cambiarEstadoArticulo", async () => {
    if (!ACCIONES.includes(accion)) fallar("Acción inválida.");
    const { userId } = await requireCollection("sitio.editar");

    const fila = await prisma.colArticulo.findUnique({ where: { id }, include: { experiencias: true } });
    if (!fila) fallar(MSG_NO_EXISTE);
    const actual = fila.estado;
    let data: Prisma.ColArticuloUpdateManyMutationInput;
    let nuevo: EstadoArticulo;

    switch (accion) {
      case "publicar": {
        if (actual === "ARCHIVADO") fallar("Un artículo archivado vuelve primero a borrador.");
        const contenido = leerContenidoArticulo(fila.contenido);
        const faltan: string[] = [];
        if (fila.titulo.trim().length < 4) faltan.push("título (mínimo 4 caracteres)");
        if (!fila.slug) faltan.push("dirección web (slug)");
        if (!fila.portadaId) faltan.push("portada");
        if (textoPlano(contenido.cuerpo).length < 300) faltan.push("cuerpo (mínimo 300 caracteres)");
        if (fila.seoTitulo.trim().length < 10) faltan.push("título para buscadores (mínimo 10 caracteres)");
        if (fila.seoDescripcion.trim().length < 50) faltan.push("descripción para buscadores (mínimo 50 caracteres)");
        if (faltan.length) fallar(`Faltan datos para publicar: ${faltan.join(", ")}.`);

        const foto: FotoArticulo = {
          campos: {
            slug: fila.slug!,
            tipo: fila.tipo as TipoArticulo,
            titulo: fila.titulo,
            bajada: fila.bajada,
            portadaId: fila.portadaId,
            autorId: fila.autorId,
            seoTitulo: fila.seoTitulo,
            seoDescripcion: fila.seoDescripcion,
            experienciaIds: [...fila.experiencias].sort((a, b) => a.orden - b.orden).map((e) => e.experienciaId),
          },
          contenido,
          minutos: fila.minutos,
        };
        nuevo = "PUBLICADO";
        data = {
          estado: nuevo,
          publicado: foto as unknown as Prisma.InputJsonValue,
          publicadoRevision: fila.revision,
          publicadoEn: fila.publicadoEn ?? new Date(),
        };
        break;
      }
      case "despublicar":
        if (actual !== "PUBLICADO") fallar("Solo un artículo publicado se puede despublicar.");
        nuevo = "BORRADOR";
        data = { estado: nuevo, publicado: Prisma.DbNull, publicadoRevision: null };
        break;
      case "archivar":
        if (actual === "ARCHIVADO") fallar("Ya está archivado.");
        nuevo = "ARCHIVADO";
        data = { estado: nuevo, publicado: Prisma.DbNull, publicadoRevision: null };
        break;
      case "volver-borrador":
        if (actual !== "ARCHIVADO") fallar("Ese artículo no se puede volver a borrador desde su estado actual.");
        nuevo = "BORRADOR";
        data = { estado: nuevo };
        break;
    }

    // `revision` en el where: si alguien guardó en el medio, la foto publicada
    // no coincidiría con lo que se validó.
    const { count } = await prisma.colArticulo.updateMany({ where: { id, revision: fila.revision }, data });
    if (count === 0) throw new ConflictoDeVersion(MSG_CONFLICTO);

    invalidarSitio();
    await registrarEventoCol({
      entidad: ENTIDAD,
      entidadId: id,
      accion: accion === "publicar" && actual === "PUBLICADO" ? "publicar-cambios" : accion,
      userId,
      detalle: { de: actual, a: nuevo },
    });
    return { estado: nuevo };
  });
}
