// ---------------------------------------------------------------------------
// Slug del paquete - generación automática y unicidad.
//
// Regla de producto: el operador NUNCA tiene que escribir el slug. Se deriva del
// título y se persiste solo en cualquier guardado. Sigue siendo visible y
// editable en la pestaña Publicación, pero no bloquea la publicación (ver
// `src/lib/paquete-publicable.ts`, que ya no lo exige).
//
// Regla dura: un paquete YA publicado nunca cambia de slug de forma automática
// -rompería links vivos y el SEO-. Sólo cambia si el operador escribe otro a
// mano. Lo único que sí hacemos sobre un publicado es COMPLETAR el slug cuando
// falta: sin slug la grilla pública renderiza `href="#"` (PackageCard) y la
// tarjeta no lleva a ningún lado, así que generarlo sólo puede mejorar.
//
// Vive en su propio módulo (sin "use server") para poder importarse desde los
// dos server actions que guardan paquetes (`package.actions` y
// `paquete-frontend.actions`) sin exponer nada al cliente.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * `Paquete.slug` es `@unique` global (no por marca). Devuelve `base` si está
 * libre, o el primer `base-N` (N = 2, 3, …) que no esté tomado. El propio
 * paquete se excluye de la búsqueda, así que reconfirmar su slug actual nunca
 * le agrega un sufijo.
 *
 * Sólo lee (findMany): no escribe nada.
 */
export async function ensureUniqueSlug(
  base: string,
  paqueteId: string,
): Promise<string> {
  const root = base || "paquete";
  const existing = await prisma.paquete.findMany({
    where: { slug: { startsWith: root }, NOT: { id: paqueteId } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((e) => e.slug).filter(Boolean) as string[]);
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

/**
 * ¿El slug guardado es el que se generaría desde ese título? Mismo criterio que
 * usa el "piloto automático" de la pestaña Publicación (PublicacionTab) para
 * decidir si puede seguir al título o si el operador eligió una URL propia.
 * Comparación exacta a propósito: si el slug arrastra un sufijo de unicidad
 * (`-2`) lo tratamos como elegido a mano y dejamos de tocarlo, antes que
 * arriesgarnos a pisar un slug manual del estilo `brasil-2026`.
 */
export function esSlugAutomatico(
  slug: string | null | undefined,
  titulo: string | null | undefined,
): boolean {
  if (!slug) return false;
  return slug === slugify(titulo ?? "");
}

/**
 * Decide el slug que hay que persistir en un guardado. Devuelve `undefined`
 * cuando no hay nada que escribir (el caso común, sin costo de DB).
 *
 *   • Sin slug            → lo genera desde el título (con unicidad). Aplica
 *                           también a un paquete publicado: completar el hueco
 *                           arregla el `href="#"` de la grilla.
 *   • Publicado con slug  → nunca se toca.
 *   • Borrador con slug automático y título cambiado → lo regenera desde el
 *                           título nuevo.
 *   • Borrador con slug propio (escrito a mano) → no se toca.
 */
export async function resolveSlugOnSave(params: {
  paqueteId: string;
  slugActual: string | null;
  tituloActual: string;
  /** Título entrante en este guardado (undefined si el payload no lo trae). */
  tituloEntrante?: string;
  /** `publicado` o estado ACTIVO: el paquete ya está (o estuvo) en el sitio. */
  publicado: boolean;
}): Promise<string | undefined> {
  const { paqueteId, slugActual, tituloActual, tituloEntrante, publicado } =
    params;

  if (!slugActual) {
    const titulo = tituloEntrante ?? tituloActual;
    return ensureUniqueSlug(slugify(titulo), paqueteId);
  }

  // Publicado: la URL ya está viva. Sólo cambia a mano.
  if (publicado) return undefined;

  if (tituloEntrante === undefined) return undefined;
  if (!esSlugAutomatico(slugActual, tituloActual)) return undefined;

  const next = slugify(tituloEntrante);
  if (!next || next === slugActual) return undefined;
  return ensureUniqueSlug(next, paqueteId);
}
