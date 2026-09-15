-- Hoteles cargados por vendedores desde el cotizador, fuera de Alojamientos. 2026-09-15.
--
-- Hasta el commit 646a454 el buscador de hotel del cotizador podía dar de alta
-- un Alojamiento. En once días quedaron 59, sin tarifas, fotos ni paquetes, con
-- duplicados y nombres mal escritos. Pedido del cliente: que salgan del back
-- sin romper las cotizaciones que ya los usan.
--
-- 1. En cada cotización y plantilla, un hotel de la lista pasa a texto libre
--    con lo mismo que veía el pasajero: su texto libre si ya tenía uno, si no
--    el nombre del catálogo, y las estrellas del catálogo. No se toca
--    updatedAt, así un vendedor con la cotización abierta no recibe un
--    conflicto de guardado (su autoguardado podría reponer el hotelId: el
--    script es idempotente y se puede volver a correr).
-- 2. Los 59 alojamientos quedan borrados lógicamente (deletedAt).
--
-- Ensayo (ROLLBACK):  psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=1 -f scripts/fixes/2026-09-15-hoteles-cotizador.sql
-- En serio:           psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -v ensayo=0 -f scripts/fixes/2026-09-15-hoteles-cotizador.sql
-- Copia previa y restauración: ~/backups/traveloz/2026-09-15-hoteles-cotizador (ver RESTORE.md).

\set ON_ERROR_STOP on
SET TimeZone = 'UTC';
BEGIN ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE hot ON COMMIT DROP AS
  SELECT a.id, btrim(a.nombre) AS nombre, coalesce(a.categoria, 0) AS categoria, a."deletedAt"
  FROM "Alojamiento" a
  WHERE a.id IN ('1582', '1583', '1584', '1585', '1587', '1588', '1589', '1590', '1592', '1593', '1594', '1595', '1597', '1599', '1600', '1601', '1602', '1603', '1604', '1605', '1607', '1608', '1609', '1610', '1611', '1612', '1619', '1623', '1624', '1625', '1626', '1627', '1628', '1629', '1630', '1631', '1632', '1633', '1634', '1635', '1636', '1637', '1641', '1642', '1643', '1644', '1647', '1649', '1650', '1651', '1652', '1653', '1654', '1655', '1656', '1657', '1658', '1662', '1664');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM hot;
  IF n <> 59 THEN RAISE EXCEPTION 'esperaba 59 alojamientos, hay %', n; END IF;
  SELECT count(*) INTO n FROM hot h JOIN "Alojamiento" a ON a.id = h.id
   WHERE a."brandId" = 'brand-1' AND a."deletedAt" IS NULL
     AND (a.comentarios ILIKE 'Creado desde el cotizador%'
          OR EXISTS (SELECT 1 FROM "AuditLog" l WHERE l."targetId" = a.id AND l.action = 'alojamiento.create.cotizador'));
  IF n <> 59 THEN RAISE EXCEPTION 'no todos son de brand-1, activos y creados desde el cotizador (%)', n; END IF;
  SELECT (SELECT count(*) FROM "PrecioAlojamiento" WHERE "alojamientoId" IN (SELECT id FROM hot))
       + (SELECT count(*) FROM "AlojamientoFoto" WHERE "alojamientoId" IN (SELECT id FROM hot))
       + (SELECT count(*) FROM "PaqueteAlojamiento" WHERE "alojamientoId" IN (SELECT id FROM hot))
       + (SELECT count(*) FROM "OpcionHotel" WHERE "alojamientoId" IN (SELECT id FROM hot))
       + (SELECT count(*) FROM "HotelFavorito" WHERE "alojamientoId" IN (SELECT id FROM hot)) INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'algún alojamiento tiene tarifas, fotos, paquetes o favoritos (%)', n; END IF;
END $$;

