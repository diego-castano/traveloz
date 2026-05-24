"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/require-auth";
import { hashSync, compareSync } from "bcryptjs";
import type { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";
import { sendEmail, invitationEmail } from "@/lib/email";

const log = logger.child({ module: "user.actions" });

const PIN_REGEX = /^\d{4,6}$/;

async function getRequestMeta() {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
    return { ip: ip || null, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

// ──────────────────────────────────────────────
// Admin: list all users (no brand filter — single-tenant)
// Strips sensitive material (hashes, reset tokens) before returning.
// ──────────────────────────────────────────────

export async function getUsers() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brandId: true,
        isActive: true,
        isProtected: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        lockedUntil: true,
        pinHash: true, // exposed as boolean below
      },
    });
    return users.map((u) => ({
      ...u,
      hasPin: !!u.pinHash,
      pinHash: undefined,
    }));
  } catch (error) {
    log.error("fetching users", error);
    throw new Error("No se pudieron obtener los usuarios.");
  }
}

// ──────────────────────────────────────────────
// Admin: create user
// ──────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: Role;
  brandId: string;
  pin?: string;
  sendInvite?: boolean;
}) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();

  const schema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    name: z.string().min(1, "Nombre requerido"),
    role: z.enum(["ADMIN", "VENDEDOR", "MARKETING"]),
    pin: z.string().regex(PIN_REGEX, "El PIN debe tener 4-6 dígitos").optional(),
  });
  schema.parse({
    email: data.email,
    password: data.password,
    name: data.name,
    role: data.role,
    ...(data.pin ? { pin: data.pin } : {}),
  });

  try {
    const created = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: hashSync(data.password, 10),
        pinHash: data.pin ? hashSync(data.pin, 10) : null,
        name: data.name,
        role: data.role,
        brandId: data.brandId,
      },
      select: {
        id: true, email: true, name: true, role: true, brandId: true,
        isActive: true, isProtected: true, lastLoginAt: true,
        createdAt: true, updatedAt: true, lockedUntil: true,
      },
    });

    await logAudit({
      action: "user.create",
      userId: actor.userId,
      targetType: "user",
      targetId: created.id,
      ipAddress: ip,
      userAgent,
      metadata: { email: created.email, role: created.role, hasPin: !!data.pin },
    });

    // Fire-and-forget invitation email (stub mode is fine — logs to console
    // until RESEND_API_KEY is set).
    if (data.sendInvite !== false) {
      const baseUrl =
        process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const tpl = invitationEmail({
        name: created.name,
        email: created.email,
        tempPassword: data.password,
        loginUrl: `${baseUrl.replace(/\/$/, "")}/backend/login`,
      });
      sendEmail({ to: created.email, ...tpl }).catch((err) =>
        log.error("invitation email failed", err),
      );
    }

    return { ...created, hasPin: !!data.pin };
  } catch (error: any) {
    log.error("creating user", error);
    if (error?.code === "P2002") throw new Error("Ya existe un usuario con ese email.");
    throw new Error("No se pudo crear el usuario.");
  }
}

