// Contrato de una experiencia de Collection. Lo comparten el servidor (lo
// valida al guardar), el constructor (lo edita) y la página (lo dibuja a
// través de `ExperienciaVista`). Sin imports de servidor: corre también en el
// cliente.

import { z } from "zod";
import type { Recortes } from "@/lib/collection/recortes";

// ── Piezas ──────────────────────────────────────────────────────────────────

const id = z.string().min(1).max(40);
const texto = (max: number) => z.string().max(max).default("");
/** HTML del editor de texto rico (TipTap). Se sanitiza al guardar. */
const html = (max: number) => z.string().max(max).default("");

/** Un medio de la biblioteca usado en algún lugar, con leyenda propia opcional. */
export const medioRefSchema = z.object({
  medioId: id,
  leyenda: texto(300).optional(),
});

export const imperdibleSchema = z.object({
  id,
  titulo: texto(120),
  texto: texto(400),
  medio: medioRefSchema.nullable().default(null),
});

export const hotelTramoSchema = z.object({
  /** Hotel del catálogo común. null = texto libre. */
  alojamientoId: z.string().max(40).nullable().default(null),
  /** Copia del nombre al elegirlo, para no depender del catálogo al dibujar. */
  nombre: texto(160),
  /** "Por qué lo elegimos": texto propio de Collection, no toca la ficha (RN11). */
  texto: html(4000),
  destacados: z.array(z.string().max(80)).max(8).default([]),
  /** Fotos propias; si no hay, la página usa las del catálogo. */
  medios: z.array(medioRefSchema).max(12).default([]),
});

export const tramoSchema = z.object({
  id,
  ciudadId: z.string().max(40).nullable().default(null),
  ciudadNombre: texto(120),
  paisNombre: texto(120),
  noches: z.number().int().min(0).max(60).default(0),
  relato: html(6000),
  medio: medioRefSchema.nullable().default(null),
  hotel: hotelTramoSchema.nullable().default(null),
});

export const diaSchema = z.object({
  id,
  /** Día inicial y final (un rango "Días 3 a 5" o un día suelto con desde = hasta). */
  desde: z.number().int().min(1).max(90),
  hasta: z.number().int().min(1).max(90),
  tramoId: z.string().max(40).nullable().default(null),
  titulo: texto(160),
  texto: html(4000),
  medios: z.array(medioRefSchema).max(8).default([]),
});

export const infoPracticaSchema = z.object({
  idioma: texto(200),
  moneda: texto(200),
  visado: texto(600),
  comoLlegar: texto(600),
  salud: texto(600),
  clima: texto(600),
});

// ── Contenido completo (columna `contenido` de ColExperiencia) ─────────────

export const contenidoExperienciaSchema = z.object({
  version: z.literal(1).default(1),
  /** Frase grande del hero ("Filipinas no se recorre: se navega."). */
  frase: texto(200),
  intro: html(8000),
  mejorEpoca: texto(80),
  imperdibles: z.array(imperdibleSchema).max(8).default([]),
  tramos: z.array(tramoSchema).max(12).default([]),
  dias: z.array(diaSchema).max(60).default([]),
  galeria: z.array(medioRefSchema).max(60).default([]),
  /** Video a sangre en el medio de la página. */
  video: z
    .object({ medioId: id, titulo: texto(160) })
    .nullable()
    .default(null),
  incluye: z.array(z.string().max(200)).max(30).default([]),
  noIncluye: z.array(z.string().max(200)).max(30).default([]),
  info: infoPracticaSchema.default({
    idioma: "",
    moneda: "",
    visado: "",
    comoLlegar: "",
    salud: "",
    clima: "",
  }),
  /** Leyenda del precio cuando se muestra. */
  precioNota: texto(200).default("Por persona, en base doble, sujeto a disponibilidad."),
});

export type MedioRef = z.infer<typeof medioRefSchema>;
export type Imperdible = z.infer<typeof imperdibleSchema>;
export type HotelTramo = z.infer<typeof hotelTramoSchema>;
export type Tramo = z.infer<typeof tramoSchema>;
export type Dia = z.infer<typeof diaSchema>;
export type InfoPractica = z.infer<typeof infoPracticaSchema>;
export type ContenidoExperiencia = z.infer<typeof contenidoExperienciaSchema>;

export function contenidoVacio(): ContenidoExperiencia {
  return contenidoExperienciaSchema.parse({});
}

/** Lee lo guardado en la base sin romper si falta algo (los defaults completan). */
export function leerContenido(raw: unknown): ContenidoExperiencia {
  const r = contenidoExperienciaSchema.safeParse(raw ?? {});
  return r.success ? r.data : contenidoVacio();
}

