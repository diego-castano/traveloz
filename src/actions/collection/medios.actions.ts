"use server";

// Biblioteca de medios de Traveloz Collection. Mismo contrato
// { ok, data } | { ok, error } que el resto: los errores de negocio no se
// tiran porque Next los enmascara en producción.

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ErrorDeNegocio, fallar } from "@/lib/presupuesto/acceso";
import {
  deleteObjects,
  getObjectBuffer,
  getPresignedPutUrl,
  keyFromUrl,
  putObject,
} from "@/lib/storage";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { invalidarSitio } from "@/lib/collection/sitio-datos";
import { generarOg, procesarFoto } from "@/lib/collection/medios-proceso";
import { cambioRecortesSchema, leerRecortes, type CambioRecortes, type Recortes } from "@/lib/collection/recortes";
import { MENSAJE_MOV, TIPOS_VIDEO, VIDEO_MAX_PESO, VIDEO_MAX_SEG, esMov } from "@/lib/collection/limites-video";
import { medioAVista } from "@/lib/collection/vista-servidor";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";

const log = logger.child({ module: "collection.medios.actions" });

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

const GENERICO = "No pudimos completar la operación. Probá de nuevo.";

async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ErrorDeNegocio) return { ok: false, error: err.message };
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}

const MB = 1024 * 1024;
const FOTOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIDEOS = TIPOS_VIDEO;
const MAX_FOTO = 30 * MB;
const MAX_VIDEO = VIDEO_MAX_PESO;
const PREFIJO_ORIGINALES = "collection/originales/";

export interface ColVariante {
  w: number;
  h: number;
  url: string;
}

export interface ColMedioDto {
  id: string;
  tipo: "FOTO" | "VIDEO";
  nombre: string;
  key: string;
  url: string;
  contentType: string;
  peso: number;
  ancho: number | null;
  alto: number | null;
  duracion: number | null;
  colorDominante: string | null;
  placeholder: string | null;
  variantes: ColVariante[];
  posterUrl: string | null;
  alt: string;
  leyenda: string;
  credito: string;
  focoX: number;
  focoY: number;
  recortes: Recortes;
  etiquetas: string[];
  subidoPorId: string | null;
  createdAt: string;
}

type FilaMedio = Prisma.ColMedioGetPayload<object>;

function aDto(m: FilaMedio): ColMedioDto {
  return {
    id: m.id,
    tipo: m.tipo,
    nombre: m.nombre,
    key: m.key,
    url: m.url,
    contentType: m.contentType,
    peso: m.peso,
    ancho: m.ancho,
    alto: m.alto,
    duracion: m.duracion,
    colorDominante: m.colorDominante,
    placeholder: m.placeholder,
    variantes: (m.variantes as unknown as ColVariante[]) ?? [],
    posterUrl: m.posterUrl,
    alt: m.alt,
    leyenda: m.leyenda,
    credito: m.credito,
    focoX: m.focoX,
    focoY: m.focoY,
    recortes: leerRecortes(m.recortes),
    etiquetas: m.etiquetas,
    subidoPorId: m.subidoPorId,
    createdAt: m.createdAt.toISOString(),
  };
}

const publica = (key: string) => `/api/image/${key}`;

// ---------------------------------------------------------------------------

const subidaSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre del archivo.").max(200),
  contentType: z.string(),
  peso: z.number().int().positive(),
});

/** URL firmada para subir el original directo al bucket (10 minutos). */
export async function prepararSubidaMedio(input: {
  nombre: string;
  contentType: string;
  peso: number;
}): Promise<Resultado<{ url: string; key: string; publicUrl: string }>> {
  return ejecutar("prepararSubidaMedio", async () => {
    const { userId } = await requireCollection("medios.editar");
    const p = subidaSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { nombre, contentType, peso } = p.data;

    const esFoto = FOTOS.includes(contentType);
    const esVideo = VIDEOS.includes(contentType);
    if (esMov({ name: nombre, type: contentType })) fallar(MENSAJE_MOV);
    if (!esFoto && !esVideo) fallar("Ese tipo de archivo no está permitido.");
    if (esFoto && peso > MAX_FOTO) fallar("La foto pesa más de 30 MB.");
    if (esVideo && peso > MAX_VIDEO) fallar("El video pesa más de 50 MB.");

    const seguro = nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const key = `${PREFIJO_ORIGINALES}${randomBytes(8).toString("hex")}-${seguro}`;
    const r = await getPresignedPutUrl({
      key,
      contentType,
      expiresIn: 600,
      metadata: { uploader: userId },
      // El navegador sube directo al bucket: solo el formato con el bucket en
      // la ruta pasa el preflight CORS del proveedor.
      pathStyle: true,
    });
    return { url: r.url, key: r.key, publicUrl: publica(r.key) };
  });
}

