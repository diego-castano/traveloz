-- CreateEnum
CREATE TYPE "ColTipoArticulo" AS ENUM ('GUIA', 'RELATO', 'CONSEJOS');

-- CreateEnum
CREATE TYPE "ColEstadoArticulo" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

-- CreateTable
CREATE TABLE "ColAliado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT '',
    "descripcion" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "logoId" TEXT,
    "proveedorId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColAliado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColTestimonio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lugar" TEXT NOT NULL DEFAULT '',
    "viaje" TEXT NOT NULL DEFAULT '',
    "cita" TEXT NOT NULL DEFAULT '',
    "fotoId" TEXT,
    "experienciaId" TEXT,
    "fecha" TIMESTAMP(3),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColTestimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColPregunta" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL DEFAULT 'General',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColPregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColArticulo" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "tipo" "ColTipoArticulo" NOT NULL DEFAULT 'GUIA',
    "titulo" TEXT NOT NULL DEFAULT '',
    "bajada" TEXT NOT NULL DEFAULT '',
    "portadaId" TEXT,
    "autorId" TEXT,
    "contenido" JSONB NOT NULL DEFAULT '{}',
    "minutos" INTEGER NOT NULL DEFAULT 1,
    "estado" "ColEstadoArticulo" NOT NULL DEFAULT 'BORRADOR',
    "seoTitulo" TEXT NOT NULL DEFAULT '',
    "seoDescripcion" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publicado" JSONB,
    "publicadoRevision" INTEGER,
    "publicadoEn" TIMESTAMP(3),
    "creadaPorId" TEXT,
    "actualizadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColArticulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColArticuloExperiencia" (
    "articuloId" TEXT NOT NULL,
    "experienciaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ColArticuloExperiencia_pkey" PRIMARY KEY ("articuloId","experienciaId")
);

-- CreateTable
CREATE TABLE "ColPagina" (
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" JSONB NOT NULL DEFAULT '{}',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publicado" JSONB,
    "publicadoRevision" INTEGER,
    "publicadaEn" TIMESTAMP(3),
    "actualizadaPorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColPagina_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "ColPregunta_categoria_orden_idx" ON "ColPregunta"("categoria", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ColArticulo_slug_key" ON "ColArticulo"("slug");

-- CreateIndex
CREATE INDEX "ColArticulo_estado_publicadoEn_idx" ON "ColArticulo"("estado", "publicadoEn");

-- AddForeignKey
ALTER TABLE "ColAliado" ADD CONSTRAINT "ColAliado_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColAliado" ADD CONSTRAINT "ColAliado_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColTestimonio" ADD CONSTRAINT "ColTestimonio_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColTestimonio" ADD CONSTRAINT "ColTestimonio_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "ColExperiencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColArticulo" ADD CONSTRAINT "ColArticulo_portadaId_fkey" FOREIGN KEY ("portadaId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColArticulo" ADD CONSTRAINT "ColArticulo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "ColEspecialista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColArticuloExperiencia" ADD CONSTRAINT "ColArticuloExperiencia_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "ColArticulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColArticuloExperiencia" ADD CONSTRAINT "ColArticuloExperiencia_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "ColExperiencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed: páginas fijas del sitio (los valores que faltan los completan los defaults al leer)
INSERT INTO "ColPagina" ("slug", "titulo", "contenido", "updatedAt") VALUES ('inicio', 'Inicio', '{"version": 1, "bloques": [{"id": "b1", "tipo": "portada"}, {"id": "b2", "tipo": "manifiesto"}, {"id": "b3", "tipo": "destinos"}, {"id": "b4", "tipo": "experiencias"}, {"id": "b5", "tipo": "estilos"}, {"id": "b6", "tipo": "testimonios"}, {"id": "b7", "tipo": "journal"}, {"id": "b8", "tipo": "newsletter"}, {"id": "b9", "tipo": "cierre"}]}'::jsonb, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "ColPagina" ("slug", "titulo", "contenido", "updatedAt") VALUES ('nosotros', 'Nosotros', '{"version": 1, "bloques": [{"id": "b1", "tipo": "portada"}, {"id": "b2", "tipo": "texto"}, {"id": "b3", "tipo": "imagenTexto"}, {"id": "b4", "tipo": "cifras"}, {"id": "b5", "tipo": "especialistas"}, {"id": "b6", "tipo": "aliados"}, {"id": "b7", "tipo": "cierre"}]}'::jsonb, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "ColPagina" ("slug", "titulo", "contenido", "updatedAt") VALUES ('terminos', 'Términos y condiciones', '{"version": 1, "bloques": [{"id": "b1", "tipo": "texto"}]}'::jsonb, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "ColPagina" ("slug", "titulo", "contenido", "updatedAt") VALUES ('privacidad', 'Política de privacidad', '{"version": 1, "bloques": [{"id": "b1", "tipo": "texto"}]}'::jsonb, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "ColPagina" ("slug", "titulo", "contenido", "updatedAt") VALUES ('cookies', 'Política de cookies', '{"version": 1, "bloques": [{"id": "b1", "tipo": "texto"}]}'::jsonb, CURRENT_TIMESTAMP) ON CONFLICT ("slug") DO NOTHING;
