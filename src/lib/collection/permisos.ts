// Permisos de Traveloz Collection. Capa propia por usuario (ColPermiso),
// independiente del rol de Traveloz. Sin "use server": nada de acá se expone
// como endpoint; lo usan las actions y el layout.

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth, type AuthContext } from "@/lib/require-auth";
import { ErrorDeNegocio } from "@/lib/presupuesto/acceso";

const log = logger.child({ module: "collection.permisos" });

export const PERMISOS_COLLECTION = [
  "panel",
  "experiencias.editar",
  "experiencias.publicar",
  "sitio.editar",
  "medios.editar",
  "consultas.ver",
] as const;

export type PermisoCollection = (typeof PERMISOS_COLLECTION)[number];

export const PERMISOS_INFO: Record<
  PermisoCollection,
  { label: string; descripcion: string }
> = {
  panel: {
    label: "Entrar al panel",
    descripcion: "Abre Collection y ve el inicio y la biblioteca. Hace falta para todo lo demás.",
  },
  "experiencias.editar": {
    label: "Editar experiencias",
    descripcion: "Crea y modifica experiencias y destinos, sin publicarlos.",
  },
  "experiencias.publicar": {
    label: "Publicar experiencias",
    descripcion: "Publica, pausa y archiva experiencias en el sitio.",
  },
  "sitio.editar": {
    label: "Editar el sitio",
    descripcion: "Cambia páginas, aliados, testimonios, preguntas, journal y ajustes.",
  },
  "medios.editar": {
    label: "Gestionar medios",
    descripcion: "Sube, edita y elimina fotos y videos de la biblioteca.",
  },
  "consultas.ver": {
    label: "Ver consultas",
    descripcion: "Lee las consultas que llegan desde el sitio de Collection.",
  },
};

export interface AccesoCollection {
  superAdmin: boolean;
  permisos: PermisoCollection[];
}

/** null = sin fila, o sin `panel` y no super admin. */
export async function getAccesoCollection(
  userId: string,
): Promise<AccesoCollection | null> {
  const fila = await prisma.colPermiso.findUnique({ where: { userId } });
  if (!fila) return null;
  const permisos = fila.permisos.filter((p): p is PermisoCollection =>
    (PERMISOS_COLLECTION as readonly string[]).includes(p),
  );
  if (!fila.superAdmin && !permisos.includes("panel")) return null;
  return { superAdmin: fila.superAdmin, permisos };
}

export function puede(
  acceso: AccesoCollection | null,
  permiso: PermisoCollection,
): boolean {
  if (!acceso) return false;
  if (acceso.superAdmin) return true;
  return acceso.permisos.includes("panel") && acceso.permisos.includes(permiso);
}

export async function requireCollection(
  permiso?: PermisoCollection,
): Promise<AuthContext & { acceso: AccesoCollection }> {
  const ctx = await requireAuth();
  const acceso = await getAccesoCollection(ctx.userId);
  if (!acceso) throw new ErrorDeNegocio("No tenés acceso a Collection.");
  if (permiso && !puede(acceso, permiso)) {
    throw new ErrorDeNegocio("No tenés permiso para esto.");
  }
  return { ...ctx, acceso };
}

export async function requireColSuperAdmin() {
  const ctx = await requireCollection();
  if (!ctx.acceso.superAdmin) {
    throw new ErrorDeNegocio("No tenés permiso para esto.");
  }
  return ctx;
}

/** Historial de Collection. Best-effort: un fallo acá nunca tumba la acción. */
export async function registrarEventoCol(e: {
  entidad: string;
  entidadId: string;
  accion: string;
  userId?: string | null;
  detalle?: unknown;
}): Promise<void> {
  try {
    await prisma.colEvento.create({
      data: {
        entidad: e.entidad,
        entidadId: e.entidadId,
        accion: e.accion,
        userId: e.userId ?? null,
        detalle: e.detalle === undefined ? undefined : (e.detalle as object),
      },
    });
  } catch (err) {
    log.warn("registrarEventoCol.fail", { err, entidad: e.entidad, accion: e.accion });
  }
}
