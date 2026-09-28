-- Los datos de pasajero y de tarjeta ya no vencen (pedido del cliente 28/09):
-- ni la solicitud por email ni la bóveda de pagos llevan fecha de expiración.
-- Solo se afloja el NOT NULL; las filas viejas conservan su fecha, que ya no
-- se lee. No se borra nada.
ALTER TABLE "SolicitudDato" ALTER COLUMN "expiraAt" DROP NOT NULL;
ALTER TABLE "DatosPagoCifrado" ALTER COLUMN "expiraAt" DROP NOT NULL;
