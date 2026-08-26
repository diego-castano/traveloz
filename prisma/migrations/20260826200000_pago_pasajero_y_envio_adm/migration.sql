-- Pasajeros y Pagos · pedidos del cliente del 26/08/2026.
--
-- Todo aditivo: cinco columnas nuevas nullable, un índice nuevo y un UPDATE
-- acotado de copy. Sin DROP, sin NOT NULL, sin cambios de tipo. Los registros
-- viejos siguen leyéndose igual (pasajeroNombre en null cae al titular).

-- 1. DatosPagoCifrado
--    · pasajeroNombre / pasajeroDocumento: el pasajero al que corresponde el
--      pago. Van EN CLARO (fuera del sobre AES) porque son la identidad del
--      registro en el listado, en la bandeja y en el asunto de los avisos.
--    · numeroFile / enviadoAdmAt / enviadoAdmPor: el envío a Administración.
ALTER TABLE "DatosPagoCifrado" ADD COLUMN     "enviadoAdmAt" TIMESTAMP(3),
ADD COLUMN     "enviadoAdmPor" TEXT,
ADD COLUMN     "numeroFile" TEXT,
ADD COLUMN     "pasajeroDocumento" TEXT,
ADD COLUMN     "pasajeroNombre" TEXT;

-- 2. AuditLog: el listado "Accesos: Gero abrió la tarjeta el 26/08 10:39"
--    consulta por targetType + targetId. Sin este índice era un seq scan.
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt" DESC);

-- 3. La bóveda pasó de 72 a 96 horas. El texto del formulario público de pago
--    es contenido editable guardado en la DB, así que el cambio de código no
--    lo alcanza: lo reescribimos acá, solo donde diga exactamente "72 horas".
UPDATE "FormularioDato"
   SET "texto" = replace("texto", '72 horas', '96 horas')
 WHERE "tipo" = 'PAGO'
   AND "texto" LIKE '%72 horas%';
