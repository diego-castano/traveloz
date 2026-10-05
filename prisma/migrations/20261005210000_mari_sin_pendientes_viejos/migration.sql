-- Los 229 envíos de Comunidad Mari Oneill anteriores a la conexión con Bitrix
-- ya están en Bitrix: Agus Magnani cargó 227 a mano con el origen
-- "Influencer - Marina Oneill" (verificado con crm.deal.list el 05/10/2026).
-- Mandarlos desde el panel los duplicaría. La landing ofrece solo los envíos
-- desde el deploy que la conectó (05/10/2026 16:10, hora de Montevideo).
UPDATE "CotizadorLanding" SET "bitrixDesde" = '2026-10-05 19:10:00' WHERE "slug" = 'comunidad-mari-oneill';
