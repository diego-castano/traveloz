"use server";

// Equipo de Collection: quién entra y qué puede hacer cada persona.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/require-auth";
import { ErrorDeNegocio, fallar } from "@/lib/presupuesto/acceso";
import {
  PERMISOS_COLLECTION,
  getAccesoCollection,
  registrarEventoCol,
  requireColSuperAdmin,
  type PermisoCollection,
} from "@/lib/collection/permisos";

const log = logger.child({ module: "collection.equipo.actions" });

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

const GENERICO = "No pudimos completar la operación. Probá de nuevo.";

async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ErrorDeNegocio) return { ok: false, error: err.message };
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}

export interface MiAccesoCollection {
  superAdmin: boolean;
  permisos: PermisoCollection[];
}

/** null = sin acceso a Collection (o sin sesión). Lo usan el sidebar y el shell. */
export async function getMiAccesoCollection(): Promise<MiAccesoCollection | null> {
  try {
    const { userId } = await requireAuth();
    return await getAccesoCollection(userId);
  } catch {
    return null;
  }
}

export interface MiembroCollection {
  id: string;
  name: string;
  email: string;
  role: string;
  fotoUrl: string | null;
  superAdmin: boolean;
  permisos: PermisoCollection[];
  conFila: boolean;
}

export async function listarEquipoCollection(): Promise<Resultado<MiembroCollection[]>> {
  return ejecutar("listarEquipoCollection", async () => {
    await requireColSuperAdmin();
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        fotoUrl: true,
        colPermiso: { select: { superAdmin: true, permisos: true } },
      },
    });
    const items: MiembroCollection[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      fotoUrl: u.fotoUrl,
      superAdmin: u.colPermiso?.superAdmin ?? false,
      permisos: (u.colPermiso?.permisos ?? []).filter((p): p is PermisoCollection =>
        (PERMISOS_COLLECTION as readonly string[]).includes(p),
      ),
      conFila: !!u.colPermiso,
    }));
    const rango = (m: MiembroCollection) => (m.superAdmin ? 0 : m.permisos.length > 0 ? 1 : 2);
    return items.sort(
      (a, b) => rango(a) - rango(b) || a.name.localeCompare(b.name, "es"),
    );
  });
}

const guardarSchema = z.object({
  superAdmin: z.boolean(),
  permisos: z.array(z.enum(PERMISOS_COLLECTION)).max(PERMISOS_COLLECTION.length),
});

export async function guardarPermisosCollection(
  userId: string,
  input: { superAdmin: boolean; permisos: string[] },
): Promise<Resultado<null>> {
  return ejecutar("guardarPermisosCollection", async () => {
    const actor = await requireColSuperAdmin();
    const p = guardarSchema.safeParse(input);
    if (!p.success) fallar("Permisos inválidos.");
    const { superAdmin } = p.data;
    const permisos = Array.from(new Set(p.data.permisos));

    const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!usuario) fallar("No encontramos a esa persona.");

    const antes = await prisma.colPermiso.findUnique({ where: { userId } });
    if (antes?.superAdmin && !superAdmin) {
      const otros = await prisma.colPermiso.count({
        where: { superAdmin: true, userId: { not: userId } },
      });
      if (otros === 0) fallar("Tiene que quedar al menos un super admin.");
    }

    const borrar = !superAdmin && permisos.length === 0;
    if (borrar) {
      await prisma.colPermiso.deleteMany({ where: { userId } });
    } else {
      await prisma.colPermiso.upsert({
        where: { userId },
        update: { superAdmin, permisos, updatedById: actor.userId },
        create: { userId, superAdmin, permisos, updatedById: actor.userId },
      });
    }

    await registrarEventoCol({
      entidad: "permiso",
      entidadId: userId,
      accion: "cambiar",
      userId: actor.userId,
      detalle: {
        antes: antes ? { superAdmin: antes.superAdmin, permisos: antes.permisos } : null,
        despues: borrar ? null : { superAdmin, permisos },
      },
    });
    return null;
  });
}
