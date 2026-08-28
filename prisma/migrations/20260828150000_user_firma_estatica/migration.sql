-- Frame fijo de la firma animada (pedido del cliente 28/08, tarde).
-- El PDF sale de un Chromium headless que captura el GIF en el frame que esté
-- corriendo: en la cotización de Amparo la firma salió sin el logo. Al subir la
-- firma se genera además el último frame en WebP y el papel usa ese.
ALTER TABLE "User" ADD COLUMN "firmaEstaticaUrl" TEXT;