// ──────────────────────────────────────────────
// Admin: update user (no password / no PIN — separate endpoints)
// Protected admins cannot be demoted, deactivated, or have their email changed.
// ──────────────────────────────────────────────

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    brandId?: string;
    isActive?: boolean;
  },
) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();

  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email("Email inválido").optional(),
    role: z.enum(["ADMIN", "VENDEDOR", "MARKETING"]).optional(),
    brandId: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  schema.parse(data);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error("Usuario no encontrado.");

  if (existing.isProtected) {
    if (data.role && data.role !== existing.role) {
      throw new Error("Este usuario es un administrador protegido y no puede cambiar de rol.");
    }
    if (data.isActive === false) {
      throw new Error("Este usuario es un administrador protegido y no puede desactivarse.");
    }
    if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
      throw new Error("Este usuario es protegido — su email no puede modificarse.");
    }
  }

  // Guard last ADMIN: if demoting/deactivating the only ADMIN, block.
  if (
    existing.role === "ADMIN" &&
    ((data.role && data.role !== "ADMIN") || data.isActive === false)
  ) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new Error("No se puede dejar el sistema sin administradores activos.");
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    const changed = Object.keys(data).filter((k) => (data as any)[k] !== undefined);
    await logAudit({
      action: "user.update",
      userId: actor.userId,
      targetType: "user",
      targetId: id,
      ipAddress: ip,
      userAgent,
      metadata: { changed },
    });
    if (data.role && data.role !== existing.role) {
      await logAudit({
        action: "user.role.change",
        userId: actor.userId,
        targetType: "user",
        targetId: id,
        ipAddress: ip,
        userAgent,
        metadata: { from: existing.role, to: data.role },
      });
    }

    return updated;
  } catch (error: any) {
    log.error("updating user", error);
    if (error?.code === "P2002") throw new Error("Ya existe un usuario con ese email.");
    throw new Error("No se pudo actualizar el usuario.");
  }
}

// ──────────────────────────────────────────────
// Admin: change someone else's password
// ──────────────────────────────────────────────

export async function updateUserPassword(id: string, newPassword: string) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();

  z.object({ newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres") }).parse({ newPassword });

  try {
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashSync(newPassword, 10),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await logAudit({
      action: "password.change.admin",
      userId: actor.userId,
      targetType: "user",
      targetId: id,
      ipAddress: ip,
      userAgent,
    });
    return { ok: true };
  } catch (error) {
    log.error("updating user password", error);
    throw new Error("No se pudo actualizar la contraseña del usuario.");
  }
}

// ──────────────────────────────────────────────
// Admin: set / clear someone else's PIN
// ──────────────────────────────────────────────

export async function adminSetUserPin(id: string, pin: string | null) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();

  if (pin !== null) {
    z.object({ pin: z.string().regex(PIN_REGEX, "El PIN debe tener 4-6 dígitos") }).parse({ pin });
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { pinHash: pin ? hashSync(pin, 10) : null },
    });
    await logAudit({
      action: pin ? "pin.set.admin" : "pin.clear.admin",
      userId: actor.userId,
      targetType: "user",
      targetId: id,
      ipAddress: ip,
      userAgent,
    });
    return { ok: true };
  } catch (error) {
    log.error("admin setting pin", error);
    throw new Error("No se pudo actualizar el PIN.");
  }
}

// ──────────────────────────────────────────────
// Admin: unlock a user (manual override of automatic lockout)
// ──────────────────────────────────────────────

export async function unlockUser(id: string) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();
  await prisma.user.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  await logAudit({
    action: "user.unlock",
    userId: actor.userId,
    targetType: "user",
    targetId: id,
    ipAddress: ip,
    userAgent,
  });
  return { ok: true };
}

// ──────────────────────────────────────────────
// Admin: check email availability
// ──────────────────────────────────────────────

export async function checkEmailAvailable(email: string): Promise<boolean> {
  await requireAdmin();
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return !existing;
}

// ──────────────────────────────────────────────
// Admin: delete user (hard delete)
// ──────────────────────────────────────────────

export async function deleteUser(id: string) {
  const actor = await requireAdmin();
  const { ip, userAgent } = await getRequestMeta();

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw new Error("Usuario no encontrado.");

  if (targetUser.isProtected) {
    throw new Error("Este usuario es un administrador protegido y no puede eliminarse.");
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
  if (targetUser.role === "ADMIN" && adminCount <= 1) {
    throw new Error("No se puede eliminar al último administrador.");
  }

  try {
    await prisma.user.delete({ where: { id } });
    await logAudit({
      action: "user.delete",
      userId: actor.userId,
      targetType: "user",
      targetId: id,
      ipAddress: ip,
      userAgent,
      metadata: { email: targetUser.email },
    });
    return { ok: true };
  } catch (error) {
    log.error("deleting user", error);
    throw new Error("No se pudo eliminar el usuario.");
  }
}

// ──────────────────────────────────────────────
// Self-service: get my profile (the signed-in user)
// ──────────────────────────────────────────────

export async function getMyProfile() {
  const ctx = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true, email: true, name: true, role: true, brandId: true,
      isActive: true, isProtected: true, lastLoginAt: true,
      createdAt: true, pinHash: true,
    },
  });
  if (!user) throw new Error("Usuario no encontrado.");
  return { ...user, hasPin: !!user.pinHash, pinHash: undefined };
}

