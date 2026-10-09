-- Encuadres por aspecto de los medios de Collection. Solo agrega una columna.
ALTER TABLE "ColMedio" ADD COLUMN "recortes" JSONB NOT NULL DEFAULT '{}';
