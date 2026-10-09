"use server";

// Experiencias de Traveloz Collection. Contrato { ok, data } | { ok, error }.
// Conflicto de versión al guardar: la respuesta trae `conflicto: true` además
// del `error` (ver `Resultado` en lib/collection/ejecutar.ts).
// Sin prisma.$transaction (pgbouncer): las escrituras van de a una.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";
import { fallar } from "@/lib/presupuesto/acceso";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ConflictoDeVersion, ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { sanitizarContenido } from "@/lib/collection/sanitizar";
import {
  borradorDeFila,
  cargarMapasVista,
  fotosDeAlojamientos,
  medioAVista,
} from "@/lib/collection/vista-servidor";
import {
  camposExperienciaSchema,
  contenidoExperienciaSchema,
  ESTADOS_EXPERIENCIA,
  nochesTotales,
  puedePublicar,
  requisitos,
  type BorradorExperiencia,
  type EspecialistaVista,
  type EstadoExperiencia,
  type FotoCatalogo,
  type MedioVista,
  type TipoExperiencia,
} from "@/lib/collection/experiencia/contenido";

const MSG_CONFLICTO = "Alguien más guardó cambios en esta experiencia. Recargá para ver la última versión.";
const MSG_NO_EXISTE = "No encontramos esa experiencia.";
const ENTIDAD = "experiencia";

const idSchema = z.string().min(1).max(40);

// ── Listado ────────────────────────────────────────────────────────────────

export interface ExperienciaItem {
  id: string;
  titulo: string;
  slug: string | null;
  tipo: TipoExperiencia;
  estado: EstadoExperiencia;
  destacada: boolean;
  orden: number;
  portada: MedioVista | null;
  noches: number;
  destinos: { id: string; nombre: string }[];
  especialista: string | null;
  /** 0..1: requisitos obligatorios cumplidos sobre obligatorios. */
  completitud: number;
  hayCambiosSinPublicar: boolean;
  updatedAt: string;
}

