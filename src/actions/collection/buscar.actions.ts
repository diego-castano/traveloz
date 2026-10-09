"use server";

// Búsqueda de la paleta ⌘K: experiencias, destinos, artículos y especialistas
// por título (las páginas son fijas y se buscan en el cliente). Solo lectura,
// hasta 5 por grupo, con miniatura.
// Contrato { ok, data } | { ok, error }.

import { prisma } from "@/lib/db";
import { requireCollection } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";

export type GrupoBusqueda = "experiencias" | "destinos" | "articulos" | "paginas" | "especialistas";

export interface ResultadoBusqueda {
  id: string;
  grupo: GrupoBusqueda;
  titulo: string;
  detalle: string;
  href: string;
  miniatura: string | null;
}

const POR_GRUPO = 5;
const insensible = (q: string) => ({ contains: q, mode: "insensitive" as const });

interface MedioMin {
  url: string;
  tipo: string;
  posterUrl: string | null;
  variantes: unknown;
}

/** La variante más chica que alcance para 80 px; si no hay, la original (o el póster del video). */
function miniatura(m: MedioMin | null): string | null {
  if (!m) return null;
  if (m.tipo === "VIDEO") return m.posterUrl;
  const vs = (Array.isArray(m.variantes) ? m.variantes : []) as { w: number; url: string }[];
  const chica = vs.filter((v) => v.w >= 80).sort((a, b) => a.w - b.w)[0];
  return chica?.url ?? m.url;
}

const medio = { select: { url: true, tipo: true, posterUrl: true, variantes: true } } as const;

const ESTADO_EXP: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADA: "Publicada",
  PAUSADA: "Pausada",
  ARCHIVADA: "Archivada",
};
const ESTADO_ART: Record<string, string> = { BORRADOR: "Borrador", PUBLICADO: "Publicado", ARCHIVADO: "Archivado" };
const ESTADO_DEST: Record<string, string> = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
  PROXIMAMENTE: "Próximamente",
  ARCHIVADO: "Archivado",
};

export async function buscarEnCollection(texto: string): Promise<Resultado<ResultadoBusqueda[]>> {
  return ejecutar("buscarEnCollection", async () => {
    await requireCollection("panel");
    const q = texto.trim().slice(0, 80);
    if (q.length < 2) return [];

    const [exps, dests, arts, esps] = await Promise.all([
      prisma.colExperiencia.findMany({
        where: { titulo: insensible(q) },
        select: { id: true, titulo: true, estado: true, portada: medio },
        orderBy: { updatedAt: "desc" },
        take: POR_GRUPO,
      }),
      prisma.colDestino.findMany({
        where: { nombre: insensible(q) },
        select: { id: true, nombre: true, estado: true, portada: medio },
        orderBy: { orden: "asc" },
        take: POR_GRUPO,
      }),
      prisma.colArticulo.findMany({
        where: { titulo: insensible(q) },
        select: { id: true, titulo: true, estado: true, portada: medio },
        orderBy: { updatedAt: "desc" },
        take: POR_GRUPO,
      }),
      prisma.colEspecialista.findMany({
        where: { nombre: insensible(q) },
        select: { id: true, nombre: true, publicado: true, retrato: medio },
        orderBy: { nombre: "asc" },
        take: POR_GRUPO,
      }),
    ]);

    return [
      ...exps.map((e) => ({
        id: e.id,
        grupo: "experiencias" as const,
        titulo: e.titulo || "Sin título",
        detalle: ESTADO_EXP[e.estado] ?? e.estado,
        href: `/backend/collection/experiencias/${e.id}`,
        miniatura: miniatura(e.portada),
      })),
      ...dests.map((d) => ({
        id: d.id,
        grupo: "destinos" as const,
        titulo: d.nombre || "Sin nombre",
        detalle: ESTADO_DEST[d.estado] ?? d.estado,
        href: `/backend/collection/destinos?abrir=${d.id}`,
        miniatura: miniatura(d.portada),
      })),
      ...arts.map((a) => ({
        id: a.id,
        grupo: "articulos" as const,
        titulo: a.titulo || "Sin título",
        detalle: ESTADO_ART[a.estado] ?? a.estado,
        href: `/backend/collection/journal/${a.id}`,
        miniatura: miniatura(a.portada),
      })),
      ...esps.map((e) => ({
        id: e.id,
        grupo: "especialistas" as const,
        titulo: e.nombre,
        detalle: e.publicado ? "Publicado" : "Oculto",
        href: `/backend/collection/especialistas?abrir=${e.id}`,
        miniatura: miniatura(e.retrato),
      })),
    ];
  });
}
