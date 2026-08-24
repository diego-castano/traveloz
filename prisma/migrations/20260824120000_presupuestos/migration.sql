-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'ENVIADA', 'ABIERTA', 'VENCIDA', 'CONFIRMADA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cargo" TEXT;

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "claveEdicion" TEXT,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "estadoManual" "EstadoPresupuesto",
    "clienteNombre" TEXT,
    "clienteApellido" TEXT,
    "clienteEmail" TEXT,
    "clienteTelefono" TEXT,
    "clienteTelefonoDigitos" TEXT,
    "destino" TEXT,
    "mes" INTEGER,
    "anio" INTEGER,
    "fechaSalida" DATE,
    "soloVuelos" BOOLEAN NOT NULL DEFAULT false,
    "montoPrincipal" INTEGER,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "origenTipo" TEXT,
    "origenRef" TEXT,
    "contenido" JSONB NOT NULL,
    "notasInternas" TEXT,
    "vigenciaHoras" INTEGER NOT NULL DEFAULT 48,
    "enviadaAt" TIMESTAMP(3),
    "expiraAt" TIMESTAMP(3),
    "confirmadaAt" TIMESTAMP(3),
    "confirmadaOpcion" TEXT,
    "confirmadaVia" TEXT,
    "aperturas" INTEGER NOT NULL DEFAULT 0,
    "primeraAperturaAt" TIMESTAMP(3),
    "ultimaAperturaAt" TIMESTAMP(3),
    "tiempoArmadoSeg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoEvento" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "actorTipo" TEXT NOT NULL,
    "actorId" TEXT,
    "ocurridoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresupuestoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoLink" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "vigenciaHoras" INTEGER NOT NULL,
    "emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "revocadoAt" TIMESTAMP(3),

    CONSTRAINT "PresupuestoLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoApertura" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "abiertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "dispositivo" TEXT,
    "ip" TEXT,
    "seccionMax" TEXT,
    "segundos" INTEGER,

    CONSTRAINT "PresupuestoApertura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaPresupuesto" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "destino" TEXT,
    "detalle" TEXT,
    "vendedorId" TEXT,
    "contenido" JSONB NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "ultimoUsoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlantillaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelFavorito" (
    "vendedorId" TEXT NOT NULL,
    "alojamientoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelFavorito_pkey" PRIMARY KEY ("vendedorId","alojamientoId")
);