-- Hotel de una opción pasado a texto libre. Recorre en orden, no toca nada más.
CREATE FUNCTION pg_temp.hoteles_a_libre(c jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  r record; s record; o jsonb; hs jsonb; opciones jsonb := '[]'::jsonb; x hot%ROWTYPE;
BEGIN
  IF c IS NULL OR jsonb_typeof(c->'opciones') IS DISTINCT FROM 'array' THEN RETURN c; END IF;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(c->'opciones') WITH ORDINALITY e(value, n) ORDER BY e.n LOOP
    o := r.v;
    IF jsonb_typeof(o->'hoteles') = 'array' THEN
      hs := '[]'::jsonb;
      FOR s IN SELECT e.value AS v FROM jsonb_array_elements(o->'hoteles') WITH ORDINALITY e(value, n) ORDER BY e.n LOOP
        SELECT * INTO x FROM hot WHERE id = s.v->>'hotelId';
        IF FOUND THEN
          hs := hs || jsonb_build_array(s.v || jsonb_build_object(
            'hotelId', NULL,
            'libre', CASE WHEN coalesce(btrim(s.v->>'libre'), '') <> '' THEN s.v->>'libre' ELSE x.nombre END,
            'cat', x.categoria));
        ELSE
          hs := hs || jsonb_build_array(s.v);
        END IF;
      END LOOP;
      o := jsonb_set(o, '{hoteles}', hs);
    END IF;
    opciones := opciones || jsonb_build_array(o);
  END LOOP;
  RETURN jsonb_set(c, '{opciones}', opciones);
END $$;

-- Lo que ve el pasajero de cada hotel de cada opción: nombre y estrellas.
CREATE FUNCTION pg_temp.vista(c jsonb, con_catalogo boolean) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(
           o.n || '.' || h.n || '=' ||
           coalesce(nullif(btrim(h.value->>'libre'), ''), a.nombre, 'A definir') || '*' ||
           CASE WHEN a.id IS NOT NULL THEN coalesce(a.categoria, 0)::text
                ELSE coalesce(nullif(h.value->>'cat', ''), '0') END,
           '|' ORDER BY o.n, h.n), '')
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c->'opciones') = 'array' THEN c->'opciones' ELSE '[]'::jsonb END) WITH ORDINALITY o(value, n)
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.value->'hoteles') = 'array' THEN o.value->'hoteles' ELSE '[]'::jsonb END) WITH ORDINALITY h(value, n)
  LEFT JOIN "Alojamiento" a ON con_catalogo AND a.id = h.value->>'hotelId'
$$;

-- La cotización sin los tres campos que cambian: tiene que quedar idéntica.
CREATE FUNCTION pg_temp.enmascarar(c jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r record; s record; o jsonb; hs jsonb; opciones jsonb := '[]'::jsonb;
BEGIN
  IF c IS NULL OR jsonb_typeof(c->'opciones') IS DISTINCT FROM 'array' THEN RETURN c; END IF;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(c->'opciones') WITH ORDINALITY e(value, n) ORDER BY e.n LOOP
    o := r.v;
    IF jsonb_typeof(o->'hoteles') = 'array' THEN
      hs := '[]'::jsonb;
      FOR s IN SELECT e.value AS v FROM jsonb_array_elements(o->'hoteles') WITH ORDINALITY e(value, n) ORDER BY e.n LOOP
        hs := hs || jsonb_build_array(s.v - 'hotelId' - 'libre' - 'cat');
      END LOOP;
      o := jsonb_set(o, '{hoteles}', hs);
    END IF;
    opciones := opciones || jsonb_build_array(o);
  END LOOP;
  RETURN jsonb_set(c, '{opciones}', opciones);
END $$;

CREATE TEMP TABLE afectados ON COMMIT DROP AS
  SELECT 'Presupuesto'::text AS tabla, p.id, p.contenido AS antes, pg_temp.vista(p.contenido, true) AS vista_antes,
         md5((to_jsonb(p) - 'contenido')::text) AS resto
  FROM "Presupuesto" p
  WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.contenido->'opciones') = 'array' THEN p.contenido->'opciones' ELSE '[]'::jsonb END) o
                CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o->'hoteles') = 'array' THEN o->'hoteles' ELSE '[]'::jsonb END) h
                WHERE h->>'hotelId' IN (SELECT id FROM hot))
  UNION ALL
  SELECT 'Plantilla', t.id, t.contenido, pg_temp.vista(t.contenido, true), md5((to_jsonb(t) - 'contenido')::text)
  FROM "PlantillaPresupuesto" t
  WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(t.contenido->'opciones') = 'array' THEN t.contenido->'opciones' ELSE '[]'::jsonb END) o
                CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o->'hoteles') = 'array' THEN o->'hoteles' ELSE '[]'::jsonb END) h
                WHERE h->>'hotelId' IN (SELECT id FROM hot));

