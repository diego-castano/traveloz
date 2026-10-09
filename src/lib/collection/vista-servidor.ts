// Carga desde la base lo que necesita `armarVista` (contrato en
// experiencia/contenido.ts) y arma el borrador desde una fila.

import type { ColMedio, ColEspecialista } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  leerContenido,
  mediosUsados,
  type BorradorExperiencia,
  type CamposExperiencia,
  type EspecialistaVista,
  type FotoCatalogo,
  type MapasVista,
  type MedioVista,
  type TipoExperiencia,
} from "@/lib/collection/experiencia/contenido";
import { leerRecortes } from "@/lib/collection/recortes";

export function medioAVista(row: ColMedio): MedioVista {
  return {
    id: row.id,
    tipo: row.tipo,
    url: row.url,
    variantes: (row.variantes as unknown as MedioVista["variantes"]) ?? [],
    ancho: row.ancho,
    alto: row.alto,
    colorDominante: row.colorDominante,
    placeholder: row.placeholder,
    alt: row.alt,
    leyenda: row.leyenda,
    credito: row.credito,
    focoX: row.focoX,
    focoY: row.focoY,
    posterUrl: row.posterUrl,
    duracion: row.duracion,
    recortes: leerRecortes(row.recortes),
  };
}

export function especialistaAVista(
  e: ColEspecialista & { retrato: ColMedio | null },
): EspecialistaVista {
  return {
    id: e.id,
    nombre: e.nombre,
    region: e.region,
    frase: e.frase,
    idiomas: e.idiomas,
    retrato: e.retrato ? medioAVista(e.retrato) : null,
    whatsapp: e.whatsapp,
    email: e.email,
    telefono: e.telefono,
  };
}

const FOTOS_POR_HOTEL = 6;

/** Fotos del catálogo por alojamiento, las primeras 6 por orden. */
export async function fotosDeAlojamientos(ids: string[]): Promise<Map<string, FotoCatalogo[]>> {
  const mapa = new Map<string, FotoCatalogo[]>();
  if (!ids.length) return mapa;
  const fotos = await prisma.alojamientoFoto.findMany({
    where: { alojamientoId: { in: ids } },
    orderBy: [{ alojamientoId: "asc" }, { orden: "asc" }],
    select: { alojamientoId: true, url: true, alt: true },
  });
  for (const f of fotos) {
    const l = mapa.get(f.alojamientoId) ?? [];
    if (l.length < FOTOS_POR_HOTEL) l.push({ url: f.url, alt: f.alt });
    mapa.set(f.alojamientoId, l);
  }
  return mapa;
}

/**
 * Carga todo lo que usan los borradores. Con `todos` suma además todos los
 * especialistas (opciones del constructor).
 */
export async function cargarMapasVista(
  borradores: BorradorExperiencia[],
  opts: { todos?: boolean } = {},
): Promise<MapasVista> {
  const medioIds = new Set<string>();
  const destinoIds = new Set<string>();
  const especialistaIds = new Set<string>();
  const alojamientoIds = new Set<string>();
  for (const b of borradores) {
    mediosUsados(b).forEach((id) => medioIds.add(id));
    b.campos.destinoIds.forEach((id) => destinoIds.add(id));
    if (b.campos.especialistaId) especialistaIds.add(b.campos.especialistaId);
    for (const t of b.contenido.tramos) {
      if (t.hotel?.alojamientoId) alojamientoIds.add(t.hotel.alojamientoId);
    }
  }

  const [destinos, especialistas, fotosHotel] = await Promise.all([
    prisma.colDestino.findMany({
      where: { id: { in: Array.from(destinoIds) } },
      select: { id: true, nombre: true, slug: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.colEspecialista.findMany({
      where: opts.todos ? {} : { id: { in: Array.from(especialistaIds) } },
      include: { retrato: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    fotosDeAlojamientos(Array.from(alojamientoIds)),
  ]);
  especialistas.forEach((e) => e.retratoId && medioIds.add(e.retratoId));

  const medios = medioIds.size
    ? await prisma.colMedio.findMany({ where: { id: { in: Array.from(medioIds) } } })
    : [];

  return {
    medios: new Map(medios.map((m) => [m.id, medioAVista(m)])),
    destinos: new Map(destinos.map((d) => [d.id, d])),
    especialistas: new Map(especialistas.map((e) => [e.id, especialistaAVista(e)])),
    fotosHotel,
  };
}

interface FilaBorrador {
  titulo: string;
  bajada: string;
  slug: string | null;
  tipo: string;
  especialistaId: string | null;
  proveedorId: string | null;
  portadaId: string | null;
  ogImagenId: string | null;
  destacada: boolean;
  mostrarPrecio: boolean;
  precioDesde: number | null;
  seoTitulo: string;
  seoDescripcion: string;
  contenido: unknown;
  destinos: { destinoId: string; orden: number }[];
}

/** Columnas editables de una fila como `CamposExperiencia`. */
export function camposDeFila(row: FilaBorrador): CamposExperiencia {
  return {
    titulo: row.titulo,
    bajada: row.bajada,
    slug: row.slug ?? "",
    tipo: row.tipo as TipoExperiencia,
    destinoIds: [...row.destinos].sort((a, b) => a.orden - b.orden).map((d) => d.destinoId),
    especialistaId: row.especialistaId,
    proveedorId: row.proveedorId,
    portadaId: row.portadaId,
    destacada: row.destacada,
    mostrarPrecio: row.mostrarPrecio,
    precioDesde: row.precioDesde,
    seoTitulo: row.seoTitulo,
    seoDescripcion: row.seoDescripcion,
    ogImagenId: row.ogImagenId,
  };
}

export function borradorDeFila(row: FilaBorrador): BorradorExperiencia {
  return { campos: camposDeFila(row), contenido: leerContenido(row.contenido) };
}

