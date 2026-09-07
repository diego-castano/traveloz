-- Países Bajos y Reino Unido (brand-1) a la Europa de brand-1. 2026-09-07.
--
-- Los dos países (cmod6f4tu0001y38im70k5tcm, cmod6f5680003y38io0i0pvvt) cuelgan
-- desde abril de region-8, que es la Europa de la otra marca. Pasan a region-1
-- (Europa de brand-1). Cambian dos filas, por id; region-8 y sus seis países
-- de brand-2 no se tocan. Huellas de todas las filas de todas las marcas antes
-- y después; cualquier otro cambio aborta.
--
-- Ensayo (termina en ROLLBACK):
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=1 -f scripts/fixes/2026-09-07-europa-brand1.sql
-- En serio:
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=0 -f scripts/fixes/2026-09-07-europa-brand1.sql
-- Foto previa y receta de restauración: ~/backups/traveloz/2026-09-07-geo (ver HANDOFF.md).

\set ON_ERROR_STOP on
SET TimeZone = 'UTC';
BEGIN ISOLATION LEVEL REPEATABLE READ;

-- Huellas. Los dos países se hashean aparte con regionId y updatedAt
-- enmascarados; el resto de Pais y todas las demás tablas, completas.
CREATE TEMP VIEW huellas AS
  SELECT 'Region' AS t, md5(string_agg(x::text, '|' ORDER BY x.id)) AS h FROM "Region" x
  UNION ALL SELECT 'Pais', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Pais" x
    WHERE x.id NOT IN ('cmod6f4tu0001y38im70k5tcm', 'cmod6f5680003y38io0i0pvvt')
  UNION ALL SELECT 'Pais:' || x.id, md5((to_jsonb(x) - 'regionId' - 'updatedAt')::text) FROM "Pais" x
    WHERE x.id IN ('cmod6f4tu0001y38im70k5tcm', 'cmod6f5680003y38io0i0pvvt')
  UNION ALL SELECT 'Ciudad', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Ciudad" x
  UNION ALL SELECT 'Alojamiento', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Alojamiento" x
  UNION ALL SELECT 'Traslado', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Traslado" x
  UNION ALL SELECT 'PaqueteDestino', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "PaqueteDestino" x
  UNION ALL SELECT 'OpcionHotel', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "OpcionHotel" x
  UNION ALL SELECT 'Paquete', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Paquete" x
  UNION ALL SELECT 'n:Pais:' || coalesce("regionId", '-') || ':' || "brandId", count(*)::text FROM "Pais" GROUP BY "regionId", "brandId";

CREATE TEMP TABLE fp_antes AS SELECT * FROM huellas;

DO $$
DECLARE n int;
BEGIN
  -- El conjunto de cruces País/Región tiene que ser exactamente estos dos
  -- países de brand-1 apuntando a region-8, y ninguno de brand-2.
  SELECT count(*) INTO n FROM "Pais" p JOIN "Region" rg ON rg.id = p."regionId" WHERE p."brandId" <> rg."brandId";
  IF n <> 2 THEN RAISE EXCEPTION 'hay % cruces de marca País/Región, esperaba exactamente 2', n; END IF;
  SELECT count(*) INTO n FROM "Pais" p JOIN "Region" r ON r.id = p."regionId"
   WHERE p."brandId" <> r."brandId"
     AND p.id IN ('cmod6f4tu0001y38im70k5tcm', 'cmod6f5680003y38io0i0pvvt')
     AND p."brandId" = 'brand-1' AND p."regionId" = 'region-8';
  IF n <> 2 THEN RAISE EXCEPTION 'los cruces no son Países Bajos y Reino Unido -> region-8'; END IF;
  SELECT count(*) INTO n FROM "Region" WHERE id = 'region-1' AND "brandId" = 'brand-1' AND nombre = 'Europa';
  IF n <> 1 THEN RAISE EXCEPTION 'region-1 no es la Europa de brand-1'; END IF;
  SELECT count(*) INTO n FROM "Region" WHERE id = 'region-8' AND "brandId" = 'brand-2' AND nombre = 'Europa';
  IF n <> 1 THEN RAISE EXCEPTION 'region-8 no es la Europa de brand-2'; END IF;
  SELECT count(*) INTO n FROM "Pais" WHERE "regionId" = 'region-8' AND "brandId" = 'brand-2';
  IF n <> 6 THEN RAISE EXCEPTION 'region-8 tiene % países de brand-2, esperaba 6', n; END IF;

  UPDATE "Pais" SET "regionId" = 'region-1', "updatedAt" = now()
   WHERE id IN ('cmod6f4tu0001y38im70k5tcm', 'cmod6f5680003y38io0i0pvvt')
     AND "brandId" = 'brand-1' AND "regionId" = 'region-8';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'UPDATE Pais: esperaba 2 filas, hubo %', n; END IF;
