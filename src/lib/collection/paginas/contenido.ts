// Contrato de las páginas de Collection (Inicio, Nosotros, legales) y de los
// contenidos chicos del sitio (testimonios, aliados, preguntas, journal). Lo
// comparten el servidor (valida y resuelve), el editor de páginas (edita los
// bloques) y el sitio (dibuja `PaginaVista`). Sin imports de servidor.

import { z } from "zod";
import type { EspecialistaVista, MedioVista, TipoExperiencia } from "@/lib/collection/experiencia/contenido";

const id = z.string().min(1).max(40);
const texto = (max: number) => z.string().max(max).default("");
/** HTML del editor de texto rico. Se sanitiza al guardar. */
const html = (max: number) => z.string().max(max).default("");
const medioRef = z.object({ medioId: id, leyenda: texto(300).optional() });
const medioOpcional = medioRef.nullable().default(null);
const ids = (max: number) => z.array(id).max(max).default([]);

const base = { id, oculto: z.boolean().default(false) };

// ── Bloques ────────────────────────────────────────────────────────────────

export const bloqueSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...base,
    tipo: z.literal("portada"),
    eyebrow: texto(80),
    titulo: texto(160),
    bajada: texto(300),
    medio: medioOpcional,
    ctaTexto: texto(40),
    ctaHref: texto(200),
  }),
  z.object({ ...base, tipo: z.literal("manifiesto"), eyebrow: texto(80), texto: html(4000), firma: texto(120) }),
  z.object({
    ...base,
    tipo: z.literal("texto"),
    eyebrow: texto(80),
    titulo: texto(160),
    texto: html(40000),
    ancho: z.enum(["angosto", "ancho"]).default("angosto"),
  }),
  z.object({
    ...base,
    tipo: z.literal("imagenTexto"),
    eyebrow: texto(80),
    titulo: texto(160),
    texto: html(6000),
    medio: medioOpcional,
    lado: z.enum(["izquierda", "derecha"]).default("izquierda"),
  }),
  z.object({ ...base, tipo: z.literal("galeria"), titulo: texto(160), medios: z.array(medioRef).max(30).default([]) }),
  z.object({ ...base, tipo: z.literal("cita"), texto: texto(400), autor: texto(120), medio: medioOpcional }),
  z.object({
    ...base,
    tipo: z.literal("cifras"),
    titulo: texto(160),
    items: z
      .array(z.object({ id, valor: texto(20), etiqueta: texto(80) }))
      .max(6)
      .default([]),
  }),
  z.object({
    ...base,
    tipo: z.literal("destinos"),
    eyebrow: texto(80),
    titulo: texto(160),
    bajada: texto(300),
    modo: z.enum(["todos", "elegidos"]).default("todos"),
    destinoIds: ids(24),
  }),
  z.object({
    ...base,
    tipo: z.literal("experiencias"),
    eyebrow: texto(80),
    titulo: texto(160),
    bajada: texto(300),
    modo: z.enum(["destacadas", "elegidas"]).default("destacadas"),
    experienciaIds: ids(12),
  }),
  z.object({
    ...base,
    tipo: z.literal("estilos"),
    eyebrow: texto(80),
    titulo: texto(160),
    items: z
      .array(z.object({ id, titulo: texto(80), texto: texto(300), medio: medioOpcional, href: texto(200) }))
      .max(8)
      .default([]),
  }),
  z.object({ ...base, tipo: z.literal("especialistas"), eyebrow: texto(80), titulo: texto(160), bajada: texto(300) }),
  z.object({
    ...base,
    tipo: z.literal("testimonios"),
    eyebrow: texto(80),
    titulo: texto(160),
    modo: z.enum(["todos", "elegidos"]).default("todos"),
    testimonioIds: ids(12),
  }),
  z.object({ ...base, tipo: z.literal("aliados"), eyebrow: texto(80), titulo: texto(160), bajada: texto(300) }),
  z.object({
    ...base,
    tipo: z.literal("preguntas"),
    eyebrow: texto(80),
    titulo: texto(160),
    /** "" = todas las categorías. */
    categoria: texto(60),
  }),
  z.object({
    ...base,
    tipo: z.literal("journal"),
    eyebrow: texto(80),
    titulo: texto(160),
    modo: z.enum(["recientes", "elegidos"]).default("recientes"),
    articuloIds: ids(6),
  }),
  z.object({ ...base, tipo: z.literal("newsletter"), titulo: texto(160), texto: texto(300), medio: medioOpcional }),
  z.object({
    ...base,
    tipo: z.literal("cierre"),
    eyebrow: texto(80),
    titulo: texto(160),
    texto: texto(300),
    ctaTexto: texto(40),
    ctaHref: texto(200),
    medio: medioOpcional,
  }),
]);

