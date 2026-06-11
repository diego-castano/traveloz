"use server";

import { auth } from "@/lib/auth.config";
import { BRAND_ID } from "@/lib/brand";
import { roleConfig, type Role } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Auth enforcement helpers for server actions.
//
// Multi-brand support was removed in Fase 7. The `brandId` returned here is
// always BRAND_ID (single-tenant TravelOz). The `requestedBrandId` parameter
// is accepted for backward compatibility with existing call sites but is
// ignored — every request resolves to the single TravelOz brand.
// ---------------------------------------------------------------------------

export interface AuthContext {
  userId: string;
  role: string;
  brandId: string;
}

/**
 * Require an authenticated session. Returns userId, role, and the constant
 * brand id. The optional argument is ignored.
 */
export async function requireAuth(
  _ignoredBrandId?: string,
): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autorizado. Debe iniciar sesion.");
  }
  const user = session.user as { id: string; role: string };
  return { userId: user.id, role: user.role, brandId: BRAND_ID };
}

/**
 * Require a role with edit permissions (roleConfig[role].canEdit). Today
 * that's only ADMIN — VENDEDOR y MARKETING son read-only en la UI y este
 * check lo hace cumplir también del lado del servidor (la UI sola se puede
 * esquivar llamando la server action desde DevTools).
 *
 * Usar en TODA server action que mute datos del negocio. Las lecturas y las
 * acciones de perfil propio (password/PIN) siguen con requireAuth().
 */
export async function requireCanEdit(
  _ignoredBrandId?: string,
): Promise<AuthContext> {
  const ctx = await requireAuth();
  const config = roleConfig[ctx.role as Role];
  if (!config?.canEdit) {
    throw new Error("Tu rol no tiene permisos de edición.");
  }
  return ctx;
}

/**
 * Require ADMIN role. Throws if not authenticated or not an admin.
 */
export async function requireAdmin(
  _ignoredBrandId?: string,
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN") {
    throw new Error("Acceso restringido a administradores.");
  }
  return ctx;
}
