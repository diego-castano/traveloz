-- Tipos de servicio de proveedor que pidió el cliente (Amparo, 01/09): además
-- de los que ya había, hacen falta Paseos, Autos y Otros para no tener que
-- inventar al cargar. TRASLADOS deja de llamarse "Traslados y paseos" en la
-- UI: ahora paseos es su propia categoría. HOTELES se conserva (9 proveedores
-- lo usan) aunque no estaba en la lista del pedido.
--
-- Solo agrega valores al enum: ninguna fila cambia de categoría.
ALTER TYPE "CategoriaServicio" ADD VALUE IF NOT EXISTS 'PASEOS';
ALTER TYPE "CategoriaServicio" ADD VALUE IF NOT EXISTS 'AUTOS';
ALTER TYPE "CategoriaServicio" ADD VALUE IF NOT EXISTS 'OTROS';