export async function listarExperiencias(
  input: { estado?: EstadoExperiencia; q?: string } = {},
): Promise<Resultado<ExperienciaItem[]>> {
  return ejecutar("listarExperiencias", async () => {
    await requireCollection("panel");
    const p = z
      .object({ estado: z.enum(ESTADOS_EXPERIENCIA).optional(), q: z.string().trim().max(100).optional() })
      .safeParse(input);
    if (!p.success) fallar("Filtro inválido.");
    const { estado, q } = p.data;

    const filas = await prisma.colExperiencia.findMany({
      where: {
        estado: estado ?? { not: "ARCHIVADA" },
        ...(q
          ? {
              OR: [
                { titulo: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ orden: "asc" }, { updatedAt: "desc" }],
      include: {
        portada: true,
        especialista: { select: { nombre: true } },
        destinos: { include: { destino: { select: { id: true, nombre: true } } }, orderBy: { orden: "asc" } },
      },
    });

    return filas.map((f) => {
      const req = requisitos(borradorDeFila(f)).filter((r) => r.obligatorio);
      return {
        id: f.id,
        titulo: f.titulo,
        slug: f.slug,
        tipo: f.tipo,
        estado: f.estado,
        destacada: f.destacada,
        orden: f.orden,
        portada: f.portada ? medioAVista(f.portada) : null,
        noches: f.noches,
        destinos: f.destinos.map((d) => d.destino),
        especialista: f.especialista?.nombre ?? null,
        completitud: req.length ? req.filter((r) => r.ok).length / req.length : 1,
        hayCambiosSinPublicar: f.estado === "PUBLICADA" && f.revision !== f.publicadoRevision,
        updatedAt: f.updatedAt.toISOString(),
      };
    });
  });
}

// ── Crear / obtener ────────────────────────────────────────────────────────

export async function crearExperiencia(): Promise<Resultado<{ id: string }>> {
  return ejecutar("crearExperiencia", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const fila = await prisma.colExperiencia.create({
      data: { creadaPorId: userId, actualizadaPorId: userId },
      select: { id: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: fila.id, accion: "crear", userId });
    return { id: fila.id };
  });
}

export interface ExperienciaDetalle {
  id: string;
  estado: EstadoExperiencia;
  revision: number;
  publicadoRevision: number | null;
  publicadaEn: string | null;
  borrador: BorradorExperiencia;
  mapas: {
    medios: MedioVista[];
    destinos: { id: string; nombre: string; slug: string; estado: string }[];
    especialistas: EspecialistaVista[];
    fotosHotel: [string, FotoCatalogo[]][];
  };
  historial: { id: string; accion: string; userNombre: string | null; detalle: unknown; createdAt: string }[];
}

export async function obtenerExperiencia(id: string): Promise<Resultado<ExperienciaDetalle>> {
  return ejecutar("obtenerExperiencia", async () => {
    await requireCollection("panel");
    const fila = await prisma.colExperiencia.findUnique({ where: { id }, include: { destinos: true } });
    if (!fila) fallar(MSG_NO_EXISTE);
    const borrador = borradorDeFila(fila);

    const [mapas, destinosOpc, eventos] = await Promise.all([
      cargarMapasVista([borrador], { todos: true }),
      prisma.colDestino.findMany({
        where: { OR: [{ estado: { not: "ARCHIVADO" } }, { id: { in: borrador.campos.destinoIds } }] },
        select: { id: true, nombre: true, slug: true, estado: true },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      }),
      prisma.colEvento.findMany({
        where: { entidad: ENTIDAD, entidadId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const userIds = Array.from(new Set(eventos.map((e) => e.userId).filter((u): u is string => !!u)));
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const nombre = new Map(users.map((u) => [u.id, u.name]));

    return {
      id: fila.id,
      estado: fila.estado,
      revision: fila.revision,
      publicadoRevision: fila.publicadoRevision,
      publicadaEn: fila.publicadaEn?.toISOString() ?? null,
      borrador,
      mapas: {
        medios: Array.from(mapas.medios.values()),
        destinos: destinosOpc,
        especialistas: Array.from(mapas.especialistas.values()),
        fotosHotel: Array.from(mapas.fotosHotel.entries()),
      },
      historial: eventos.map((e) => ({
        id: e.id,
        accion: e.accion,
        userNombre: e.userId ? nombre.get(e.userId) ?? null : null,
        detalle: e.detalle,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });
}

// ── Guardar ────────────────────────────────────────────────────────────────

const guardarSchema = z.object({
  revision: z.number().int().min(0),
  borrador: z.object({ campos: camposExperienciaSchema, contenido: contenidoExperienciaSchema }),
});

export async function guardarExperiencia(
  id: string,
  input: { revision: number; borrador: BorradorExperiencia },
): Promise<Resultado<{ revision: number }>> {
  return ejecutar("guardarExperiencia", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const p = guardarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { revision } = p.data;
    const { campos } = p.data.borrador;
    const contenido = sanitizarContenido(p.data.borrador.contenido);
    const slug = campos.slug === "" ? null : campos.slug;

    if (slug) {
      const otra = await prisma.colExperiencia.findFirst({ where: { slug, id: { not: id } }, select: { id: true } });
      if (otra) fallar("Esa dirección web ya la usa otra experiencia.");
    }

    // Solo ids que existen: un destino o un hotel borrado no tumba el guardado.
    const destinoIds = Array.from(new Set(campos.destinoIds));
    const alojamientoIds = Array.from(
      new Set(contenido.tramos.map((t) => t.hotel?.alojamientoId).filter((x): x is string => !!x)),
    );
    const [destinosOk, alojamientosOk] = await Promise.all([
      prisma.colDestino.findMany({ where: { id: { in: destinoIds } }, select: { id: true } }),
      prisma.alojamiento.findMany({ where: { id: { in: alojamientoIds } }, select: { id: true } }),
    ]);
    const destinosValidos = new Set(destinosOk.map((d) => d.id));
    const alojValidos = new Set(alojamientosOk.map((a) => a.id));
    const destinosFinal = destinoIds.filter((d) => destinosValidos.has(d));
    const alojFinal = alojamientoIds.filter((a) => alojValidos.has(a));

    let count: number;
    try {
      ({ count } = await prisma.colExperiencia.updateMany({
        where: { id, revision },
        data: {
          titulo: campos.titulo,
          bajada: campos.bajada,
          slug,
          tipo: campos.tipo,
          especialistaId: campos.especialistaId,
          proveedorId: campos.proveedorId,
          portadaId: campos.portadaId,
          ogImagenId: campos.ogImagenId,
          destacada: campos.destacada,
          mostrarPrecio: campos.mostrarPrecio,
          precioDesde: campos.precioDesde,
          seoTitulo: campos.seoTitulo,
          seoDescripcion: campos.seoDescripcion,
          contenido: contenido as unknown as Prisma.InputJsonValue,
          noches: nochesTotales(contenido),
          revision: { increment: 1 },
          actualizadaPorId: userId,
        },
      }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") fallar("Esa dirección web ya la usa otra experiencia.");
        if (err.code === "P2003") fallar("Algo de lo elegido (foto, especialista o proveedor) ya no existe. Recargá la página.");
      }
      throw err;
    }

    if (count === 0) {
      const existe = await prisma.colExperiencia.findUnique({ where: { id }, select: { id: true } });
      if (!existe) fallar(MSG_NO_EXISTE);
      throw new ConflictoDeVersion(MSG_CONFLICTO);
    }

    await prisma.colExperienciaDestino.deleteMany({ where: { experienciaId: id } });
    if (destinosFinal.length) {
      await prisma.colExperienciaDestino.createMany({
        data: destinosFinal.map((destinoId, orden) => ({ experienciaId: id, destinoId, orden })),
      });
    }
    await prisma.colExperienciaHotel.deleteMany({ where: { experienciaId: id } });
    if (alojFinal.length) {
      await prisma.colExperienciaHotel.createMany({
        data: alojFinal.map((alojamientoId) => ({ experienciaId: id, alojamientoId })),
      });
    }

    // El constructor guarda solo cada pocos segundos: al historial va una
    // entrada por persona cada 15 minutos, no una por autoguardado.
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

const ACCIONES = ["enviar-revision", "publicar", "pausar", "archivar", "volver-borrador"] as const;
export type AccionEstado = (typeof ACCIONES)[number];

export async function cambiarEstadoExperiencia(
  id: string,
  accion: AccionEstado,
): Promise<Resultado<{ estado: EstadoExperiencia }>> {
  return ejecutar("cambiarEstadoExperiencia", async () => {
    if (!ACCIONES.includes(accion)) fallar("Acción inválida.");
    const necesita = accion === "publicar" || accion === "pausar" || accion === "archivar";
    const { userId } = await requireCollection(necesita ? "experiencias.publicar" : "experiencias.editar");

    const fila = await prisma.colExperiencia.findUnique({ where: { id }, include: { destinos: true } });
    if (!fila) fallar(MSG_NO_EXISTE);
    const actual = fila.estado;
    let data: Prisma.ColExperienciaUpdateManyMutationInput;
    let nuevo: EstadoExperiencia;

    switch (accion) {
      case "enviar-revision":
        if (actual !== "BORRADOR") fallar("Solo un borrador se puede enviar a revisión.");
        nuevo = "EN_REVISION";
        data = { estado: nuevo };
        break;
      case "publicar": {
        if (actual === "ARCHIVADA") fallar("Una experiencia archivada vuelve primero a borrador.");
        const borrador = borradorDeFila(fila);
        if (!puedePublicar(borrador)) {
          const faltan = requisitos(borrador).filter((r) => r.obligatorio && !r.ok).map((r) => r.texto);
          fallar(`Faltan datos para publicar: ${faltan.join(", ")}.`);
        }
        if (!fila.slug) fallar("Falta la dirección web (slug).");
        nuevo = "PUBLICADA";
        data = {
          estado: nuevo,
          // El proveedor es interno (RN08): no entra en lo que lee el sitio.
          publicado: { campos: { ...borrador.campos, proveedorId: null }, contenido: borrador.contenido } as unknown as Prisma.InputJsonValue,
          publicadoRevision: fila.revision,
          publicadaEn: fila.publicadaEn ?? new Date(),
        };
        break;
      }
      case "pausar":
        if (actual !== "PUBLICADA") fallar("Solo una experiencia publicada se puede pausar.");
        nuevo = "PAUSADA";
        data = { estado: nuevo };
        break;
      case "archivar":
        if (actual === "ARCHIVADA") fallar("Ya está archivada.");
        nuevo = "ARCHIVADA";
        data = { estado: nuevo };
        break;
      case "volver-borrador":
        if (actual !== "EN_REVISION" && actual !== "PAUSADA" && actual !== "ARCHIVADA") {
          fallar("Esa experiencia no se puede volver a borrador desde su estado actual.");
        }
        nuevo = "BORRADOR";
        data = { estado: nuevo };
        break;
    }

    // `revision` en el where: si alguien guardó en el medio, la foto publicada
    // no coincidiría con lo que se validó.
    const { count } = await prisma.colExperiencia.updateMany({ where: { id, revision: fila.revision }, data });
    if (count === 0) throw new ConflictoDeVersion(MSG_CONFLICTO);

    await registrarEventoCol({
      entidad: ENTIDAD,
      entidadId: id,
      accion: accion === "publicar" && actual === "PUBLICADA" ? "publicar-cambios" : accion,
      userId,
      detalle: { de: actual, a: nuevo },
    });
    return { estado: nuevo };
  });
}

// ── Duplicar / ordenar / destacar ──────────────────────────────────────────

export async function duplicarExperiencia(id: string): Promise<Resultado<{ id: string }>> {
  return ejecutar("duplicarExperiencia", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const o = await prisma.colExperiencia.findUnique({ where: { id }, include: { destinos: true, hoteles: true } });
    if (!o) fallar(MSG_NO_EXISTE);
    const copia = await prisma.colExperiencia.create({
      data: {
        titulo: `${o.titulo} (copia)`.slice(0, 140),
        bajada: o.bajada,
        tipo: o.tipo,
        orden: o.orden,
        especialistaId: o.especialistaId,
        proveedorId: o.proveedorId,
        portadaId: o.portadaId,
        ogImagenId: o.ogImagenId,
        mostrarPrecio: o.mostrarPrecio,
        precioDesde: o.precioDesde,
        precioMoneda: o.precioMoneda,
        seoTitulo: o.seoTitulo,
        seoDescripcion: o.seoDescripcion,
        contenido: o.contenido as Prisma.InputJsonValue,
        noches: o.noches,
        creadaPorId: userId,
        actualizadaPorId: userId,
        destinos: { create: o.destinos.map((d) => ({ destinoId: d.destinoId, orden: d.orden })) },
        hoteles: { create: o.hoteles.map((h) => ({ alojamientoId: h.alojamientoId })) },
      },
      select: { id: true },
    });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: copia.id, accion: "duplicar", userId, detalle: { desde: id } });
    return { id: copia.id };
  });
}

export async function reordenarExperiencias(ids: string[]): Promise<Resultado<null>> {
  return ejecutar("reordenarExperiencias", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const p = z.array(idSchema).max(500).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    for (let orden = 0; orden < p.data.length; orden++) {
      const id = p.data[orden];
      await prisma.colExperiencia.updateMany({ where: { id }, data: { orden } });
    }
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: "lista", accion: "reordenar", userId });
    return null;
  });
}

export async function alternarDestacada(id: string): Promise<Resultado<{ destacada: boolean }>> {
  return ejecutar("alternarDestacada", async () => {
    const { userId } = await requireCollection("experiencias.editar");
    const f = await prisma.colExperiencia.findUnique({ where: { id }, select: { destacada: true } });
    if (!f) fallar(MSG_NO_EXISTE);
    const destacada = !f.destacada;
    await prisma.colExperiencia.update({ where: { id }, data: { destacada } });
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: destacada ? "destacar" : "quitar-destacada", userId });
    return { destacada };
  });
}

// ── Catálogo común ─────────────────────────────────────────────────────────

export async function buscarCiudades(
  q: string,
): Promise<Resultado<{ id: string; nombre: string; paisNombre: string }[]>> {
  return ejecutar("buscarCiudades", async () => {
    await requireCollection("panel");
    const t = z.string().trim().max(100).parse(q ?? "");
    const filas = await prisma.ciudad.findMany({
      where: { pais: { brandId: BRAND_ID }, ...(t ? { nombre: { contains: t, mode: "insensitive" } } : {}) },
      include: { pais: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
      take: 20,
    });
    return filas.map((c) => ({ id: c.id, nombre: c.nombre, paisNombre: c.pais.nombre }));
  });
}

export interface HotelBusqueda {
  id: string;
  nombre: string;
  ciudadNombre: string | null;
  categoria: number | null;
  fotos: FotoCatalogo[];
}

export async function buscarHoteles(
  input: { q?: string; ciudadId?: string } = {},
): Promise<Resultado<HotelBusqueda[]>> {
  return ejecutar("buscarHoteles", async () => {
    await requireCollection("panel");
    const p = z
      .object({ q: z.string().trim().max(100).optional(), ciudadId: idSchema.optional() })
      .safeParse(input);
    if (!p.success) fallar("Búsqueda inválida.");
    const { q, ciudadId } = p.data;
    const filas = await prisma.alojamiento.findMany({
      where: {
        brandId: BRAND_ID,
        deletedAt: null,
        ...(ciudadId ? { ciudadId } : {}),
        ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { ciudad: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
      take: 20,
    });
    const fotos = await fotosDeAlojamientos(filas.map((a) => a.id));
    return filas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      ciudadNombre: a.ciudad?.nombre ?? null,
      categoria: a.categoria,
      fotos: fotos.get(a.id) ?? [],
    }));
  });
}
