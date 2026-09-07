-- Fusión de las dos "Holbox" de México (brand-1). 2026-09-07.
--
-- La vieja (cmrdyrtw50016qx4wwal5sxbe) tiene los alojamientos 1428-1430 y el
-- tramo del paquete 278; la nueva (cmrdzgcdk001gqx4wmsamfayq) solo tiene el
-- Traslado 251. Se reapunta el traslado y se borra la nueva. Todo por id
-- literal, nada por nombre. Se toman huellas de todas las filas de todas las
-- marcas antes y después: cualquier byte que cambie fuera de las dos filas
-- objetivo aborta y deshace todo.
--
-- Ensayo (termina en ROLLBACK):
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=1 -f scripts/fixes/2026-09-07-holbox-merge.sql
-- En serio:
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=0 -f scripts/fixes/2026-09-07-holbox-merge.sql
-- Foto previa y receta de restauración: ~/backups/traveloz/2026-09-07-geo (ver HANDOFF.md).

\set ON_ERROR_STOP on
SET TimeZone = 'UTC';
BEGIN ISOLATION LEVEL REPEATABLE READ;

-- Huellas. La Holbox que se va queda fuera del hash de Ciudad; el Traslado 251
-- se hashea aparte con ciudadId y updatedAt enmascarados, así cualquier otro
-- cambio en esa fila también aborta. Ciudad, PaqueteDestino y OpcionHotel no
-- tienen brandId: su marca solo se conoce por JOIN.
CREATE TEMP VIEW huellas AS
  SELECT 'Region' AS t, md5(string_agg(x::text, '|' ORDER BY x.id)) AS h FROM "Region" x
  UNION ALL SELECT 'Pais', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Pais" x
  UNION ALL SELECT 'Ciudad', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Ciudad" x WHERE x.id <> 'cmrdzgcdk001gqx4wmsamfayq'
  UNION ALL SELECT 'Alojamiento', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Alojamiento" x
  UNION ALL SELECT 'Traslado', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Traslado" x WHERE x.id <> '251'
  UNION ALL SELECT 'Traslado:251', md5((to_jsonb(x) - 'ciudadId' - 'updatedAt')::text) FROM "Traslado" x WHERE x.id = '251'
  UNION ALL SELECT 'PaqueteDestino', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "PaqueteDestino" x
  UNION ALL SELECT 'OpcionHotel', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "OpcionHotel" x
  UNION ALL SELECT 'Paquete', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Paquete" x
  UNION ALL SELECT 'n:Region:' || "brandId", count(*)::text FROM "Region" GROUP BY "brandId"
  UNION ALL SELECT 'n:Pais:' || "brandId", count(*)::text FROM "Pais" GROUP BY "brandId"
  UNION ALL SELECT 'n:Ciudad:' || p."brandId", count(*)::text FROM "Ciudad" c JOIN "Pais" p ON p.id = c."paisId" GROUP BY p."brandId"
  UNION ALL SELECT 'n:Alojamiento:' || "brandId", count(*)::text FROM "Alojamiento" GROUP BY "brandId"
  UNION ALL SELECT 'n:Traslado:' || "brandId", count(*)::text FROM "Traslado" GROUP BY "brandId"
  UNION ALL SELECT 'n:PaqueteDestino:' || pq."brandId", count(*)::text FROM "PaqueteDestino" d JOIN "Paquete" pq ON pq.id = d."paqueteId" GROUP BY pq."brandId";

CREATE TEMP TABLE fp_antes AS SELECT * FROM huellas;