export type Bloque = z.infer<typeof bloqueSchema>;
export type TipoBloque = Bloque["tipo"];
export type BloqueDe<T extends TipoBloque> = Extract<Bloque, { tipo: T }>;

/** Catálogo para el selector "Agregar bloque" del editor. */
export const TIPOS_BLOQUE: { tipo: TipoBloque; nombre: string; descripcion: string; icono: string }[] = [
  { tipo: "portada", nombre: "Portada", descripcion: "Imagen o video a pantalla completa con título.", icono: "Image" },
  { tipo: "manifiesto", nombre: "Manifiesto", descripcion: "Un párrafo grande que dice quiénes somos.", icono: "Quote" },
  { tipo: "texto", nombre: "Texto", descripcion: "Texto largo con subtítulos, listas y enlaces.", icono: "AlignLeft" },
  { tipo: "imagenTexto", nombre: "Imagen y texto", descripcion: "Una foto al costado de un relato.", icono: "Columns2" },
  { tipo: "galeria", nombre: "Galería", descripcion: "Fotos y videos de la biblioteca.", icono: "LayoutGrid" },
  { tipo: "cita", nombre: "Cita", descripcion: "Una frase destacada con su autor.", icono: "MessageSquareQuote" },
  { tipo: "cifras", nombre: "Cifras", descripcion: "Hasta 6 números con su etiqueta.", icono: "Hash" },
  { tipo: "destinos", nombre: "Destinos", descripcion: "El mosaico de destinos.", icono: "Map" },
  { tipo: "experiencias", nombre: "Experiencias", descripcion: "Las destacadas o las que elijas.", icono: "Compass" },
  { tipo: "estilos", nombre: "Estilos de viaje", descripcion: "Inspiración por tipo de viaje.", icono: "Sparkles" },
  { tipo: "especialistas", nombre: "Especialistas", descripcion: "Quienes arman cada viaje.", icono: "Users" },
  { tipo: "testimonios", nombre: "Testimonios", descripcion: "Historias de viajeros.", icono: "Heart" },
  { tipo: "aliados", nombre: "Aliados", descripcion: "Los logos de quienes nos acompañan.", icono: "Handshake" },
  { tipo: "preguntas", nombre: "Preguntas frecuentes", descripcion: "Acordeón de preguntas.", icono: "CircleHelp" },
  { tipo: "journal", nombre: "Journal", descripcion: "Los últimos artículos o los que elijas.", icono: "BookOpen" },
  { tipo: "newsletter", nombre: "Newsletter", descripcion: "Invitación a suscribirse.", icono: "Mail" },
  { tipo: "cierre", nombre: "Cierre", descripcion: "Llamado final a consultar.", icono: "Flag" },
];

/** Bloque nuevo con sus valores por defecto. */
export function nuevoBloque(tipo: TipoBloque, idNuevo: string): Bloque {
  return bloqueSchema.parse({ id: idNuevo, tipo });
}

export const contenidoPaginaSchema = z.object({
  version: z.literal(1).default(1),
  bloques: z.array(bloqueSchema).max(40).default([]),
});
export type ContenidoPagina = z.infer<typeof contenidoPaginaSchema>;

export function leerContenidoPagina(raw: unknown): ContenidoPagina {
  const r = contenidoPaginaSchema.safeParse(raw ?? {});
  return r.success ? r.data : contenidoPaginaSchema.parse({});
}

/** Páginas fijas del sitio. Se crean con la migración; no se agregan ni borran. */
export const PAGINAS = [
  { slug: "inicio", titulo: "Inicio", ruta: "/" },
  { slug: "nosotros", titulo: "Nosotros", ruta: "/nosotros" },
  { slug: "terminos", titulo: "Términos y condiciones", ruta: "/terminos" },
  { slug: "privacidad", titulo: "Política de privacidad", ruta: "/privacidad" },
  { slug: "cookies", titulo: "Política de cookies", ruta: "/cookies" },
] as const;
export type SlugPagina = (typeof PAGINAS)[number]["slug"];

