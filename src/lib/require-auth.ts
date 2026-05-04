"use server";

import { auth } from "@/lib/auth.config";
import { BRAND_ID } from "@/lib/brand";

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
