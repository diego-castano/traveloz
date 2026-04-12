"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-auth";
import { hashSync } from "bcryptjs";
import type { Role } from "@prisma/client";

// ──────────────────────────────────────────────
// Get all users (admin — no brand filter)
// ──────────────────────────────────────────────

export async function getUsers() {
  try {
    await requireAdmin();
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("No se pudieron obtener los usuarios.");
  }
}

// ──────────────────────────────────────────────
// Create user
// ──────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: Role;
  brandId: string;
}) {
  try {
    await requireAdmin();

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      role: z.enum(["ADMIN", "VENDEDOR", "MARKETING"]),
    });
    schema.parse(data);

    const passwordHash = hashSync(data.password, 10);

    return await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        brandId: data.brandId,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("No se pudo crear el usuario.");
  }
}

// ──────────────────────────────────────────────
// Update user (no password change)
// ──────────────────────────────────────────────

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    brandId?: string;
    isActive?: boolean;
  }
) {
  try {
    await requireAdmin();

    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(["ADMIN", "VENDEDOR", "MARKETING"]).optional(),
      brandId: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    schema.parse(data);

    return await prisma.user.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("No se pudo actualizar el usuario.");
  }
}

// ──────────────────────────────────────────────
// Update user password
// ──────────────────────────────────────────────

export async function updateUserPassword(id: string, newPassword: string) {
  try {
    await requireAdmin();

    const schema = z.object({
      newPassword: z.string().min(6),
    });
    schema.parse({ newPassword });

    const passwordHash = hashSync(newPassword, 10);

    return await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  } catch (error) {
    console.error("Error updating user password:", error);
    throw new Error("No se pudo actualizar la contraseña del usuario.");
  }
}

// ──────────────────────────────────────────────
// Check email availability
// ──────────────────────────────────────────────

export async function checkEmailAvailable(email: string): Promise<boolean> {
  await requireAdmin();
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return !existing;
}

// ──────────────────────────────────────────────
// Delete user (hard delete)
// ──────────────────────────────────────────────

export async function deleteUser(id: string) {
  try {
    await requireAdmin();

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser?.role === "ADMIN" && adminCount <= 1) {
      throw new Error("No se puede eliminar al ultimo administrador.");
    }

    return await prisma.user.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error instanceof Error ? error : new Error("No se pudo eliminar el usuario.");
  }
}
