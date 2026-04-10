"use server";

import { prisma } from "@/lib/db";
import { compareSync } from "bcryptjs";

// ──────────────────────────────────────────────
// Authenticate user
// ──────────────────────────────────────────────

export async function authenticateUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;

    const isValid = compareSync(password, user.passwordHash);
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      brandId: user.brandId,
      isActive: user.isActive,
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    throw new Error("Error al autenticar el usuario.");
  }
}
