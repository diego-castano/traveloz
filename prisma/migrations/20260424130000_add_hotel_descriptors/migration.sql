-- Add descriptive columns to Alojamiento for the client's new hotel Sheets.
-- categoriaTexto: fallback for non-numeric categories (e.g. "4*SUP", "Básica", "Media")
-- comentarios / ubicacion / aclaracion: free-text fields from the Sheets
ALTER TABLE "Alojamiento"
  ADD COLUMN "categoriaTexto" TEXT,
  ADD COLUMN "comentarios" TEXT,
  ADD COLUMN "ubicacion" TEXT,
  ADD COLUMN "aclaracion" TEXT;
