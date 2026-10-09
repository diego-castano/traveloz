// Ajustes de Traveloz Collection. Viven en SiteSetting (group "collection",
// claves con prefijo "collection_"). Sin "use server": lectura pura que usan
// el sitio, las actions de consultas y el panel.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const GRUPO_AJUSTES = "collection";
export const TAG_SITIO = "col-sitio";

export interface AjustesCollection {
  /** E.164 con "+" (ej. +59899123456). */
  whatsapp: string;
  /** Lista separada por comas. */
  emailsConsultas: string;
  /** SOURCE_ID de Bitrix. Vacío = el de por defecto (Web). */
  bitrixOrigen: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  textoFooter: string;
  seoTitulo: string;
  seoDescripcion: string;
  seoImagenId: string;
  /** "1" = el sitio se deja indexar. */
  indexar: "0" | "1";
  /** Ej. "Lunes a viernes de 9 a 18". */
  horario: string;
}

export const CLAVES_AJUSTES = [
  "whatsapp",
  "emailsConsultas",
  "bitrixOrigen",
  "instagram",
  "facebook",
  "linkedin",
  "textoFooter",
  "seoTitulo",
  "seoDescripcion",
  "seoImagenId",
  "indexar",
  "horario",
] as const satisfies readonly (keyof AjustesCollection)[];

export const AJUSTES_VACIOS: AjustesCollection = {
  whatsapp: "",
  emailsConsultas: "",
  bitrixOrigen: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  textoFooter: "",
  seoTitulo: "",
  seoDescripcion: "",
  seoImagenId: "",
  indexar: "0",
  horario: "",
};

export const clave = (k: keyof AjustesCollection) => `collection_${k}`;

export function ajustesDesdeFilas(filas: { key: string; value: string }[]): AjustesCollection {
  const mapa = new Map(filas.map((f) => [f.key, f.value]));
  const a: Record<string, string> = { ...AJUSTES_VACIOS };
  for (const k of CLAVES_AJUSTES) a[k] = mapa.get(clave(k)) ?? a[k];
  a.indexar = a.indexar === "1" ? "1" : "0";
  return a as unknown as AjustesCollection;
}

/** Lectura sin caché (el panel la usa para mostrar siempre lo guardado). */
export async function leerAjustesSinCache(): Promise<AjustesCollection> {
  const filas = await prisma.siteSetting.findMany({
    where: { group: GRUPO_AJUSTES },
    select: { key: true, value: true },
  });
  return ajustesDesdeFilas(filas);
}

/** Lectura para el sitio. Se invalida con `revalidateTag("col-sitio")`. */
export const leerAjustesCollection = unstable_cache(
  async (): Promise<AjustesCollection> => {
    try {
      return await leerAjustesSinCache();
    } catch {
      return AJUSTES_VACIOS;
    }
  },
  ["col-ajustes"],
  { revalidate: 300, tags: [TAG_SITIO] },
);

/** true solo si el super admin prendió "indexar". */
export async function sitioIndexableDesdeAjustes(): Promise<boolean> {
  return (await leerAjustesCollection()).indexar === "1";
}
