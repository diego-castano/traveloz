-- D1: índices para el inbox de leads (filtra por email, ordena por createdAt DESC).
-- Sin esto las tablas hacen fullscan a medida que crecen.

-- Cotizacion: reorientar el índice de createdAt a DESC + lookup por email.
DROP INDEX IF EXISTS "Cotizacion_createdAt_idx";
CREATE INDEX "Cotizacion_createdAt_idx" ON "Cotizacion"("createdAt" DESC);
CREATE INDEX "Cotizacion_email_idx" ON "Cotizacion"("email");

-- MensajeContacto
CREATE INDEX "MensajeContacto_createdAt_idx" ON "MensajeContacto"("createdAt" DESC);
CREATE INDEX "MensajeContacto_email_idx" ON "MensajeContacto"("email");

-- ContactoCorporativo
CREATE INDEX "ContactoCorporativo_createdAt_idx" ON "ContactoCorporativo"("createdAt" DESC);
CREATE INDEX "ContactoCorporativo_email_idx" ON "ContactoCorporativo"("email");

-- Postulacion
CREATE INDEX "Postulacion_createdAt_idx" ON "Postulacion"("createdAt" DESC);
CREATE INDEX "Postulacion_email_idx" ON "Postulacion"("email");

-- F4: double opt-in del newsletter. Los altas nuevas nacen inactivas + token de
-- confirmación. Las filas existentes conservan su valor actual de `active`
-- (el cambio de default solo afecta inserts futuros).
ALTER TABLE "SuscripcionNewsletter" ALTER COLUMN "active" SET DEFAULT false;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "confirmToken" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "confirmedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "SuscripcionNewsletter_confirmToken_key" ON "SuscripcionNewsletter"("confirmToken");