const registroSchema = z.object({
  key: z.string().startsWith(PREFIJO_ORIGINALES, "Key inválida.").max(300),
  nombre: z.string().trim().min(1).max(200),
  contentType: z.string(),
  peso: z.number().int().positive(),
  posterKey: z.string().startsWith(PREFIJO_ORIGINALES, "Póster inválido.").max(300).optional(),
  duracion: z.number().positive().max(86400).optional(),
});

/** Registra un original ya subido: foto → variantes y metadatos; video → tal cual. */
export async function registrarMedio(input: {
  key: string;
  nombre: string;
  contentType: string;
  peso: number;
  posterKey?: string;
  duracion?: number;
}): Promise<Resultado<ColMedioDto>> {
  return ejecutar("registrarMedio", async () => {
    const { userId } = await requireCollection("medios.editar");
    const p = registroSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const d = p.data;

    const esFoto = FOTOS.includes(d.contentType);
    const esVideo = VIDEOS.includes(d.contentType);
    if (!esFoto && !esVideo) fallar("Ese tipo de archivo no está permitido.");
    if (esVideo && d.duracion && d.duracion > VIDEO_MAX_SEG) fallar("El video dura más de 2 minutos.");

    const existente = await prisma.colMedio.findUnique({ where: { key: d.key } });
    if (existente) return aDto(existente);

    const id = `cm${randomBytes(12).toString("hex")}`;
    const url = publica(d.key);

    let fila: FilaMedio;
    if (esFoto) {
      let original: Buffer;
      try {
        original = await getObjectBuffer(d.key);
      } catch {
        fallar("No encontramos el archivo subido. Probá de nuevo.");
      }
      let proc;
      try {
        proc = await procesarFoto(original);
      } catch {
        fallar("No pudimos leer la imagen. Probá con otro archivo.");
      }
      const variantes: ColVariante[] = [];
      for (const v of proc.variantes) {
        const vkey = `collection/variantes/${id}-${v.w}.webp`;
        await putObject(vkey, v.buffer, "image/webp");
        variantes.push({ w: v.w, h: v.h, url: publica(vkey) });
      }
      fila = await prisma.colMedio.create({
        data: {
          id,
          tipo: "FOTO",
          nombre: d.nombre,
          key: d.key,
          url,
          contentType: d.contentType,
          peso: d.peso,
          ancho: proc.ancho,
          alto: proc.alto,
          colorDominante: proc.colorDominante,
          placeholder: proc.placeholder,
          variantes: variantes as unknown as Prisma.InputJsonValue,
          subidoPorId: userId,
        },
      });
    } else {
      fila = await prisma.colMedio.create({
        data: {
          id,
          tipo: "VIDEO",
          nombre: d.nombre,
          key: d.key,
          url,
          contentType: d.contentType,
          peso: d.peso,
          duracion: d.duracion ?? null,
          posterUrl: d.posterKey ? publica(d.posterKey) : null,
          subidoPorId: userId,
        },
      });
    }

    await registrarEventoCol({ entidad: "medio", entidadId: id, accion: "subir", userId, detalle: { nombre: d.nombre } });
    return aDto(fila);
  });
}

// ---------------------------------------------------------------------------

