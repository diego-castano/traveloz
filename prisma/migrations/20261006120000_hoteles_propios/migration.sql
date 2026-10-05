-- CreateTable
CREATE TABLE "HotelPropio" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNorm" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL DEFAULT '',
    "ciudadNorm" TEXT NOT NULL DEFAULT '',
    "categoria" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelPropio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelPropio_vendedorId_idx" ON "HotelPropio"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPropio_vendedorId_nombreNorm_ciudadNorm_key" ON "HotelPropio"("vendedorId", "nombreNorm", "ciudadNorm");

-- AddForeignKey
ALTER TABLE "HotelPropio" ADD CONSTRAINT "HotelPropio_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: los hoteles que los vendedores ya escribieron a mano en cotizaciones
-- anteriores. hoteles[hi] de cada opcion va alineado con destinos[hi].
INSERT INTO "HotelPropio" ("id", "vendedorId", "nombre", "nombreNorm", "ciudad", "ciudadNorm", "categoria", "createdAt", "updatedAt")
SELECT
  'hp_' || md5("vendedorId" || '|' || "nombreNorm" || '|' || "ciudadNorm"),
  "vendedorId",
  (array_agg("nombre" ORDER BY "ts" DESC))[1],
  "nombreNorm",
  (array_agg("ciudad" ORDER BY "ts" DESC))[1],
  "ciudadNorm",
  max("cat"),
  now(),
  now()
FROM (
  SELECT
    p."vendedorId",
    btrim(h.hotel->>'libre') AS "nombre",
    lower(regexp_replace(btrim(translate(h.hotel->>'libre', 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç', 'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc')), '\s+', ' ', 'g')) AS "nombreNorm",
    btrim(coalesce(p.contenido->'destinos'->(h.hi::int - 1)->>'ciudad', '')) AS "ciudad",
    lower(regexp_replace(btrim(translate(coalesce(p.contenido->'destinos'->(h.hi::int - 1)->>'ciudad', ''), 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç', 'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc')), '\s+', ' ', 'g')) AS "ciudadNorm",
    least(5, greatest(0, CASE WHEN (h.hotel->>'cat') ~ '^[0-9]+(\.[0-9]+)?$' THEN round((h.hotel->>'cat')::numeric)::int ELSE 0 END)) AS "cat",
    coalesce(p."updatedAt", p."createdAt") AS "ts"
  FROM "Presupuesto" p
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.contenido->'opciones') = 'array' THEN p.contenido->'opciones' ELSE '[]'::jsonb END) AS o(opcion)
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.opcion->'hoteles') = 'array' THEN o.opcion->'hoteles' ELSE '[]'::jsonb END) WITH ORDINALITY AS h(hotel, hi)
  WHERE p."deletedAt" IS NULL
    AND coalesce(h.hotel->>'hotelId', '') = ''
    AND btrim(coalesce(h.hotel->>'libre', '')) <> ''
) x
WHERE "nombreNorm" <> ''
GROUP BY "vendedorId", "nombreNorm", "ciudadNorm"
ON CONFLICT DO NOTHING;
