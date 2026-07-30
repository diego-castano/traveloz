-- Notas internas del circuito: texto libre para dejar quién es el operador que
-- lo maneja, el contacto y cualquier aclaración de la salida. Se despliega en
-- el módulo de vendedores (pedido del cliente).
-- Columna opcional: los circuitos existentes quedan en NULL, nada que migrar.
ALTER TABLE "Circuito" ADD COLUMN IF NOT EXISTS "notas" TEXT;
