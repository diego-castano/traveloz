// ---------------------------------------------------------------------------
// Slug del link personal del vendedor (/datos-de-pasajeros/<slug> y
// /datos-de-pago/<slug>).
//
// Vive acá y no en user.actions.ts porque ese módulo es "use server": todo lo
// que exporta tiene que ser una server action. Desde acá lo usan el alta de
// usuarios (createUser), el botón "Generar link" del admin (regenerarSlug) y
// el self-heal de getMiLink.
//
// Criterio de limpieza: el mismo normalizeSlug de cotizador.ts. Los nombres
// reservados también se esquivan: el namespace de los links personales es
// distinto al de los landings, pero un slug "c" o "datos-de-pasajeros" es
// pedir problemas gratis.
// ---------------------------------------------------------------------------

import { normalizeSlug, RESERVED_SLUGS } from "@/lib/cotizador";

export interface SlugUnicoOpts {
  /** Al regenerar, el propio usuario no cuenta como colisión consigo mismo. */
  excluirId?: string;
  /** Base alternativa cuando el nombre no deja ni una letra utilizable. */
  fallback?: string;
  /**
   * Gancho para tests: responde si un slug ya está tomado. Por defecto
   * consulta la tabla User. El import de Prisma es dinámico a propósito, así
   * un test que inyecta su propio checker no abre conexión contra la DB.
   */
  existe?: (slug: string) => Promise<boolean>;
}

/** Tope del bucle de colisiones antes de caer a un sufijo aleatorio. */
const MAX_INTENTOS = 50;

async function slugTomadoEnDb(slug: string, excluirId?: string): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
  const otro = await prisma.user.findFirst({
    where: { slug, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true },
  });
  return otro !== null;
}

/**
 * Convierte un nombre en un slug libre: sin acentos, en minúsculas, con
 * guiones, con sufijo numérico si ya lo usa otra persona o si cae en
 * RESERVED_SLUGS.
 *
 * Devuelve null cuando del nombre (y del fallback) no queda nada: quien llama
 * decide si eso es un error visible o simplemente no hay link todavía.
 */
export async function slugUnicoParaUsuario(
  nombre: string | null | undefined,
  opts: SlugUnicoOpts = {},
): Promise<string | null> {
  const base = normalizeSlug(nombre ?? "") || normalizeSlug(opts.fallback ?? "");
  if (!base) return null;

  const existe =
    opts.existe ?? ((slug: string) => slugTomadoEnDb(slug, opts.excluirId));

  let candidato = base;
  let sufijo = 2;
  // eslint-disable-next-line no-await-in-loop -- las colisiones son raras y el bucle corta apenas encuentra un slug libre
  while (RESERVED_SLUGS.has(candidato) || (await existe(candidato))) {
    if (sufijo > MAX_INTENTOS) {
      // Salida de emergencia: un sufijo random en vez de contar hasta el
      // infinito. Sigue siendo legible y sigue siendo único.
      candidato = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      break;
    }
    candidato = `${base}-${sufijo}`;
    sufijo += 1;
  }

  return candidato;
}