// ──────────────────────────────────────────────
// Self-service: update my own name/email
// ──────────────────────────────────────────────

export async function updateMyProfile(data: { name?: string; email?: string }) {
  const ctx = await requireAuth();
  const { ip, userAgent } = await getRequestMeta();

  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email("Email inválido").optional(),
  });
  schema.parse(data);

  const existing = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!existing) throw new Error("Usuario no encontrado.");

  if (existing.isProtected && data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
    throw new Error("Tu usuario es protegido — el email no puede modificarse.");
  }

  try {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      },
    });
    await logAudit({
      action: "user.update.self",
      userId: ctx.userId,
      targetType: "user",
      targetId: ctx.userId,
      ipAddress: ip,
      userAgent,
      metadata: { changed: Object.keys(data).filter((k) => (data as any)[k] !== undefined) },
    });
    return { ok: true };
  } catch (error: any) {
    log.error("updating self profile", error);
    if (error?.code === "P2002") throw new Error("Ya existe un usuario con ese email.");
    throw new Error("No se pudo actualizar tu perfil.");
  }
}

// ──────────────────────────────────────────────
// Self-service: change my password (requires current password)
// ──────────────────────────────────────────────

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const ctx = await requireAuth();
  const { ip, userAgent } = await getRequestMeta();

  z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  }).parse({ currentPassword, newPassword });

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw new Error("Usuario no encontrado.");

  if (!compareSync(currentPassword, user.passwordHash)) {
    await logAudit({
      action: "password.change.self.fail.bad_current",
      userId: ctx.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
    });
    throw new Error("La contraseña actual no es correcta.");
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: hashSync(newPassword, 10) },
  });
  await logAudit({
    action: "password.change.self",
    userId: ctx.userId,
    userEmail: user.email,
    ipAddress: ip,
    userAgent,
  });
  return { ok: true };
}

// ──────────────────────────────────────────────
// Self-service: set / change / clear my PIN
//
// Setting a PIN for the first time does NOT require the current PIN (you
// don't have one yet); changing or clearing it does. This matches the
// "set PIN quickly from login" affordance the user asked for.
// ──────────────────────────────────────────────

export async function setMyPin(input: { pin: string | null; currentPin?: string; currentPassword?: string }) {
  const ctx = await requireAuth();
  const { ip, userAgent } = await getRequestMeta();

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw new Error("Usuario no encontrado.");

  // Validate new PIN shape (skip if clearing).
  if (input.pin !== null) {
    z.object({ pin: z.string().regex(PIN_REGEX, "El PIN debe tener 4-6 dígitos") }).parse({ pin: input.pin });
  }

  // If the user already has a PIN they must re-prove identity to change it
  // — either with their current PIN or with their password.
  if (user.pinHash) {
    const okPin =
      !!input.currentPin && compareSync(input.currentPin, user.pinHash);
    const okPwd =
      !!input.currentPassword && compareSync(input.currentPassword, user.passwordHash);
    if (!okPin && !okPwd) {
      await logAudit({
        action: "pin.change.self.fail.bad_proof",
        userId: ctx.userId,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
      });
      throw new Error("Para cambiar tu PIN necesitás ingresar tu PIN actual o tu contraseña.");
    }
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { pinHash: input.pin ? hashSync(input.pin, 10) : null },
  });

  await logAudit({
    action: input.pin ? "pin.set" : "pin.clear",
    userId: ctx.userId,
    userEmail: user.email,
    ipAddress: ip,
    userAgent,
  });
  return { ok: true };
}
