"use server";

import { auth } from "@/lib/auth.config";

// ---------------------------------------------------------------------------
// Auth enforcement helpers for server actions
// ---------------------------------------------------------------------------

export interface AuthContext {
  userId: string;
  role: string;
  brandId: string;
}

/**
 * Require an authenticated session. Returns userId, role, and effective brandId.
 * ADMIN users may pass a requestedBrandId to operate on another brand.
 * VENDEDOR / MARKETING are locked to their own brandId from the JWT.
 */
export async function requireAuth(requestedBrandId?: string): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autorizado. Debe iniciar sesion.");
  }

  const user = session.user as any;
  const role: string = user.role;
  const sessionBrandId: string = user.brandId;

  // ADMIN can switch brands; others are locked to their session brand
  const effectiveBrandId =
    role === "ADMIN" && requestedBrandId ? requestedBrandId : sessionBrandId;

  return { userId: user.id, role, brandId: effectiveBrandId };
}

/**
 * Require ADMIN role. Throws if not authenticated or not an admin.
 */
export async function requireAdmin(requestedBrandId?: string): Promise<AuthContext> {
  const ctx = await requireAuth(requestedBrandId);
  if (ctx.role !== "ADMIN") {
    throw new Error("Acceso restringido a administradores.");
  }
  return ctx;
}
