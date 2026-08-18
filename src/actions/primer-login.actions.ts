"use server";

// ---------------------------------------------------------------------------
// Primer ingreso: el usuario entró con la contraseña temporal que le mandó un
// administrador (User.mustChangePassword = true) y el panel lo frena en
// PrimerLoginGate hasta que elija uno de dos caminos:
//
//   • elegirNuevaPassword → cambia la contraseña y apaga el flag.
//   • seguirConTemporal   → se queda con la temporal y apaga el flag igual.
//
// Las dos limpian mustChangePassword. La diferencia queda en la auditoría y en
// passwordChangedAt (que solo se escribe cuando hubo cambio real; si el usuario
// se queda con la temporal, la columna sigue en null y delata que nunca la
// cambió).
//
// El cliente, después de que cualquiera de las dos devuelve ok, llama
// `update({ mustChangePassword: false })` de useSession para que el JWT se
// re-emita con el flag apagado. Sin ese paso el token viejo seguiría diciendo
// true y el gate no se cerraría hasta que expire.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { compareSync, hashSync } from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { checkFormRate } from "@/lib/rate-limit";
import { sendEmail, passwordChangedEmail } from "@/lib/email";

const log = logger.child({ module: "primer-login.actions" });

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

export type PrimerLoginResult = { ok: true } | { ok: false; error: string };

// ──────────────────────────────────────────────
// Camino A: elegir una contraseña nueva
// ──────────────────────────────────────────────

export async function elegirNuevaPassword(
  actual: string,
  nueva: string,
): Promise<PrimerLoginResult> {
  const ctx = await requireAuth();
  const { ip, userAgent } = await getRequestMeta();

  // Bucket propio: adivinar la temporal desde acá no debe consumir (ni
  // agotar) el cupo del login público, y viceversa.
  const rate = checkFormRate("primer-login", ip);
  if (!rate.allowed) {
    await logAudit({
      action: "password.change.self.rate_limited",
      userId: ctx.userId,
      ipAddress: ip,
      userAgent,
      metadata: { source: "primer-login", retryAfterSeconds: rate.retryAfterSeconds },
    });
    return {
      ok: false,
      error: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    };
  }

  const parsed = z
    .object({
      actual: z.string().min(1, "Escribí la contraseña temporal."),
      nueva: z
        .string()
        .min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    })
    .safeParse({ actual, nueva });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!user) return { ok: false, error: "Usuario no encontrado." };

    if (!compareSync(actual, user.passwordHash)) {
      await logAudit({
        action: "password.change.self.fail.bad_current",
        userId: ctx.userId,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { source: "primer-login" },
      });
      return { ok: false, error: "La contraseña actual no es correcta." };
    }

    if (compareSync(nueva, user.passwordHash)) {
      return {
        ok: false,
        error: "La contraseña nueva tiene que ser distinta de la temporal.",
      };
    }

    await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        passwordHash: hashSync(nueva, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await logAudit({
      action: "password.change.self",
      userId: ctx.userId,
      userEmail: user.email,
      targetType: "user",
      targetId: ctx.userId,
      ipAddress: ip,
      userAgent,
      metadata: { source: "primer-login" },
    });

    // Aviso de seguridad, best-effort: si el mail falla, el cambio ya está hecho.
    const tpl = passwordChangedEmail({ name: user.name, byAdmin: false });
    sendEmail({ to: user.email, ...tpl }).catch((err) =>
      log.error("primer-login password changed email failed", err),
    );

    return { ok: true };
  } catch (error) {
    log.error("primer-login: eligiendo nueva contraseña", error);
    return { ok: false, error: "No se pudo cambiar la contraseña. Probá de nuevo." };
  }
}

// ──────────────────────────────────────────────
// Camino B: seguir con la contraseña temporal
// ──────────────────────────────────────────────

export async function seguirConTemporal(): Promise<PrimerLoginResult> {
  const ctx = await requireAuth();
  const { ip, userAgent } = await getRequestMeta();

  try {
    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data: { mustChangePassword: false },
      select: { email: true },
    });

    await logAudit({
      action: "password.keep-temporal",
      userId: ctx.userId,
      userEmail: user.email,
      targetType: "user",
      targetId: ctx.userId,
      ipAddress: ip,
      userAgent,
    });

    return { ok: true };
  } catch (error) {
    log.error("primer-login: siguiendo con la temporal", error);
    return { ok: false, error: "No se pudo guardar tu elección. Probá de nuevo." };
  }
}