-- CreateTable
CREATE TABLE "Aeropuerto" (
    "codigo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "terminal" TEXT,

    CONSTRAINT "Aeropuerto_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Aerolinea" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Aerolinea_pkey" PRIMARY KEY ("codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_numero_key" ON "Presupuesto"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_claveEdicion_key" ON "Presupuesto"("claveEdicion");

-- CreateIndex
CREATE INDEX "Presupuesto_brandId_vendedorId_deletedAt_idx" ON "Presupuesto"("brandId", "vendedorId", "deletedAt");

-- CreateIndex
CREATE INDEX "Presupuesto_brandId_estado_idx" ON "Presupuesto"("brandId", "estado");

-- CreateIndex
CREATE INDEX "Presupuesto_numero_idx" ON "Presupuesto"("numero");

-- CreateIndex
CREATE INDEX "Presupuesto_clienteTelefonoDigitos_idx" ON "Presupuesto"("clienteTelefonoDigitos");

-- CreateIndex
CREATE INDEX "PresupuestoEvento_presupuestoId_ocurridoAt_idx" ON "PresupuestoEvento"("presupuestoId", "ocurridoAt");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoLink_token_key" ON "PresupuestoLink"("token");

-- CreateIndex
CREATE INDEX "PresupuestoLink_presupuestoId_idx" ON "PresupuestoLink"("presupuestoId");

-- CreateIndex
CREATE INDEX "PresupuestoApertura_linkId_abiertaAt_idx" ON "PresupuestoApertura"("linkId", "abiertaAt");

-- CreateIndex
CREATE INDEX "PlantillaPresupuesto_brandId_deletedAt_idx" ON "PlantillaPresupuesto"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "PlantillaPresupuesto_vendedorId_idx" ON "PlantillaPresupuesto"("vendedorId");

-- CreateIndex
CREATE INDEX "HotelFavorito_alojamientoId_idx" ON "HotelFavorito"("alojamientoId");

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoEvento" ADD CONSTRAINT "PresupuestoEvento_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoLink" ADD CONSTRAINT "PresupuestoLink_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoApertura" ADD CONSTRAINT "PresupuestoApertura_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PresupuestoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelFavorito" ADD CONSTRAINT "HotelFavorito_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelFavorito" ADD CONSTRAINT "HotelFavorito_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ──────────────────────────────────────────────────────────────────────────
-- Semilla del cotizador. Todo idempotente (ON CONFLICT DO NOTHING): esta
-- migración se puede correr sobre una base que ya tenga los datos cargados.
-- ──────────────────────────────────────────────────────────────────────────

-- Aeropuertos (IATA). `terminal` solo cuando la ciudad tiene más de una y el
-- vendedor necesita distinguirlas en la ficha del pasajero.
INSERT INTO "Aeropuerto" ("codigo", "ciudad", "nombre", "terminal") VALUES
  ('MVD', 'Montevideo',        'Aeropuerto de Carrasco',                 NULL),
  ('GRU', 'São Paulo',         'Aeropuerto de Guarulhos',                'Guarulhos'),
  ('GIG', 'Río de Janeiro',    'Aeropuerto de Galeão',                   NULL),
  ('CGH', 'São Paulo',         'Aeropuerto de Congonhas',                'Congonhas'),
  ('EZE', 'Buenos Aires',      'Aeropuerto de Ezeiza',                   'Ezeiza'),
  ('AEP', 'Buenos Aires',      'Aeroparque Jorge Newbery',               'Aeroparque'),
  ('PUJ', 'Punta Cana',        'Aeropuerto Internacional de Punta Cana', NULL),
  ('MAD', 'Madrid',            'Aeropuerto de Barajas',                  NULL),
  ('BCN', 'Barcelona',         'Aeropuerto de El Prat',                  NULL),
  ('LIS', 'Lisboa',            'Aeropuerto Humberto Delgado',            NULL),
  ('CDG', 'París',             'Aeropuerto Charles de Gaulle',           'CDG'),
  ('FCO', 'Roma',              'Aeropuerto de Fiumicino',                'Fiumicino'),
  ('CUN', 'Cancún',            'Aeropuerto Internacional de Cancún',     NULL),
  ('SCL', 'Santiago de Chile', 'Aeropuerto de Pudahuel',                 NULL),
  ('FLN', 'Florianópolis',     'Aeropuerto Hercílio Luz',                NULL),
  ('PTY', 'Panamá',            'Aeropuerto de Tocumen',                  NULL),
  ('MIA', 'Miami',             'Aeropuerto Internacional de Miami',      NULL),
  ('BPS', 'Porto Seguro',      'Aeropuerto de Porto Seguro',             NULL)
ON CONFLICT ("codigo") DO NOTHING;

-- Aerolíneas (IATA de 2 caracteres) — el parser de PNR traduce el código.
INSERT INTO "Aerolinea" ("codigo", "nombre") VALUES
  ('LA', 'LATAM'),
  ('AR', 'Aerolíneas Argentinas'),
  ('G3', 'GOL'),
  ('AD', 'Azul'),
  ('CM', 'Copa Airlines'),
  ('AV', 'Avianca'),
  ('IB', 'Iberia'),
  ('AF', 'Air France'),
  ('UX', 'Air Europa'),
  ('TP', 'TAP Air Portugal'),
  ('H2', 'Sky Airline'),
  ('JJ', 'LATAM Brasil')
ON CONFLICT ("codigo") DO NOTHING;

-- Ajustes del cotizador (grupo "cotizador" en /backend/web).
-- La plantilla usa {nombre} y {link}; las condiciones usan {vigencia}.
INSERT INTO "SiteSetting" ("key", "value", "type", "group", "label", "updatedAt") VALUES
  (
    'cotizador_plantilla_mensaje',
    'Hola {nombre}, ¿cómo estás?

Según lo conversado, te envío la cotización solicitada.

En caso de que les interese la propuesta, solicitamos nos completen en el siguiente link la información de cada pasajero tal cual figura en el documento de viaje, y así comenzar el proceso de reserva:
{link}',
    'textarea',
    'cotizador',
    'Mensaje que acompaña toda cotización (usá {nombre} y {link})',
    NOW()
  ),
  (
    'cotizador_condiciones',
    'Precios en dólares americanos, según la tarifa y ocupación indicadas.
Valores sujetos a disponibilidad y confirmación al momento de la reserva.
Tarifa no incluye gastos personales ni excursiones no detalladas.
Cotización válida por {vigencia} horas.',
    'textarea',
    'cotizador',
    'Condiciones al pie de la cotización (una por línea; {vigencia} = horas)',
    NOW()
  ),
  (
    'cotizador_vigencia_default',
    '48',
    'text',
    'cotizador',
    'Vigencia por defecto del link, en horas',
    NOW()
  ),
  (
    'cotizador_email_copia',
    'cotizaciones@traveloz.com.uy',
    'text',
    'cotizador',
    'Casilla que recibe copia de cada cotización enviada',
    NOW()
  ),
  (
    'cotizador_factor_default',
    '0.88',
    'text',
    'cotizador',
    'Factor por defecto para el precio de venta (venta = neto ÷ factor)',
    NOW()
  )
ON CONFLICT ("key") DO NOTHING;
