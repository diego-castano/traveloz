"use server";

// ---------------------------------------------------------------------------
// Orden GLOBAL de los módulos de la pestaña "Publicación" del editor de
// paquetes. Se guarda como una única fila en SiteSetting (key/value), así que
// vale para toda la agencia: si un operador reordena, el nuevo orden lo ven
// todos en su próximo paquete / recarga. No toca el sitio público, por eso no
// revalida tags públicos (a diferencia de site-settings.actions).
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { requireCanEdit } from "@/lib/require-auth";
import { logger } from "@/lib/logger";
import {
  DEFAULT_PUBLICACION_ORDEN,
  PUBLICACION_ORDEN_SETTING_KEY,
  sanitizePublicacionOrden,
  type PublicacionModuloId,
} from "@/lib/publicacion-modulos";

const log = logger.child({ module: "publicacion-orden.actions" });

/** Lee el orden guardado. Degrada al orden por defecto ante cualquier fallo
 *  (DB caída, JSON corrupto) para que la pestaña nunca quede sin renderizar. */
export async function getPublicacionModulosOrden(): Promise<
  PublicacionModuloId[]
> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: PUBLICACION_ORDEN_SETTING_KEY },
    });
    if (!row?.value) return DEFAULT_PUBLICACION_ORDEN;
    return sanitizePublicacionOrden(JSON.parse(row.value));
  } catch (err) {
    log.warn("getPublicacionModulosOrden failed, using default", { err });
    return DEFAULT_PUBLICACION_ORDEN;
  }
}

/** Persiste un nuevo orden (normalizado). Requiere permiso de edición. */
export async function savePublicacionModulosOrden(
  order: string[],
): Promise<PublicacionModuloId[]> {
  await requireCanEdit();
  const sanitized = sanitizePublicacionOrden(order);
  await prisma.siteSetting.upsert({
    where: { key: PUBLICACION_ORDEN_SETTING_KEY },
    update: { value: JSON.stringify(sanitized) },
    create: {
      key: PUBLICACION_ORDEN_SETTING_KEY,
      value: JSON.stringify(sanitized),
      type: "text",
      group: "backend-ui",
      label: "Orden de los módulos de la pestaña Publicación",
    },
  });
  return sanitized;
}
