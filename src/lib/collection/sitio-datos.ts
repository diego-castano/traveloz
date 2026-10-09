// Datos del sitio público de Collection. Todo sale de lo PUBLICADO (las fotos
// `publicado` de experiencias, páginas y artículos) y queda en la caché de
// Next con la etiqueta "col-sitio" una hora. Las actions del backoffice que
// cambian lo que se ve llaman a `invalidarSitio()` y el cambio sale al toque.
//
// unstable_cache guarda JSON: lo que devuelve cada función son objetos planos
// (nada de Map ni Date).

import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { cargarMapasPagina, articuloCard, type FotoArticulo } from "@/lib/collection/paginas-servidor";
import { cargarMapasVista, especialistaAVista } from "@/lib/collection/vista-servidor";
import {
  armarVista,
  leerContenido,
  type CamposExperiencia,
  type ExperienciaVista,
  type MedioVista,
  type TipoExperiencia,
} from "@/lib/collection/experiencia/contenido";
import {
  armarVistaPagina,
  leerContenidoArticulo,
  leerContenidoPagina,
  mediosDePagina,
  type AliadoVista,
  type ArticuloCardVista,
  type ArticuloVista,
  type DestinoCardVista,
  type ExperienciaCardVista,
  type PaginaVista,
} from "@/lib/collection/paginas/contenido";
import type { EspecialistaVista } from "@/lib/collection/experiencia/contenido";
import { resumen } from "@/lib/collection/sitio";

const ETIQUETA = "col-sitio";
const cache = { tags: [ETIQUETA], revalidate: 3600 };

/** Vacía la caché del sitio. La llaman las actions que cambian algo visible. */
export function invalidarSitio() {
  revalidateTag(ETIQUETA);
}

/** Imagen para Open Graph: el encuadre 1.91:1 si existe, si no la variante más grande (o el póster de un video). */
export function imagenSocial(m: MedioVista | null | undefined): string | null {
  if (!m) return null;
  if (m.tipo === "VIDEO") return m.posterUrl;
  // El encuadre 1.91:1 ya está generado en 1200 × 630.
  if (m.recortes?.["1.91:1"]?.url) return m.recortes["1.91:1"].url;
  const mayor = [...m.variantes].sort((a, b) => b.w - a.w)[0];
  return mayor?.url ?? m.url;
}

// ── Listas ─────────────────────────────────────────────────────────────────

interface ListasSitio {
  destinos: DestinoCardVista[];
  experiencias: (ExperienciaCardVista & { destacada: boolean; destinoIds: string[] })[];
  especialistas: EspecialistaVista[];
  aliados: AliadoVista[];
  articulos: ArticuloCardVista[];
}

/** Todo lo publicado en su orden, de una vez. Las listas del sitio salen de acá. */
const listasSitio = unstable_cache(
  async (): Promise<ListasSitio> => {
    const [m, filas] = await Promise.all([
      cargarMapasPagina(),
      prisma.colExperiencia.findMany({ where: { estado: "PUBLICADA" }, select: { id: true, publicado: true } }),
    ]);
    const destinosDe = new Map(
      filas.map((f) => [f.id, ((f.publicado as { campos?: { destinoIds?: string[] } } | null)?.campos?.destinoIds ?? [])]),
    );
    return {
      destinos: m.destinos,
      experiencias: m.experiencias.map((e) => ({ ...e, destinoIds: destinosDe.get(e.id) ?? [] })),
      especialistas: m.especialistas,
      aliados: m.aliados,
      articulos: m.articulos,
    };
  },
  ["col-sitio-listas"],
  cache,
);

const sinExtras = ({ destacada: _d, destinoIds: _i, ...e }: ListasSitio["experiencias"][number]): ExperienciaCardVista => e;

export async function experienciasPublicadas(f: { destinoSlug?: string; tipo?: TipoExperiencia } = {}) {
  const l = await listasSitio();
  const destino = f.destinoSlug ? l.destinos.find((d) => d.slug === f.destinoSlug) : null;
  if (f.destinoSlug && !destino) return [];
  return l.experiencias
    .filter((e) => (!destino || e.destinoIds.includes(destino.id)) && (!f.tipo || e.tipo === f.tipo))
    .map(sinExtras);
}

export async function destinosPublicados() {
  return (await listasSitio()).destinos;
}

export async function especialistasPublicados() {
  return (await listasSitio()).especialistas;
}

export async function aliadosPublicados() {
  return (await listasSitio()).aliados;
}

