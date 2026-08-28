-- Firma de email en GIF animado por vendedor (pedido del cliente 28/08).
-- Aditiva y nullable: los usuarios que todavía no la cargaron siguen viendo la
-- firma HTML de siempre.
ALTER TABLE "User" ADD COLUMN "firmaUrl" TEXT;