CREATE TEMP TABLE huella_antes ON COMMIT DROP AS
  SELECT 'Presupuesto' AS t, md5(string_agg(x::text, '|' ORDER BY x.id)) AS h FROM "Presupuesto" x WHERE x.id NOT IN (SELECT id FROM afectados)
  UNION ALL SELECT 'Plantilla', md5(coalesce(string_agg(x::text, '|' ORDER BY x.id), '')) FROM "PlantillaPresupuesto" x WHERE x.id NOT IN (SELECT id FROM afectados)
  UNION ALL SELECT 'Alojamiento', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Alojamiento" x WHERE x.id NOT IN (SELECT id FROM hot)
  UNION ALL SELECT 'Alojamiento:59', md5(string_agg((to_jsonb(x) - 'deletedAt' - 'updatedAt')::text, '|' ORDER BY x.id)) FROM "Alojamiento" x WHERE x.id IN (SELECT id FROM hot);

\echo === alcance
SELECT tabla, count(*) AS filas FROM afectados GROUP BY tabla;
SELECT 'cotizaciones con fotos de hotel prendidas' AS dato, count(*) FROM afectados WHERE tabla = 'Presupuesto' AND (antes->>'fotosHotel')::boolean IS TRUE;

-- 1. Hoteles de las opciones a texto libre.
DO $$
DECLARE n int; m int;
BEGIN
  SELECT count(*) INTO m FROM afectados WHERE tabla = 'Presupuesto';
  UPDATE "Presupuesto" p SET contenido = pg_temp.hoteles_a_libre(p.contenido)
   WHERE p.id IN (SELECT id FROM afectados WHERE tabla = 'Presupuesto');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> m THEN RAISE EXCEPTION 'Presupuesto: esperaba % filas, hubo %', m, n; END IF;
  SELECT count(*) INTO m FROM afectados WHERE tabla = 'Plantilla';
  UPDATE "PlantillaPresupuesto" t SET contenido = pg_temp.hoteles_a_libre(t.contenido)
   WHERE t.id IN (SELECT id FROM afectados WHERE tabla = 'Plantilla');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> m THEN RAISE EXCEPTION 'Plantilla: esperaba % filas, hubo %', m, n; END IF;
END $$;

-- 2. Los 59 fuera de Alojamientos.
DO $$
DECLARE n int;
BEGIN
  UPDATE "Alojamiento" SET "deletedAt" = now(), "updatedAt" = now()
   WHERE id IN (SELECT id FROM hot) AND "deletedAt" IS NULL AND "brandId" = 'brand-1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 59 THEN RAISE EXCEPTION 'Alojamiento: esperaba 59 filas, hubo %', n; END IF;
END $$;