// ── Contenidos chicos ──────────────────────────────────────────────────────

export const TIPOS_ARTICULO = ["GUIA", "RELATO", "CONSEJOS"] as const;
export type TipoArticulo = (typeof TIPOS_ARTICULO)[number];
export const NOMBRE_TIPO_ARTICULO: Record<TipoArticulo, string> = {
  GUIA: "Guía",
  RELATO: "Relato",
  CONSEJOS: "Consejos",
};

/** Contenido JSON de un artículo del journal (las columnas van aparte). */
export const contenidoArticuloSchema = z.object({
  version: z.literal(1).default(1),
  cuerpo: html(60000),
  galeria: z.array(medioRef).max(30).default([]),
});
export type ContenidoArticulo = z.infer<typeof contenidoArticuloSchema>;

export function leerContenidoArticulo(raw: unknown): ContenidoArticulo {
  const r = contenidoArticuloSchema.safeParse(raw ?? {});
  return r.success ? r.data : contenidoArticuloSchema.parse({});
}

/** Minutos de lectura a 200 palabras por minuto, mínimo 1. */
export function minutosDeLectura(cuerpoHtml: string): number {
  const palabras = cuerpoHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

// ── Vistas: lo que dibuja el sitio ─────────────────────────────────────────

export interface DestinoCardVista {
  id: string;
  slug: string;
  nombre: string;
  bajada: string;
  portada: MedioVista | null;
  experiencias: number;
  proximamente: boolean;
}

export interface ExperienciaCardVista {
  id: string;
  slug: string;
  titulo: string;
  bajada: string;
  tipo: TipoExperiencia;
  portada: MedioVista | null;
  noches: number;
  destinos: string[];
  /** Solo viene si la experiencia muestra precio. */
  precioDesde: number | null;
}

export interface TestimonioVista {
  id: string;
  nombre: string;
  lugar: string;
  viaje: string;
  cita: string;
  foto: MedioVista | null;
}

export interface AliadoVista {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  url: string;
  logo: MedioVista | null;
}

export interface PreguntaVista {
  id: string;
  pregunta: string;
  /** HTML sanitizado. */
  respuesta: string;
  categoria: string;
}

export interface ArticuloCardVista {
  id: string;
  slug: string;
  tipo: TipoArticulo;
  titulo: string;
  bajada: string;
  minutos: number;
  portada: MedioVista | null;
  publicadoEn: string | null;
}

export interface ArticuloVista extends ArticuloCardVista {
  cuerpo: string;
  galeria: MedioVista[];
  autor: EspecialistaVista | null;
  experiencias: ExperienciaCardVista[];
}

/** Un bloque listo para dibujar: lo editable más lo que se resolvió. */
export type BloqueVista =
  | (BloqueDe<"portada"> & { medioVista: MedioVista | null })
  | BloqueDe<"manifiesto">
  | BloqueDe<"texto">
  | (BloqueDe<"imagenTexto"> & { medioVista: MedioVista | null })
  | (BloqueDe<"galeria"> & { mediosVista: (MedioVista & { leyendaUso: string })[] })
  | (BloqueDe<"cita"> & { medioVista: MedioVista | null })
  | BloqueDe<"cifras">
  | (BloqueDe<"destinos"> & { destinos: DestinoCardVista[] })
  | (BloqueDe<"experiencias"> & { experiencias: ExperienciaCardVista[] })
  | (BloqueDe<"estilos"> & { itemsVista: { id: string; titulo: string; texto: string; href: string; medio: MedioVista | null }[] })
  | (BloqueDe<"especialistas"> & { especialistas: EspecialistaVista[] })
  | (BloqueDe<"testimonios"> & { testimonios: TestimonioVista[] })
  | (BloqueDe<"aliados"> & { aliados: AliadoVista[] })
  | (BloqueDe<"preguntas"> & { preguntas: PreguntaVista[] })
  | (BloqueDe<"journal"> & { articulos: ArticuloCardVista[] })
  | (BloqueDe<"newsletter"> & { medioVista: MedioVista | null })
  | (BloqueDe<"cierre"> & { medioVista: MedioVista | null });

export interface PaginaVista {
  slug: string;
  titulo: string;
  bloques: BloqueVista[];
  /** ISO de la última publicación (las legales lo muestran). */
  actualizadaEn: string | null;
}

/**
 * Lo que necesita `armarVistaPagina`. Las listas vienen YA filtradas a lo
 * publicado y en su orden; los modos "elegidos" se resuelven por id contra
 * esas listas, así un elegido que se despublicó desaparece solo.
 */
export interface MapasPagina {
  medios: Map<string, MedioVista>;
  destinos: DestinoCardVista[];
  experiencias: (ExperienciaCardVista & { destacada: boolean })[];
  especialistas: EspecialistaVista[];
  testimonios: TestimonioVista[];
  aliados: AliadoVista[];
  preguntas: PreguntaVista[];
  articulos: ArticuloCardVista[];
}

/** Pura: la usan la vista previa del editor y el sitio. Omite los bloques ocultos. */
export function armarVistaPagina(
  pagina: { slug: string; titulo: string; actualizadaEn: string | null },
  contenido: ContenidoPagina,
  m: MapasPagina,
  opciones: { incluirOcultos?: boolean } = {},
): PaginaVista {
  const medio = (ref: { medioId: string } | null) => (ref ? m.medios.get(ref.medioId) ?? null : null);
  const elegir = <T extends { id: string }>(lista: T[], idsElegidos: string[]) =>
    idsElegidos.map((x) => lista.find((i) => i.id === x)).filter((x): x is T => !!x);

  const bloques: BloqueVista[] = [];
  for (const b of contenido.bloques) {
    if (b.oculto && !opciones.incluirOcultos) continue;
    switch (b.tipo) {
      case "portada":
      case "imagenTexto":
      case "cita":
      case "newsletter":
      case "cierre":
        bloques.push({ ...b, medioVista: medio(b.medio) } as BloqueVista);
        break;
      case "galeria":
        bloques.push({
          ...b,
          mediosVista: b.medios
            .map((r) => {
              const v = m.medios.get(r.medioId);
              return v ? { ...v, leyendaUso: r.leyenda?.trim() || v.leyenda } : null;
            })
            .filter((x): x is MedioVista & { leyendaUso: string } => !!x),
        });
        break;
      case "destinos":
        bloques.push({ ...b, destinos: b.modo === "elegidos" ? elegir(m.destinos, b.destinoIds) : m.destinos });
        break;
      case "experiencias":
        bloques.push({
          ...b,
          experiencias:
            b.modo === "elegidas"
              ? elegir(m.experiencias, b.experienciaIds)
              : m.experiencias.filter((e) => e.destacada).slice(0, 6),
        });
        break;
      case "estilos":
        bloques.push({
          ...b,
          itemsVista: b.items.map((i) => ({ id: i.id, titulo: i.titulo, texto: i.texto, href: i.href, medio: medio(i.medio) })),
        });
        break;
      case "especialistas":
        bloques.push({ ...b, especialistas: m.especialistas });
        break;
      case "testimonios":
        bloques.push({ ...b, testimonios: b.modo === "elegidos" ? elegir(m.testimonios, b.testimonioIds) : m.testimonios });
        break;
      case "aliados":
        bloques.push({ ...b, aliados: m.aliados });
        break;
      case "preguntas":
        bloques.push({
          ...b,
          preguntas: b.categoria.trim() ? m.preguntas.filter((p) => p.categoria === b.categoria) : m.preguntas,
        });
        break;
      case "journal":
        bloques.push({ ...b, articulos: b.modo === "elegidos" ? elegir(m.articulos, b.articuloIds) : m.articulos.slice(0, 3) });
        break;
      default:
        bloques.push(b as BloqueVista);
    }
  }
  return { slug: pagina.slug, titulo: pagina.titulo, bloques, actualizadaEn: pagina.actualizadaEn };
}

/** ids de medios que usan los bloques (para traer de la biblioteca de una vez). */
export function mediosDePagina(c: ContenidoPagina): string[] {
  const s = new Set<string>();
  for (const b of c.bloques) {
    if ("medio" in b && b.medio) s.add(b.medio.medioId);
    if (b.tipo === "galeria") b.medios.forEach((r) => s.add(r.medioId));
    if (b.tipo === "estilos") b.items.forEach((i) => i.medio && s.add(i.medio.medioId));
  }
  return Array.from(s);
}
