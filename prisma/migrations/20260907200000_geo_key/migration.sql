-- geo_key(nombre): espejo SQL, letra por letra, de ciudadKey
-- (src/lib/ciudad-nombre.ts): NFD, sin marcas diacríticas, minúsculas, solo
-- [a-z0-9]. normalize() es nativa de Postgres 13+ (la base corre 18) y no
-- necesita extensiones. IMMUTABLE para poder usarla en índices por expresión
-- (ver la migración siguiente). Idempotente: se puede volver a aplicar.
CREATE OR REPLACE FUNCTION public.geo_key(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT regexp_replace(lower(normalize($1, NFD)), '[^a-z0-9]', '', 'g') $$;
