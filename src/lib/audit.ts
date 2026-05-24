/**
 * Append-only audit log helper.
 *
 * Every security-relevant event flows through `logAudit` so we get a single
 * funnel (DB write + structured log line). We intentionally swallow DB
 * failures here — if the audit table is unreachable the originating action
 * should NOT fail because of it; we still get a logger.error breadcrumb.
 *
 * Conventions for `action`:
 *   user.create            — admin created a user
 *   user.update            — admin updated user fields (metadata.changed lists keys)
 *   user.delete            — admin hard-deleted a user
 *   user.role.change       — admin changed a user's role
 *   user.lock              — automatic lockout after N failed attempts
 *   user.unlock            — manual unlock (admin) or expiry
 *   login.success          — successful login (metadata.method = "password" | "pin")
 *   login.fail.no_user     — email not found
 *   login.fail.bad_password
 *   login.fail.bad_pin
 *   login.fail.locked      — account currently locked
 *   login.fail.inactive    — account isActive=false
 *   password.change.self   — user changed own password
 *   password.change.admin  — admin changed someone else's password
 *   password.reset.request — user requested a reset link
 *   password.reset.complete— user completed reset via token
 *   pin.set                — user set/changed own PIN
 *   pin.clear              — PIN cleared (by user or admin)
 *   pin.set.admin          — admin set someone else's PIN
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "audit" });

export interface AuditPayload {
  action: string;
  userId?: string | null;
  userEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: payload.action,
        userId: payload.userId ?? null,
        userEmail: payload.userEmail ?? null,
        targetType: payload.targetType ?? null,
        targetId: payload.targetId ?? null,
        metadata: (payload.metadata ?? null) as never,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
      },
    });
  } catch (err) {
    // Never let an audit failure break the actual operation. Just leave a
    // breadcrumb in the app logs so we notice if the table is gone.
    log.error("audit.write.fail", { action: payload.action, err });
  }
}