// ── Columnas editables de la experiencia (fuera del JSON) ──────────────────

export const TIPOS_EXPERIENCIA = ["VIAJE", "HOTEL", "CRUCERO", "TREN"] as const;
export type TipoExperiencia = (typeof TIPOS_EXPERIENCIA)[number];

export const ESTADOS_EXPERIENCIA = [
  "BORRADOR",
  "EN_REVISION",
  "PUBLICADA",
  "PAUSADA",
  "ARCHIVADA",
] as const;
export type EstadoExperiencia = (typeof ESTADOS_EXPERIENCIA)[number];

export const camposExperienciaSchema = z.object({
  titulo: z.string().trim().max(140),
  bajada: z.string().trim().max(240),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Solo minúsculas, números y guiones."),
  tipo: z.enum(TIPOS_EXPERIENCIA),
  destinoIds: z.array(z.string().max(40)).max(6),
  especialistaId: z.string().max(40).nullable(),
  proveedorId: z.string().max(40).nullable(),
  portadaId: z.string().max(40).nullable(),
  destacada: z.boolean(),
  mostrarPrecio: z.boolean(),
  precioDesde: z.number().min(0).max(1_000_000).nullable(),
  seoTitulo: z.string().trim().max(70),
  seoDescripcion: z.string().trim().max(170),
  ogImagenId: z.string().max(40).nullable(),
});
export type CamposExperiencia = z.infer<typeof camposExperienciaSchema>;

/** Lo que edita el constructor: columnas + contenido. */
export interface BorradorExperiencia {
  campos: CamposExperiencia;
  contenido: ContenidoExperiencia;
}

// ── Pasos del constructor y completitud ────────────────────────────────────

export const PASOS = [
  { id: "esencial", titulo: "Lo esencial", seccion: "hero" },
  { id: "portada", titulo: "Portada", seccion: "hero" },
  { id: "relato", titulo: "Relato", seccion: "intro" },
  { id: "recorrido", titulo: "Recorrido", seccion: "recorrido" },
  { id: "dias", titulo: "Día a día", seccion: "dias" },
  { id: "galeria", titulo: "Galería", seccion: "galeria" },
  { id: "detalles", titulo: "Detalles", seccion: "info" },
  { id: "compartir", titulo: "Compartir y Google", seccion: "seo" },
  { id: "publicar", titulo: "Publicar", seccion: "hero" },
] as const;
export type PasoId = (typeof PASOS)[number]["id"];

