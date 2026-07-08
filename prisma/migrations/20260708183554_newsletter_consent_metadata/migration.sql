-- LGPD / GDPR / Ley 18.331 (UY) — agregar metadata de consentimiento al
-- opt-in del newsletter. IP, user-agent y UTM params del request original.
-- Datos no críticos: si la columna no se llena, la fila sigue siendo válida.
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "consentIp" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "consentUserAgent" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN "utmTerm" TEXT;
