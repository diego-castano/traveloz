-- CreateEnum
CREATE TYPE "ColTipoMedio" AS ENUM ('FOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "ColPermiso" (
    "userId" TEXT NOT NULL,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permisos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ColPermiso_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ColMedio" (
    "id" TEXT NOT NULL,
    "tipo" "ColTipoMedio" NOT NULL,
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "ancho" INTEGER,
    "alto" INTEGER,
    "duracion" DOUBLE PRECISION,
    "colorDominante" TEXT,
    "placeholder" TEXT,
    "variantes" JSONB NOT NULL DEFAULT '[]',
    "posterUrl" TEXT,
    "alt" TEXT NOT NULL DEFAULT '',
    "leyenda" TEXT NOT NULL DEFAULT '',
    "credito" TEXT NOT NULL DEFAULT '',
    "focoX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focoY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColMedio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColEvento" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "userId" TEXT,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColMedio_key_key" ON "ColMedio"("key");

-- CreateIndex
CREATE INDEX "ColMedio_tipo_createdAt_idx" ON "ColMedio"("tipo", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ColEvento_entidad_entidadId_createdAt_idx" ON "ColEvento"("entidad", "entidadId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ColPermiso" ADD CONSTRAINT "ColPermiso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColMedio" ADD CONSTRAINT "ColMedio_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Super admins de Collection (decisión de Diego, 09/10/2026): Amparo, Agustina y Diego.
INSERT INTO "ColPermiso" ("userId", "superAdmin", "permisos", "updatedAt")
SELECT id, true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP FROM "User"
WHERE id IN ('cmqtx8bq90002ox89n04yk4p7', 'cmqigfavc0000it05cz9ais63', 'cmnyqplw50003y30hcu9xfsuu')
ON CONFLICT ("userId") DO NOTHING;