DO $$
DECLARE n int;
BEGIN
  -- Precondiciones: las dos Holbox cuelgan de México (brand-1); la nueva solo
  -- tiene el Traslado 251; la vieja conserva sus alojamientos y su tramo.
  SELECT count(*) INTO n FROM "Ciudad" c JOIN "Pais" p ON p.id = c."paisId"
   WHERE c.id IN ('cmrdyrtw50016qx4wwal5sxbe', 'cmrdzgcdk001gqx4wmsamfayq')
     AND c."paisId" = 'cmo0cagi40014y35isr2pckff' AND p."brandId" = 'brand-1' AND c.nombre = 'Holbox';
  IF n <> 2 THEN RAISE EXCEPTION 'esperaba las dos Holbox bajo México (brand-1), hay %', n; END IF;

  SELECT count(*) INTO n FROM "Alojamiento" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq';
  IF n <> 0 THEN RAISE EXCEPTION 'la Holbox nueva tiene % alojamientos, esperaba 0', n; END IF;
  SELECT count(*) INTO n FROM "PaqueteDestino" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq';
  IF n <> 0 THEN RAISE EXCEPTION 'la Holbox nueva tiene % tramos de paquete, esperaba 0', n; END IF;
  SELECT count(*) INTO n FROM "Traslado" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq';
  IF n <> 1 THEN RAISE EXCEPTION 'la Holbox nueva tiene % traslados, esperaba solo el 251', n; END IF;
  SELECT count(*) INTO n FROM "Traslado"
   WHERE id = '251' AND "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq' AND "brandId" = 'brand-1'
     AND "paisId" = 'cmo0cagi40014y35isr2pckff' AND "deletedAt" IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'el Traslado 251 no está como se esperaba'; END IF;

  SELECT count(*) INTO n FROM "Alojamiento"
   WHERE "ciudadId" = 'cmrdyrtw50016qx4wwal5sxbe' AND id IN ('1428', '1429', '1430');
  IF n <> 3 THEN RAISE EXCEPTION 'la Holbox vieja no tiene los alojamientos 1428-1430 (tiene %)', n; END IF;
  SELECT count(*) INTO n FROM "PaqueteDestino"
   WHERE id = 'cmre04w48002gqx4wu5k6djlf' AND "paqueteId" = '278' AND "ciudadId" = 'cmrdyrtw50016qx4wwal5sxbe';
  IF n <> 1 THEN RAISE EXCEPTION 'el tramo Holbox del paquete 278 no apunta a la Holbox vieja'; END IF;
  SELECT count(*) INTO n FROM "OpcionHotel" WHERE "destinoId" = 'cmre04w48002gqx4wu5k6djlf';
  IF n <> 3 THEN RAISE EXCEPTION 'el tramo Holbox del paquete 278 tiene % opciones de hotel, esperaba 3', n; END IF;

  -- (1) Reapuntar el traslado.
  UPDATE "Traslado" SET "ciudadId" = 'cmrdyrtw50016qx4wwal5sxbe', "updatedAt" = now()
   WHERE id = '251' AND "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq' AND "brandId" = 'brand-1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'UPDATE Traslado 251: esperaba 1 fila, hubo %', n; END IF;

  -- (2) Cero referencias antes de borrar. Alojamiento.ciudadId y
  -- Traslado.ciudadId son ON DELETE SET NULL: sin este assert, borrar la ciudad
  -- dejaría referencias en NULL sin ningún error.
  SELECT (SELECT count(*) FROM "Alojamiento" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq')
       + (SELECT count(*) FROM "Traslado" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq')
       + (SELECT count(*) FROM "PaqueteDestino" WHERE "ciudadId" = 'cmrdzgcdk001gqx4wmsamfayq') INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'quedan % referencias a la Holbox nueva', n; END IF;

  -- (3) Borrar la nueva.
  DELETE FROM "Ciudad" WHERE id = 'cmrdzgcdk001gqx4wmsamfayq' AND "paisId" = 'cmo0cagi40014y35isr2pckff';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'DELETE Ciudad: esperaba 1 fila, hubo %', n; END IF;
END $$;

CREATE TEMP TABLE fp_despues AS SELECT * FROM huellas;

DO $$
DECLARE r record; n int; v text;
BEGIN
  -- Todas las huellas iguales, salvo el conteo de Ciudad brand-1, que baja en 1.
  FOR r IN
    SELECT t, a.h AS antes, d.h AS despues FROM fp_antes a FULL JOIN fp_despues d USING (t)
     WHERE a.h IS DISTINCT FROM d.h AND t <> 'n:Ciudad:brand-1'
  LOOP
    RAISE EXCEPTION 'cambió algo fuera de las dos filas objetivo: % (% -> %)', r.t, r.antes, r.despues;
  END LOOP;
  SELECT a.h::int - d.h::int INTO n FROM fp_antes a JOIN fp_despues d USING (t) WHERE t = 'n:Ciudad:brand-1';
  IF n <> 1 THEN RAISE EXCEPTION 'Ciudad brand-1 debía bajar exactamente en 1, bajó %', n; END IF;

  SELECT "ciudadId" INTO v FROM "Traslado" WHERE id = '251';
  IF v IS DISTINCT FROM 'cmrdyrtw50016qx4wwal5sxbe' THEN RAISE EXCEPTION 'el Traslado 251 quedó apuntando a %', v; END IF;
  SELECT count(*) INTO n FROM "Ciudad" WHERE id = 'cmrdzgcdk001gqx4wmsamfayq';
  IF n <> 0 THEN RAISE EXCEPTION 'la Holbox nueva sigue existiendo'; END IF;

  -- Red que no depende de la lista de tablas hasheadas: en esta transacción
  -- solo pueden haber cambiado Traslado (1 update) y Ciudad (1 delete).
  FOR r IN
    SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_xact_user_tables
     WHERE schemaname = 'public' AND n_tup_ins + n_tup_upd + n_tup_del > 0
       AND NOT (relname = 'Traslado' AND n_tup_ins = 0 AND n_tup_upd = 1 AND n_tup_del = 0)
       AND NOT (relname = 'Ciudad' AND n_tup_ins = 0 AND n_tup_upd = 0 AND n_tup_del = 1)
  LOOP
    RAISE EXCEPTION 'escritura inesperada en % (ins % upd % del %)', r.relname, r.n_tup_ins, r.n_tup_upd, r.n_tup_del;
  END LOOP;
  SELECT count(*) INTO n FROM pg_stat_xact_user_tables
   WHERE schemaname = 'public' AND relname IN ('Traslado', 'Ciudad') AND n_tup_ins + n_tup_upd + n_tup_del > 0;
  IF n <> 2 THEN RAISE EXCEPTION 'pg_stat_xact no registra las dos escrituras esperadas (registra %)', n; END IF;
END $$;

\if :ensayo
\echo ENSAYO OK: todos los asserts pasaron. ROLLBACK.
ROLLBACK;
\else
COMMIT;
\echo COMMIT: fusión de Holbox aplicada.
\endif