export async function articulosPublicados() {
  return (await listasSitio()).articulos;
}

// ── Páginas por bloques ────────────────────────────────────────────────────

export interface PaginaSitio {
  vista: PaginaVista;
  descripcion: string;
  imagen: string | null;
}

/** Inicio, Nosotros y legales. null si nunca se publicó. */
export const paginaPublicada = unstable_cache(
  async (slug: string): Promise<PaginaSitio | null> => {
    const fila = await prisma.colPagina.findUnique({ where: { slug } });
    if (!fila?.publicado) return null;
    const contenido = leerContenidoPagina(fila.publicado);
    const mapas = await cargarMapasPagina({ mediosExtra: mediosDePagina(contenido) });
    const vista = armarVistaPagina(
      { slug: fila.slug, titulo: fila.titulo, actualizadaEn: fila.publicadaEn?.toISOString() ?? null },
      contenido,
      mapas,
    );
    // Google: la bajada de la portada, o el primer texto con contenido.
    let descripcion = "";
    let imagen: string | null = null;
    for (const b of vista.bloques) {
      if (!imagen && "medioVista" in b) imagen = imagenSocial(b.medioVista);
      if (!descripcion) {
        if (b.tipo === "portada") descripcion = b.bajada;
        else if (b.tipo === "manifiesto" || b.tipo === "texto" || b.tipo === "imagenTexto") descripcion = resumen(b.texto);
      }
    }
    return { vista, descripcion: resumen(descripcion), imagen };
  },
  ["col-sitio-pagina"],
  cache,
);

// ── Experiencia ────────────────────────────────────────────────────────────

export type ExperienciaSitio =
  | {
      tipo: "ok";
      vista: ExperienciaVista;
      seoTitulo: string;
      seoDescripcion: string;
      imagen: string | null;
      /** Otras experiencias publicadas del primer destino. */
      relacionadas: ExperienciaCardVista[];
    }
  | { tipo: "redirigir"; a: string };

/**
 * La experiencia publicada, desde su foto `publicado`. Archivada: lleva a su
 * primer destino visible (RN09). Pausada, en borrador o inexistente: null.
 */
export const experienciaPublicada = unstable_cache(
  async (slug: string): Promise<ExperienciaSitio | null> => {
    const fila = await prisma.colExperiencia.findUnique({
      where: { slug },
      select: { id: true, slug: true, estado: true, publicado: true, destinos: { orderBy: { orden: "asc" }, select: { destinoId: true } } },
    });
    if (!fila || !fila.publicado) return null;
    const foto = fila.publicado as { campos: CamposExperiencia; contenido: unknown };
    const l = await listasSitio();

    if (fila.estado === "ARCHIVADA") {
      const ids = foto.campos?.destinoIds?.length ? foto.campos.destinoIds : fila.destinos.map((d) => d.destinoId);
      const destino = ids.map((id) => l.destinos.find((d) => d.id === id)).find(Boolean);
      return { tipo: "redirigir", a: destino ? `/destinos/${destino.slug}` : "/experiencias" };
    }
    if (fila.estado !== "PUBLICADA" || !foto.campos) return null;

    const borrador = { campos: { ...foto.campos, slug: fila.slug ?? slug }, contenido: leerContenido(foto.contenido) };
    const mapas = await cargarMapasVista([borrador]);
    const vista = armarVista(borrador, mapas);
    // Solo se enlazan los destinos que el sitio muestra.
    vista.destinos = vista.destinos.filter((d) => l.destinos.some((x) => x.id === d.id));

    const og = borrador.campos.ogImagenId ? mapas.medios.get(borrador.campos.ogImagenId) : null;
    const primero = vista.destinos[0]?.id;
    return {
      tipo: "ok",
      vista,
      seoTitulo: borrador.campos.seoTitulo || vista.titulo,
      seoDescripcion: borrador.campos.seoDescripcion || resumen(vista.bajada),
      imagen: imagenSocial(og ?? vista.portada),
      relacionadas: primero
        ? l.experiencias.filter((e) => e.id !== fila.id && e.destinoIds.includes(primero)).slice(0, 3).map(sinExtras)
        : [],
    };
  },
  ["col-sitio-experiencia"],
  cache,
);

// ── Destino ────────────────────────────────────────────────────────────────

export interface DestinoSitio {
  card: DestinoCardVista;
  relato: string;
  seoTitulo: string;
  seoDescripcion: string;
  imagen: string | null;
  experiencias: ExperienciaCardVista[];
}