-- Invariantes.
DO $$
DECLARE n int; r record;
BEGIN
  -- Ninguna cotización ni plantilla, borrada o no, apunta a los 59.
  SELECT count(*) INTO n FROM "Presupuesto" p,
    jsonb_array_elements(CASE WHEN jsonb_typeof(p.contenido->'opciones') = 'array' THEN p.contenido->'opciones' ELSE '[]'::jsonb END) o,
    jsonb_array_elements(CASE WHEN jsonb_typeof(o->'hoteles') = 'array' THEN o->'hoteles' ELSE '[]'::jsonb END) h
   WHERE h->>'hotelId' IN (SELECT id FROM hot);
  IF n <> 0 THEN RAISE EXCEPTION 'quedan % referencias en cotizaciones', n; END IF;

  -- En cada fila tocada: el pasajero ve el mismo nombre y las mismas estrellas,
  -- y fuera de hotelId/libre/cat la cotización es byte a byte la misma.
  FOR r IN
    SELECT a.tabla, a.id, a.vista_antes, pg_temp.vista(coalesce(p.contenido, t.contenido), true) AS vista_despues,
           pg_temp.enmascarar(a.antes) = pg_temp.enmascarar(coalesce(p.contenido, t.contenido)) AS igual_resto,
           a.resto = md5((coalesce(to_jsonb(p), to_jsonb(t)) - 'contenido')::text) AS igual_columnas
    FROM afectados a
    LEFT JOIN "Presupuesto" p ON a.tabla = 'Presupuesto' AND p.id = a.id
    LEFT JOIN "PlantillaPresupuesto" t ON a.tabla = 'Plantilla' AND t.id = a.id
  LOOP
    IF r.vista_antes <> r.vista_despues THEN
      RAISE EXCEPTION '% %: cambia lo que ve el pasajero: [%] -> [%]', r.tabla, r.id, r.vista_antes, r.vista_despues;
    END IF;
    IF NOT r.igual_resto THEN RAISE EXCEPTION '% %: cambió algo más que el hotel', r.tabla, r.id; END IF;
    IF NOT r.igual_columnas THEN RAISE EXCEPTION '% %: cambió otra columna', r.tabla, r.id; END IF;
  END LOOP;

  -- Nada más cambió en esas tablas.
  FOR r IN
    SELECT hb.t, hb.h AS antes, hd.h AS despues FROM huella_antes hb JOIN (
      SELECT 'Presupuesto' AS t, md5(string_agg(x::text, '|' ORDER BY x.id)) AS h FROM "Presupuesto" x WHERE x.id NOT IN (SELECT id FROM afectados)
      UNION ALL SELECT 'Plantilla', md5(coalesce(string_agg(x::text, '|' ORDER BY x.id), '')) FROM "PlantillaPresupuesto" x WHERE x.id NOT IN (SELECT id FROM afectados)
      UNION ALL SELECT 'Alojamiento', md5(string_agg(x::text, '|' ORDER BY x.id)) FROM "Alojamiento" x WHERE x.id NOT IN (SELECT id FROM hot)
      UNION ALL SELECT 'Alojamiento:59', md5(string_agg((to_jsonb(x) - 'deletedAt' - 'updatedAt')::text, '|' ORDER BY x.id)) FROM "Alojamiento" x WHERE x.id IN (SELECT id FROM hot)
    ) hd USING (t) WHERE hb.h IS DISTINCT FROM hd.h
  LOOP
    RAISE EXCEPTION 'cambió algo fuera de lo previsto en %', r.t;
  END LOOP;

  -- Red que no depende de las huellas: solo pudieron escribir estas tablas.
  FOR r IN
    SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_xact_user_tables
     WHERE schemaname = 'public' AND n_tup_ins + n_tup_upd + n_tup_del > 0
       AND relname NOT IN ('Presupuesto', 'PlantillaPresupuesto', 'Alojamiento')
  LOOP
    RAISE EXCEPTION 'escritura inesperada en % (ins % upd % del %)', r.relname, r.n_tup_ins, r.n_tup_upd, r.n_tup_del;
  END LOOP;
  SELECT count(*) INTO n FROM pg_stat_xact_user_tables
   WHERE schemaname = 'public' AND relname = 'Alojamiento' AND n_tup_upd = 59 AND n_tup_ins = 0 AND n_tup_del = 0;
  IF n <> 1 THEN RAISE EXCEPTION 'Alojamiento no registra exactamente 59 updates'; END IF;
END $$;

\echo === resultado
SELECT 'alojamientos de la lista activos' AS dato, count(*) FROM "Alojamiento" WHERE id IN (SELECT id FROM hot) AND "deletedAt" IS NULL
UNION ALL SELECT 'filas de cotización convertidas', count(*) FROM afectados WHERE tabla = 'Presupuesto'
UNION ALL SELECT 'filas de plantilla convertidas', count(*) FROM afectados WHERE tabla = 'Plantilla';

\if :ensayo
\echo ENSAYO OK: todos los asserts pasaron. ROLLBACK.
ROLLBACK;
\else
COMMIT;
\echo COMMIT: hoteles del cotizador fuera de Alojamientos.
\endif
