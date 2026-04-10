"use server";

import { prisma } from "@/lib/db";
import { hashSync } from "bcryptjs";
import type { Role } from "@prisma/client";

// ──────────────────────────────────────────────
// Get all users (admin — no brand filter)
// ──────────────────────────────────────────────

export async function getUsers() {
  try {
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
// Delete user (hard delete)
// ──────────────────────────────────────────────

export async function deleteUser(id: string) {
  try {
    return await prisma.user.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("No se pudo eliminar el usuario.");
  }
}
