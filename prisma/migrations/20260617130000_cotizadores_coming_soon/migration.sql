-- Cotizadores por marca: landings de cotización independientes del sitio.

CREATE TABLE "CotizadorLanding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombreMarca" TEXT NOT NULL,
    "logoUrl" TEXT,
    "textoInstitucional" TEXT,
    "colorPrimario" TEXT,
    "emailsDestino" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "CotizadorLanding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CotizadorLanding_slug_key" ON "CotizadorLanding"("slug");
CREATE INDEX "CotizadorLanding_publicado_idx" ON "CotizadorLanding"("publicado");
CREATE INDEX "CotizadorLanding_deletedAt_idx" ON "CotizadorLanding"("deletedAt");

CREATE TABLE "CotizadorLead" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "paisCodigo" TEXT,
    "comentarios" TEXT,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CotizadorLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CotizadorLead_landingId_createdAt_idx" ON "CotizadorLead"("landingId", "createdAt" DESC);
CREATE INDEX "CotizadorLead_email_idx" ON "CotizadorLead"("email");

ALTER TABLE "CotizadorLead" ADD CONSTRAINT "CotizadorLead_landingId_fkey"
    FOREIGN KEY ("landingId") REFERENCES "CotizadorLanding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coming Soon: por defecto activo. El sitio principal arranca en "Próximamente"
-- mientras se prueban los cotizadores por marca.
INSERT INTO "SiteSetting" ("key", "value", "type", "label", "group", "updatedAt")
VALUES ('coming_soon_activo', 'true', 'text', 'Sitio principal en Próximamente', 'general', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