END $$;

CREATE TEMP TABLE fp_despues AS SELECT * FROM huellas;

DO $$
DECLARE r record; n int;
BEGIN
  -- Todas las huellas iguales, salvo los conteos de (region-1, brand-1), que
  -- sube en 2, y (region-8, brand-1), que desaparece.
  FOR r IN
    SELECT t, a.h AS antes, d.h AS despues FROM fp_antes a FULL JOIN fp_despues d USING (t)
     WHERE a.h IS DISTINCT FROM d.h AND t NOT IN ('n:Pais:region-1:brand-1', 'n:Pais:region-8:brand-1')
  LOOP
    RAISE EXCEPTION 'cambió algo fuera de las dos filas objetivo: % (% -> %)', r.t, r.antes, r.despues;
  END LOOP;
  SELECT d.h::int - a.h::int INTO n FROM fp_antes a JOIN fp_despues d USING (t) WHERE t = 'n:Pais:region-1:brand-1';
  IF n IS DISTINCT FROM 2 THEN RAISE EXCEPTION '(region-1, brand-1) debía subir exactamente en 2'; END IF;
  SELECT count(*) INTO n FROM fp_despues WHERE t = 'n:Pais:region-8:brand-1';
  IF n <> 0 THEN RAISE EXCEPTION 'sigue habiendo países de brand-1 en region-8'; END IF;

  SELECT count(*) INTO n FROM "Pais" p JOIN "Region" rg ON rg.id = p."regionId" WHERE p."brandId" <> rg."brandId";
  IF n <> 0 THEN RAISE EXCEPTION 'quedan % cruces de marca', n; END IF;
  SELECT count(*) INTO n FROM "Pais"
   WHERE id IN ('cmod6f4tu0001y38im70k5tcm', 'cmod6f5680003y38io0i0pvvt') AND "regionId" = 'region-1';
  IF n <> 2 THEN RAISE EXCEPTION 'los dos países no quedaron en region-1'; END IF;
  SELECT count(*) INTO n FROM "Pais" WHERE "regionId" = 'region-8' AND "brandId" = 'brand-2';
  IF n <> 6 THEN RAISE EXCEPTION 'region-8 debía conservar sus 6 países de brand-2, tiene %', n; END IF;

  -- Red que no depende de la lista de tablas hasheadas: en esta transacción
  -- solo puede haber cambiado Pais (2 updates).
  FOR r IN
    SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_xact_user_tables
     WHERE schemaname = 'public' AND n_tup_ins + n_tup_upd + n_tup_del > 0
       AND NOT (relname = 'Pais' AND n_tup_ins = 0 AND n_tup_upd = 2 AND n_tup_del = 0)
  LOOP
    RAISE EXCEPTION 'escritura inesperada en % (ins % upd % del %)', r.relname, r.n_tup_ins, r.n_tup_upd, r.n_tup_del;
  END LOOP;
  SELECT count(*) INTO n FROM pg_stat_xact_user_tables WHERE schemaname = 'public' AND relname = 'Pais' AND n_tup_upd = 2;
  IF n <> 1 THEN RAISE EXCEPTION 'pg_stat_xact no registra el update de Pais'; END IF;
END $$;

\if :ensayo
\echo ENSAYO OK: todos los asserts pasaron. ROLLBACK.
ROLLBACK;
\else
COMMIT;
\echo COMMIT: Países Bajos y Reino Unido en la Europa de brand-1.
\endif
