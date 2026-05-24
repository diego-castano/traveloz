"use server";

import { prisma } from "@/lib/db";
import { compareSync, hashSync } from "bcryptjs";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import {
  checkLoginRate,
  resetLoginRate,
  isLockedNow,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { z } from "zod";

const log = logger.child({ module: "auth.actions" });

const PASSWORD_RESET_TTL_MIN = 60;

// ──────────────────────────────────────────────
// Request metadata helpers
// ──────────────────────────────────────────────

async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
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
// Login: email + password
// ──────────────────────────────────────────────

export async function authenticateUserByPassword(email: string, password: string) {
  const { ip, userAgent } = await getRequestMeta();

  const rate = checkLoginRate(ip);
  if (!rate.allowed) {
    await logAudit({
      action: "login.fail.rate_limited",
      userEmail: email,
      ipAddress: ip,
      userAgent,
      metadata: { retryAfterSeconds: rate.retryAfterSeconds },
    });
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      await logAudit({
        action: "login.fail.no_user",
        userEmail: email,
        ipAddress: ip,
        userAgent,
      });
      return null;
    }

    if (!user.isActive) {
      await logAudit({
        action: "login.fail.inactive",
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
      });
      return null;
    }

    if (isLockedNow(user.lockedUntil)) {
      await logAudit({
        action: "login.fail.locked",
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { lockedUntil: user.lockedUntil },
      });
      return null;
    }

    const isValid = compareSync(password, user.passwordHash);
    if (!isValid) {
      await recordFailedAttempt(user.id, user.email, "login.fail.bad_password", ip, userAgent);
      return null;
    }

    await onLoginSuccess(user.id, user.email, "password", ip, userAgent);
    resetLoginRate(ip);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      brandId: user.brandId,
      isActive: user.isActive,
    };
  } catch (error) {
    log.error("authenticating user (password)", error);
    return null;
  }
}

// ──────────────────────────────────────────────
// Login: userId + PIN
// ──────────────────────────────────────────────

export async function authenticateUserByPin(userId: string, pin: string) {
  const { ip, userAgent } = await getRequestMeta();

  const rate = checkLoginRate(ip);
  if (!rate.allowed) {
    await logAudit({
      action: "login.fail.rate_limited",
      userId,
      ipAddress: ip,
      userAgent,
      metadata: { retryAfterSeconds: rate.retryAfterSeconds, method: "pin" },
    });
    return null;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      await logAudit({
        action: "login.fail.no_user",
        userId,
        ipAddress: ip,
        userAgent,
        metadata: { method: "pin" },
      });
      return null;
    }

    if (!user.pinHash) {
      await logAudit({
        action: "login.fail.no_pin",
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
      });
      return null;
    }

    if (!user.isActive) {
      await logAudit({
        action: "login.fail.inactive",
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { method: "pin" },
      });
      return null;
    }

    if (isLockedNow(user.lockedUntil)) {
      await logAudit({
        action: "login.fail.locked",
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { lockedUntil: user.lockedUntil, method: "pin" },
      });
      return null;
    }

    const isValid = compareSync(pin, user.pinHash);
    if (!isValid) {
      await recordFailedAttempt(user.id, user.email, "login.fail.bad_pin", ip, userAgent);
      return null;
    }

    await onLoginSuccess(user.id, user.email, "pin", ip, userAgent);
    resetLoginRate(ip);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      brandId: user.brandId,
      isActive: user.isActive,
    };
  } catch (error) {
    log.error("authenticating user (pin)", error);
    return null;
  }
}

// ──────────────────────────────────────────────
// Public roster for the login PIN tab
// (returns only id/name/email/role — no PIN/password material).
// ──────────────────────────────────────────────

export async function getPinLoginRoster() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, pinHash: { not: null } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return users;
  } catch (error) {
    log.error("loading pin roster", error);
    return [];
  }
}

// ──────────────────────────────────────────────
// Failed-attempt handling: increment counter, lock at threshold
// ──────────────────────────────────────────────

async function recordFailedAttempt(
  userId: string,
  email: string,
  action: string,
  ip: string | null,
  userAgent: string | null,
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });

  await logAudit({
    action,
    userId,
    userEmail: email,
    ipAddress: ip,
    userAgent,
    metadata: { attempt: updated.failedLoginAttempts, threshold: MAX_FAILED_ATTEMPTS },
  });

  if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });
    await logAudit({
      action: "user.lock",
      userId,
      userEmail: email,
      ipAddress: ip,
      userAgent,
      metadata: { until: lockedUntil, attempts: updated.failedLoginAttempts },
    });
  }
}

async function onLoginSuccess(
  userId: string,
  email: string,
  method: "password" | "pin",
  ip: string | null,
  userAgent: string | null,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
  await logAudit({
    action: "login.success",
    userId,
    userEmail: email,
    ipAddress: ip,
    userAgent,
    metadata: { method },
  });
}

// ──────────────────────────────────────────────
// Password reset (self-service "forgot password")
//
// Always returns success-shaped result, regardless of whether the email
// exists. This is intentional: it stops attackers from using the endpoint
// as an email-enumeration oracle. The audit log records the actual outcome.
// ──────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  const { ip, userAgent } = await getRequestMeta();

  const rate = checkLoginRate(ip); // reuse login bucket so attackers can't farm tokens
  if (!rate.allowed) {
    await logAudit({
      action: "password.reset.rate_limited",
      userEmail: email,
      ipAddress: ip,
      userAgent,
    });
    return { ok: true };
  }

  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse({ email });
  if (!parsed.success) return { ok: true };

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      await logAudit({
        action: "password.reset.request.unknown",
        userEmail: email,
        ipAddress: ip,
        userAgent,
      });
      return { ok: true };
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MIN * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/backend/reset-password?token=${token}`;
    const tpl = passwordResetEmail({
      name: user.name,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TTL_MIN,
    });

    const sent = await sendEmail({ to: user.email, ...tpl });

    await logAudit({
      action: "password.reset.request",
      userId: user.id,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      metadata: { delivered: sent.delivered, provider: sent.provider },
    });

    return { ok: true };
  } catch (error) {
    log.error("requesting password reset", error);
    return { ok: true };
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const { ip, userAgent } = await getRequestMeta();

  const schema = z.object({
    token: z.string().min(40),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse({ token, newPassword });
  if (!parsed.success) {
    throw new Error("Datos inválidos.");
  }

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    await logAudit({
      action: "password.reset.fail.invalid_token",
      ipAddress: ip,
      userAgent,
    });
    throw new Error("El link es inválido o expiró. Solicitá uno nuevo.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashSync(newPassword, 10),
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit({
    action: "password.reset.complete",
    userId: user.id,
    userEmail: user.email,
    ipAddress: ip,
    userAgent,
  });

  return { ok: true };
}