export const destinoPublicado = unstable_cache(
  async (slug: string): Promise<DestinoSitio | null> => {
    const l = await listasSitio();
    const card = l.destinos.find((d) => d.slug === slug);
    if (!card) return null;
    const fila = await prisma.colDestino.findUnique({
      where: { id: card.id },
      select: { relato: true, seoTitulo: true, seoDescripcion: true },
    });
    if (!fila) return null;
    return {
      card,
      relato: fila.relato,
      seoTitulo: fila.seoTitulo || card.nombre,
      seoDescripcion: fila.seoDescripcion || resumen(card.bajada || fila.relato),
      imagen: imagenSocial(card.portada),
      experiencias: l.experiencias.filter((e) => e.destinoIds.includes(card.id)).map(sinExtras),
    };
  },
  ["col-sitio-destino"],
  cache,
);

// ── Journal ────────────────────────────────────────────────────────────────

export interface ArticuloSitio {
  vista: ArticuloVista;
  seoTitulo: string;
  seoDescripcion: string;
  imagen: string | null;
}

/** El artículo por el slug de su foto publicada (el que usan las tarjetas). */
export const articuloPublicado = unstable_cache(
  async (slug: string): Promise<ArticuloSitio | null> => {
    const fila = await prisma.colArticulo.findFirst({
      where: { estado: "PUBLICADO", publicado: { path: ["campos", "slug"], equals: slug } },
      select: { id: true, publicado: true, publicadoEn: true },
    });
    if (!fila) return null;
    const foto = fila.publicado as unknown as FotoArticulo;
    const contenido = leerContenidoArticulo(foto.contenido);
    const extra = contenido.galeria.map((g) => g.medioId);
    if (foto.campos.portadaId) extra.push(foto.campos.portadaId);

    const [mapas, autor, l] = await Promise.all([
      cargarMapasPagina({ mediosExtra: extra }),
      foto.campos.autorId
        ? prisma.colEspecialista.findUnique({ where: { id: foto.campos.autorId }, include: { retrato: true } })
        : null,
      listasSitio(),
    ]);
    const card = articuloCard(fila, mapas.medios);
    if (!card) return null;
    const galeria = contenido.galeria
      .map((g) => mapas.medios.get(g.medioId))
      .filter((m): m is MedioVista => !!m);
    return {
      vista: {
        ...card,
        cuerpo: contenido.cuerpo,
        galeria,
        autor: autor ? especialistaAVista(autor) : null,
        experiencias: (foto.campos.experienciaIds ?? [])
          .map((id) => l.experiencias.find((e) => e.id === id))
          .filter((e): e is ListasSitio["experiencias"][number] => !!e)
          .map(sinExtras),
      },
      seoTitulo: foto.campos.seoTitulo || card.titulo,
      seoDescripcion: foto.campos.seoDescripcion || resumen(card.bajada),
      imagen: imagenSocial(card.portada),
    };
  },
  ["col-sitio-articulo"],
  cache,
);

// ── Sitemap ────────────────────────────────────────────────────────────────

export const slugsParaSitemap = unstable_cache(
  async (): Promise<{ ruta: string; modificada: string | null }[]> => {
    const [l, paginas, exps, destinos] = await Promise.all([
      listasSitio(),
      prisma.colPagina.findMany({ where: { publicadaEn: { not: null } }, select: { slug: true, publicadaEn: true } }),
      prisma.colExperiencia.findMany({ where: { estado: "PUBLICADA" }, select: { slug: true, updatedAt: true } }),
      prisma.colDestino.findMany({ where: { estado: "PUBLICADO" }, select: { slug: true, updatedAt: true } }),
    ]);
    const fijas = ["/experiencias", "/destinos", "/especialistas", "/aliados", "/contacto"];
    if (l.articulos.length) fijas.push("/journal");
    return [
      ...paginas.map((p) => ({ ruta: p.slug === "inicio" ? "/" : `/${p.slug}`, modificada: p.publicadaEn?.toISOString() ?? null })),
      ...fijas.map((ruta) => ({ ruta, modificada: null })),
      ...destinos.map((d) => ({ ruta: `/destinos/${d.slug}`, modificada: d.updatedAt.toISOString() })),
      ...exps.flatMap((e) => (e.slug ? [{ ruta: `/experiencias/${e.slug}`, modificada: e.updatedAt.toISOString() }] : [])),
      ...l.articulos.map((a) => ({ ruta: `/journal/${a.slug}`, modificada: a.publicadoEn })),
    ];
  },
  ["col-sitio-sitemap"],
  cache,
);