export async function listarMedios(input: {
  tipo?: "FOTO" | "VIDEO";
  q?: string;
  filtro?: "sin-alt" | "sin-credito";
  cursor?: string;
  take?: number;
} = {}): Promise<Resultado<{ items: ColMedioDto[]; nextCursor: string | null }>> {
  return ejecutar("listarMedios", async () => {
    await requireCollection("panel");
    const take = Math.min(Math.max(Math.trunc(input.take ?? 60), 1), 200);
    const q = input.q?.trim();

    const where: Prisma.ColMedioWhereInput = {
      ...(input.tipo ? { tipo: input.tipo } : {}),
      ...(input.filtro === "sin-alt" ? { alt: "" } : {}),
      ...(input.filtro === "sin-credito" ? { credito: "" } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { alt: { contains: q, mode: "insensitive" } },
              { leyenda: { contains: q, mode: "insensitive" } },
              { etiquetas: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    };

    const filas = await prisma.colMedio.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const hayMas = filas.length > take;
    const items = (hayMas ? filas.slice(0, take) : filas).map(aDto);
    return { items, nextCursor: hayMas ? items[items.length - 1].id : null };
  });
}

const textoCorto = z.string().trim().max(300);
const actualizarSchema = z.object({
  alt: textoCorto.optional(),
  leyenda: textoCorto.optional(),
  credito: textoCorto.optional(),
  nombre: z.string().trim().min(1).max(200).optional(),
  focoX: z.number().min(0).max(1).optional(),
  focoY: z.number().min(0).max(1).optional(),
  etiquetas: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  recortes: cambioRecortesSchema.optional(),
});

const OG = "1.91:1";
const huella = (r: { x: number; y: number; w: number; h: number }) =>
  createHash("sha1").update([r.x, r.y, r.w, r.h].join(",")).digest("hex").slice(0, 10);

export async function actualizarMedio(
  id: string,
  input: {
    alt?: string;
    leyenda?: string;
    credito?: string;
    focoX?: number;
    focoY?: number;
    etiquetas?: string[];
    nombre?: string;
    /** Por aspecto: rectángulo nuevo o null para volver al automático. */
    recortes?: CambioRecortes;
  },
): Promise<Resultado<ColMedioDto>> {
  return ejecutar("actualizarMedio", async () => {
    const { userId } = await requireCollection("medios.editar");
    const p = actualizarSchema.safeParse(input);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Datos inválidos.");
    const { recortes: cambio, ...data } = p.data;
    if (data.etiquetas) {
      data.etiquetas = Array.from(new Set(data.etiquetas.map((e) => e.toLowerCase())));
    }
    const previo = await prisma.colMedio.findUnique({ where: { id } });
    if (!previo) fallar("No encontramos ese medio.");

    let recortes: Recortes | undefined;
    const ogViejo = leerRecortes(previo.recortes)[OG]?.url;
    if (cambio) {
      if (previo.tipo !== "FOTO") fallar("Los encuadres son solo para fotos.");
      recortes = leerRecortes(previo.recortes);
      for (const [a, r] of Object.entries(cambio) as [keyof Recortes, (typeof cambio)[keyof Recortes]][]) {
        if (r) recortes[a] = { x: r.x, y: r.y, w: r.w, h: r.h };
        else delete recortes[a];
      }
      // La imagen para compartir es un JPEG de verdad: WhatsApp y Google no recortan bien.
      const og = recortes[OG];
      if (og) {
        const key = `collection/og/${id}-${huella(og)}.jpg`;
        if (ogViejo && keyFromUrl(ogViejo) === key) og.url = ogViejo;
        else {
          let jpeg: Buffer;
          try {
            jpeg = await generarOg(await getObjectBuffer(previo.key), og);
          } catch (err) {
            log.error("actualizarMedio.og", { err, id });
            fallar("No pudimos generar la imagen para compartir. Probá de nuevo.");
          }
          await putObject(key, jpeg, "image/jpeg");
          og.url = publica(key);
        }
      }
    }

    const fila = await prisma.colMedio.update({
      where: { id },
      data: { ...data, ...(recortes ? { recortes: recortes as unknown as Prisma.InputJsonValue } : {}) },
    });
    // La imagen anterior para compartir ya no la usa nadie.
    const ogNuevo = recortes ? recortes[OG]?.url : ogViejo;
    if (ogViejo && ogViejo !== ogNuevo) {
      const k = keyFromUrl(ogViejo);
      if (k) await deleteObjects([k]).catch((err) => log.warn("actualizarMedio.ogViejo", { err, id }));
    }
    invalidarSitio();
    await registrarEventoCol({ entidad: "medio", entidadId: id, accion: "editar", userId, detalle: { campos: Object.keys(p.data) } });
    return aDto(fila);
  });
}

export async function eliminarMedio(id: string): Promise<Resultado<null>> {
  return ejecutar("eliminarMedio", async () => {
    const { userId } = await requireCollection("medios.editar");
    const fila = await prisma.colMedio.findUnique({ where: { id } });
    if (!fila) fallar("No encontramos ese medio.");

    await prisma.colMedio.delete({ where: { id } });
    invalidarSitio();
    await registrarEventoCol({ entidad: "medio", entidadId: id, accion: "eliminar", userId, detalle: { nombre: fila.nombre } });

    const keys = [
      fila.key,
      ...((fila.variantes as unknown as ColVariante[]) ?? []).map((v) => keyFromUrl(v.url)),
      keyFromUrl(fila.posterUrl),
      keyFromUrl(leerRecortes(fila.recortes)[OG]?.url),
    ].filter((k): k is string => !!k);
    try {
      await deleteObjects(keys);
    } catch (err) {
      log.warn("eliminarMedio.bucket", { err, id });
    }
    return null;
  });
}

/** Medios por id en formato de vista (para dibujar lo que ya usa una experiencia). */
export async function obtenerMediosVista(ids: string[]): Promise<Resultado<MedioVista[]>> {
  return ejecutar("obtenerMediosVista", async () => {
    await requireCollection("panel");
    const p = z.array(z.string().min(1).max(40)).max(500).safeParse(ids);
    if (!p.success) fallar("Lista inválida.");
    if (!p.data.length) return [];
    const filas = await prisma.colMedio.findMany({ where: { id: { in: p.data } } });
    return filas.map(medioAVista);
  });
}
