-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Region_brandId_idx" ON "Region"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_brandId_slug_key" ON "Region"("brandId", "slug");

-- AlterTable: add nullable regionId FK on Pais
ALTER TABLE "Pais" ADD COLUMN "regionId" TEXT;

-- CreateIndex
CREATE INDEX "Pais_regionId_idx" ON "Pais"("regionId");

-- AddForeignKey
ALTER TABLE "Pais" ADD CONSTRAINT "Pais_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
