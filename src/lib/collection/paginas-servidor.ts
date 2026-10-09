// Carga desde la base lo que necesita `armarVistaPagina` (contrato en
// paginas/contenido.ts) y convierte filas en las vistas del sitio. Las listas
// salen SOLO de lo publicado: las experiencias y los artículos, de su foto
// `publicado`, no de las columnas de trabajo.

import type { ColAliado, ColDestino, ColMedio, ColPregunta, ColTestimonio } from "@prisma/client";
import { prisma } from "@/lib/db";
import { medioAVista, especialistaAVista } from "@/lib/collection/vista-servidor";
import { leerContenido, nochesTotales, type MedioVista, type TipoExperiencia } from "@/lib/collection/experiencia/contenido";
import type {
  AliadoVista,
  ArticuloCardVista,
  DestinoCardVista,
  ExperienciaCardVista,
  MapasPagina,
  PreguntaVista,
  TestimonioVista,
  TipoArticulo,
} from "@/lib/collection/paginas/contenido";

type Medios = Map<string, MedioVista>;
const medioDe = (medios: Medios, id: string | null | undefined) => (id ? medios.get(id) ?? null : null);

export function destinoCard(
  row: Pick<ColDestino, "id" | "slug" | "nombre" | "bajada" | "portadaId" | "estado">,
  medios: Medios,
  experiencias: number,
): DestinoCardVista {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    bajada: row.bajada,
    portada: medioDe(medios, row.portadaId),
    experiencias,
    proximamente: row.estado === "PROXIMAMENTE",
  };
}

/** Lo mínimo que se lee de la foto `publicado` de una experiencia. */
interface FotoExperiencia {
  campos?: {
    titulo?: string;
    bajada?: string;
    tipo?: TipoExperiencia;
    portadaId?: string | null;
    destinoIds?: string[];
    mostrarPrecio?: boolean;
    precioDesde?: number | null;
  };
  contenido?: unknown;
}

export function experienciaCard(
  row: { id: string; slug: string | null; publicado: unknown },
  medios: Medios,
  nombresDestino: Map<string, string>,
): ExperienciaCardVista | null {
  const foto = row.publicado as FotoExperiencia | null;
  if (!foto?.campos || !row.slug) return null;
  const c = foto.campos;
  return {
    id: row.id,
    slug: row.slug,
    titulo: c.titulo ?? "",
    bajada: c.bajada ?? "",
    tipo: c.tipo ?? "VIAJE",
    portada: medioDe(medios, c.portadaId),
    noches: nochesTotales(leerContenido(foto.contenido)),
    destinos: (c.destinoIds ?? []).map((d) => nombresDestino.get(d)).filter((n): n is string => !!n),
    precioDesde: c.mostrarPrecio ? c.precioDesde ?? null : null,
  };
}

export function testimonioVista(row: ColTestimonio, medios: Medios): TestimonioVista {
  return {
    id: row.id,
    nombre: row.nombre,
    lugar: row.lugar,
    viaje: row.viaje,
    cita: row.cita,
    foto: medioDe(medios, row.fotoId),
  };
}

export function aliadoVista(row: ColAliado, medios: Medios): AliadoVista {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    descripcion: row.descripcion,
    url: row.url,
    logo: medioDe(medios, row.logoId),
  };
}

export function preguntaVista(row: ColPregunta): PreguntaVista {
  return { id: row.id, pregunta: row.pregunta, respuesta: row.respuesta, categoria: row.categoria };
}

/** Lo que guarda `publicado` de un artículo. */
export interface FotoArticulo {
  campos: {
    slug: string;
    tipo: TipoArticulo;
    titulo: string;
    bajada: string;
    portadaId: string | null;
    autorId: string | null;
    seoTitulo: string;
    seoDescripcion: string;
    experienciaIds: string[];
  };
  contenido: unknown;
  minutos: number;
}

export function articuloCard(
  row: { id: string; publicado: unknown; publicadoEn: Date | null },
  medios: Medios,
): ArticuloCardVista | null {
  const foto = row.publicado as FotoArticulo | null;
  if (!foto?.campos?.slug) return null;
  const c = foto.campos;
  return {
    id: row.id,
    slug: c.slug,
    tipo: c.tipo,
    titulo: c.titulo,
    bajada: c.bajada,
    minutos: foto.minutos ?? 1,
    portada: medioDe(medios, c.portadaId),
    publicadoEn: row.publicadoEn?.toISOString() ?? null,
  };
}

/** Todo lo publicado, en su orden, más los medios que esas filas y `mediosExtra` usan. */
export async function cargarMapasPagina(opts: { mediosExtra?: string[] } = {}): Promise<MapasPagina> {
  const [destinos, experiencias, especialistas, testimonios, aliados, preguntas, articulos] = await Promise.all([
    prisma.colDestino.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        slug: true,
        nombre: true,
        bajada: true,
        portadaId: true,
        estado: true,
        _count: { select: { experiencias: { where: { experiencia: { estado: "PUBLICADA" } } } } },
      },
    }),
    prisma.colExperiencia.findMany({
      where: { estado: "PUBLICADA" },
      orderBy: [{ orden: "asc" }, { updatedAt: "desc" }],
      select: { id: true, slug: true, publicado: true, destacada: true },
    }),
    prisma.colEspecialista.findMany({
      where: { publicado: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { retrato: true },
    }),
    prisma.colTestimonio.findMany({ where: { publicado: true }, orderBy: [{ orden: "asc" }, { createdAt: "desc" }] }),
    prisma.colAliado.findMany({ where: { publicado: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.colPregunta.findMany({ where: { publicada: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
    prisma.colArticulo.findMany({
      where: { estado: "PUBLICADO" },
      orderBy: { publicadoEn: "desc" },
      select: { id: true, publicado: true, publicadoEn: true },
    }),
  ]);

  const destinosVisibles = destinos.filter((d) => d.estado === "PUBLICADO" || d.estado === "PROXIMAMENTE");
  const nombresDestino = new Map(destinos.map((d) => [d.id, d.nombre]));

  const medioIds = new Set<string>(opts.mediosExtra ?? []);
  const sumar = (id: string | null | undefined) => id && medioIds.add(id);
  destinosVisibles.forEach((d) => sumar(d.portadaId));
  experiencias.forEach((e) => sumar((e.publicado as FotoExperiencia | null)?.campos?.portadaId));
  especialistas.forEach((e) => sumar(e.retratoId));
  testimonios.forEach((t) => sumar(t.fotoId));
  aliados.forEach((a) => sumar(a.logoId));
  articulos.forEach((a) => sumar((a.publicado as FotoArticulo | null)?.campos?.portadaId));

  const filasMedio: ColMedio[] = medioIds.size
    ? await prisma.colMedio.findMany({ where: { id: { in: Array.from(medioIds) } } })
    : [];
  const medios: Medios = new Map(filasMedio.map((m) => [m.id, medioAVista(m)]));

  return {
    medios,
    destinos: destinosVisibles.map((d) => destinoCard(d, medios, d._count.experiencias)),
    experiencias: experiencias.flatMap((e) => {
      const card = experienciaCard(e, medios, nombresDestino);
      return card ? [{ ...card, destacada: e.destacada }] : [];
    }),
    especialistas: especialistas.map(especialistaAVista),
    testimonios: testimonios.map((t) => testimonioVista(t, medios)),
    aliados: aliados.map((a) => aliadoVista(a, medios)),
    preguntas: preguntas.map(preguntaVista),
    articulos: articulos.flatMap((a) => {
      const card = articuloCard(a, medios);
      return card ? [card] : [];
    }),
  };
}