/** Texto plano de un HTML del editor, para medir largo sin etiquetas. */
export function textoPlano(h: string): string {
  return h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export interface Requisito {
  id: string;
  paso: PasoId;
  texto: string;
  ok: boolean;
  /** Bloquea publicar (RN07) o solo se recomienda. */
  obligatorio: boolean;
}

/**
 * Requisitos de la experiencia. Los obligatorios son los de RN07 de la
 * propuesta funcional: portada, 6 fotos, intro, un tramo con relato, día a
 * día, especialista y texto para Google.
 */
export function requisitos(b: BorradorExperiencia): Requisito[] {
  const { campos: c, contenido: k } = b;
  const tramoConRelato = k.tramos.some(
    (t) => (t.ciudadId || t.ciudadNombre.trim()) && t.noches > 0 && textoPlano(t.relato).length >= 80,
  );
  const r: Requisito[] = [
    { id: "titulo", paso: "esencial", texto: "Título", ok: c.titulo.length >= 4, obligatorio: true },
    { id: "destino", paso: "esencial", texto: "Al menos un destino", ok: c.destinoIds.length > 0, obligatorio: true },
    { id: "especialista", paso: "esencial", texto: "Especialista a cargo", ok: !!c.especialistaId, obligatorio: true },
    { id: "slug", paso: "esencial", texto: "Dirección web (slug)", ok: c.slug.length >= 3, obligatorio: true },
    { id: "portada", paso: "portada", texto: "Foto o video de portada", ok: !!c.portadaId, obligatorio: true },
    { id: "intro", paso: "relato", texto: "Intro de al menos 200 caracteres", ok: textoPlano(k.intro).length >= 200, obligatorio: true },
    { id: "imperdibles", paso: "relato", texto: "4 imperdibles o más", ok: k.imperdibles.filter((i) => i.titulo.trim()).length >= 4, obligatorio: false },
    { id: "mejorEpoca", paso: "relato", texto: "Mejor época", ok: k.mejorEpoca.trim().length > 0, obligatorio: false },
    { id: "tramo", paso: "recorrido", texto: "Un tramo con ciudad, noches y relato", ok: tramoConRelato, obligatorio: true },
    { id: "hoteles", paso: "recorrido", texto: "Hotel en cada tramo", ok: k.tramos.length > 0 && k.tramos.every((t) => t.hotel?.nombre.trim()), obligatorio: false },
    { id: "dias", paso: "dias", texto: "Día a día cargado", ok: k.dias.some((d) => d.titulo.trim() || textoPlano(d.texto)), obligatorio: true },
    { id: "galeria", paso: "galeria", texto: "6 fotos en la galería", ok: k.galeria.length >= 6, obligatorio: true },
    { id: "incluye", paso: "detalles", texto: "Qué incluye", ok: k.incluye.some((i) => i.trim()), obligatorio: false },
    {
      id: "precio",
      paso: "detalles",
      texto: "Monto del precio desde",
      ok: !c.mostrarPrecio || (c.precioDesde ?? 0) > 0,
      obligatorio: true,
    },
    {
      id: "seo",
      paso: "compartir",
      texto: "Título y descripción para Google",
      ok: c.seoTitulo.length >= 10 && c.seoDescripcion.length >= 50,
      obligatorio: true,
    },
  ];
  return r;
}

/** Completitud 0..1 de cada paso (el paso Publicar mide los obligatorios). */
export function completitudPorPaso(b: BorradorExperiencia): Record<PasoId, number> {
  const req = requisitos(b);
  const out = {} as Record<PasoId, number>;
  for (const p of PASOS) {
    const delPaso = p.id === "publicar" ? req.filter((x) => x.obligatorio) : req.filter((x) => x.paso === p.id);
    out[p.id] = delPaso.length ? delPaso.filter((x) => x.ok).length / delPaso.length : 1;
  }
  return out;
}

export function puedePublicar(b: BorradorExperiencia): boolean {
  return requisitos(b).every((x) => !x.obligatorio || x.ok);
}

export function nochesTotales(k: ContenidoExperiencia): number {
  return k.tramos.reduce((s, t) => s + (t.noches || 0), 0);
}

// ── Vista: lo que dibuja la página (sitio y vista previa) ───────────────────

/** Medio resuelto desde la biblioteca, listo para <img>/<video>. */
export interface MedioVista {
  id: string;
  tipo: "FOTO" | "VIDEO";
  url: string;
  variantes: { w: number; h: number; url: string }[];
  ancho: number | null;
  alto: number | null;
  colorDominante: string | null;
  placeholder: string | null;
  alt: string;
  leyenda: string;
  credito: string;
  focoX: number;
  focoY: number;
  posterUrl: string | null;
  duracion: number | null;
  /** Encuadres guardados por aspecto (solo fotos). */
  recortes?: Recortes;
}

/** Foto del catálogo común (hoteles de Traveloz), más simple que un medio. */
export interface FotoCatalogo {
  url: string;
  alt: string;
}

export interface EspecialistaVista {
  id: string;
  nombre: string;
  region: string;
  frase: string;
  idiomas: string[];
  retrato: MedioVista | null;
  whatsapp: string;
  email: string;
  telefono: string;
}

export interface ExperienciaVista {
  titulo: string;
  bajada: string;
  tipo: TipoExperiencia;
  slug: string;
  destinos: { id: string; nombre: string; slug: string }[];
  portada: MedioVista | null;
  noches: number;
  mostrarPrecio: boolean;
  precioDesde: number | null;
  especialista: EspecialistaVista | null;
  frase: string;
  intro: string;
  mejorEpoca: string;
  imperdibles: { id: string; titulo: string; texto: string; medio: MedioVista | null }[];
  tramos: {
    id: string;
    ciudadNombre: string;
    paisNombre: string;
    noches: number;
    relato: string;
    medio: MedioVista | null;
    hotel: {
      nombre: string;
      texto: string;
      destacados: string[];
      medios: MedioVista[];
      fotosCatalogo: FotoCatalogo[];
    } | null;
  }[];
  dias: {
    id: string;
    desde: number;
    hasta: number;
    titulo: string;
    texto: string;
    ciudadNombre: string;
    hotelNombre: string;
    medios: MedioVista[];
  }[];
  galeria: (MedioVista & { leyendaUso: string })[];
  video: { medio: MedioVista; titulo: string } | null;
  incluye: string[];
  noIncluye: string[];
  info: InfoPractica;
  precioNota: string;
}

/** Mapas que necesita `armarVista` para resolver ids. */
export interface MapasVista {
  medios: Map<string, MedioVista>;
  destinos: Map<string, { id: string; nombre: string; slug: string }>;
  especialistas: Map<string, EspecialistaVista>;
  /** Fotos del catálogo común por alojamientoId. */
  fotosHotel: Map<string, FotoCatalogo[]>;
}

/**
 * Arma la vista desde el borrador. Pura: la usan la vista previa del
 * constructor (con lo que tiene en memoria) y el sitio (con lo publicado).
 * Lo que no se encuentra en los mapas se omite sin romper.
 */
export function armarVista(b: BorradorExperiencia, m: MapasVista): ExperienciaVista {
  const { campos: c, contenido: k } = b;
  const medio = (ref: MedioRef | null | undefined) => (ref ? m.medios.get(ref.medioId) ?? null : null);
  const medios = (refs: MedioRef[]) =>
    refs.map((r) => m.medios.get(r.medioId)).filter((x): x is MedioVista => !!x);
  const tramoPorId = new Map(k.tramos.map((t) => [t.id, t]));

  return {
    titulo: c.titulo,
    bajada: c.bajada,
    tipo: c.tipo,
    slug: c.slug,
    destinos: c.destinoIds.map((d) => m.destinos.get(d)).filter((x): x is NonNullable<typeof x> => !!x),
    portada: c.portadaId ? m.medios.get(c.portadaId) ?? null : null,
    noches: nochesTotales(k),
    mostrarPrecio: c.mostrarPrecio,
    precioDesde: c.precioDesde,
    especialista: c.especialistaId ? m.especialistas.get(c.especialistaId) ?? null : null,
    frase: k.frase,
    intro: k.intro,
    mejorEpoca: k.mejorEpoca,
    imperdibles: k.imperdibles
      .filter((i) => i.titulo.trim())
      .map((i) => ({ id: i.id, titulo: i.titulo, texto: i.texto, medio: medio(i.medio) })),
    tramos: k.tramos.map((t) => ({
      id: t.id,
      ciudadNombre: t.ciudadNombre,
      paisNombre: t.paisNombre,
      noches: t.noches,
      relato: t.relato,
      medio: medio(t.medio),
      hotel: t.hotel
        ? {
            nombre: t.hotel.nombre,
            texto: t.hotel.texto,
            destacados: t.hotel.destacados,
            medios: medios(t.hotel.medios),
            fotosCatalogo: t.hotel.alojamientoId ? m.fotosHotel.get(t.hotel.alojamientoId) ?? [] : [],
          }
        : null,
    })),
    dias: [...k.dias]
      .sort((a, b2) => a.desde - b2.desde)
      .map((d) => {
        const t = d.tramoId ? tramoPorId.get(d.tramoId) : undefined;
        return {
          id: d.id,
          desde: d.desde,
          hasta: Math.max(d.desde, d.hasta),
          titulo: d.titulo,
          texto: d.texto,
          ciudadNombre: t?.ciudadNombre ?? "",
          hotelNombre: t?.hotel?.nombre ?? "",
          medios: medios(d.medios),
        };
      }),
    galeria: k.galeria
      .map((r) => {
        const v = m.medios.get(r.medioId);
        return v ? { ...v, leyendaUso: r.leyenda?.trim() || v.leyenda } : null;
      })
      .filter((x): x is MedioVista & { leyendaUso: string } => !!x),
    video: k.video && m.medios.get(k.video.medioId)
      ? { medio: m.medios.get(k.video.medioId)!, titulo: k.video.titulo }
      : null,
    incluye: k.incluye.filter((x) => x.trim()),
    noIncluye: k.noIncluye.filter((x) => x.trim()),
    info: k.info,
    precioNota: k.precioNota,
  };
}

/** ids de medios que usa un borrador (para traer de la biblioteca de una vez). */
export function mediosUsados(b: BorradorExperiencia): string[] {
  const { campos: c, contenido: k } = b;
  const s = new Set<string>();
  const add = (x?: string | null) => x && s.add(x);
  add(c.portadaId);
  add(c.ogImagenId);
  k.imperdibles.forEach((i) => add(i.medio?.medioId));
  k.tramos.forEach((t) => {
    add(t.medio?.medioId);
    t.hotel?.medios.forEach((r) => add(r.medioId));
  });
  k.dias.forEach((d) => d.medios.forEach((r) => add(r.medioId)));
  k.galeria.forEach((r) => add(r.medioId));
  add(k.video?.medioId);
  return Array.from(s);
}
