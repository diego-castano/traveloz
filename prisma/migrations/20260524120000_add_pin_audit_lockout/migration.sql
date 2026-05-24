-- AlterTable: extend User with PIN, lockout, password-reset and protection fields
ALTER TABLE "User"
  ADD COLUMN "pinHash"              TEXT,
  ADD COLUMN "failedLoginAttempts"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil"          TIMESTAMP(3),
  ADD COLUMN "lastLoginAt"          TIMESTAMP(3),
  ADD COLUMN "passwordResetToken"   TEXT,
  ADD COLUMN "passwordResetExpires" TIMESTAMP(3),
  ADD COLUMN "isProtected"          BOOLEAN NOT NULL DEFAULT false;

-- Unique index on the reset token so lookups are fast and tokens cannot collide.
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateTable: AuditLog (append-only audit trail)
CREATE TABLE "AuditLog" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT,
    "userEmail"  TEXT,
    "action"     TEXT NOT NULL,
    "targetType" TEXT,
    "targetId"   TEXT,
    "metadata"   JSONB,
    "ipAddress"  TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);
