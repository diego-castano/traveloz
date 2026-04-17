// ---------------------------------------------------------------------------
// Aereo & PrecioAereo Seed Data -- Flights from Montevideo (MVD).
// Real airline names and IATA routes from the Uruguayan travel market.
// ---------------------------------------------------------------------------

import type { Aereo, PrecioAereo } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// Price periods: Baja (Mar-Jun), Alta (Jul-Dec), Baja 2027 (Jan-Feb)
const BAJA_DESDE = '2026-03-01';
const BAJA_HASTA = '2026-06-30';
const ALTA_DESDE = '2026-07-01';
const ALTA_HASTA = '2026-12-31';
const VACACIONES_DESDE = '2026-07-01';
const VACACIONES_HASTA = '2026-07-31';

// ---------------------------------------------------------------------------
// Aereos -- 12 routes (7 brand-1, 5 brand-2)
// ---------------------------------------------------------------------------

export const SEED_AEREOS: Aereo[] = [
  // brand-1 (TravelOz)
  {
    id: '001',
    brandId: 'brand-1',
    ruta: 'MVD - GIG - MVD',
    destino: 'Rio de Janeiro',
    aerolinea: 'Azul',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 08:00 → GIG 11:30 (directo). VUELTA: GIG 14:00 → MVD 17:30 (directo).',
    escalas: 0,
    codigoVueloIda: 'AD 7742',
    codigoVueloVuelta: 'AD 7743',
    duracionIda: '3h 30m',
    duracionVuelta: '3h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '002',
    brandId: 'brand-1',
    ruta: 'MVD - CUN - MVD',
    destino: 'Cancun',
    aerolinea: 'Copa Airlines',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:15 → CUN 16:30. VUELTA: CUN 09:00 → PTY 12:15 / PTY 14:30 → MVD 22:00.',
    escalas: 1,
    codigoVueloIda: 'CM 4821',
    codigoVueloVuelta: 'CM 4822',
    duracionIda: '10h 00m',
    duracionVuelta: '12h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '003',
    brandId: 'brand-1',
    ruta: 'MVD - PUJ - MVD',
    destino: 'Punta Cana',
    aerolinea: 'Aerolineas Argentinas',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 07:00 → EZE 07:50 / EZE 10:00 → PUJ 16:30. VUELTA: PUJ 18:00 → EZE 00:30+1 / EZE 08:00 → MVD 08:50.',
    escalas: 1,
    codigoVueloIda: 'AR 1531',
    codigoVueloVuelta: 'AR 1532',
    duracionIda: '9h 30m',
    duracionVuelta: '14h 50m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '004',
    brandId: 'brand-1',
    ruta: 'MVD - MIA - MVD',
    destino: 'Miami',
    aerolinea: 'American Airlines',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 01:00 → MIA 09:30 (directo). VUELTA: MIA 22:00 → MVD 06:30+1 (directo).',
    escalas: 0,
    codigoVueloIda: 'AA 9302',
    codigoVueloVuelta: 'AA 9303',
    duracionIda: '8h 30m',
    duracionVuelta: '8h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '005',
    brandId: 'brand-1',
    ruta: 'MVD - FLN - MVD',
    destino: 'Florianopolis',
    aerolinea: 'Azul',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 10:00 → FLN 12:00 (directo). VUELTA: FLN 15:00 → MVD 17:00 (directo).',
    escalas: 0,
    codigoVueloIda: 'AD 5516',
    codigoVueloVuelta: 'AD 5517',
    duracionIda: '2h 00m',
    duracionVuelta: '2h 00m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '006',
    brandId: 'brand-1',
    ruta: 'MVD - SSA - MVD',
    destino: 'Salvador de Bahia',
    aerolinea: 'LATAM',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 06:00 → GRU 08:30 / GRU 10:45 → SSA 13:30. VUELTA: SSA 14:30 → GRU 17:15 / GRU 19:30 → MVD 22:00.',
    escalas: 1,
    codigoVueloIda: 'LA 3648',
    codigoVueloVuelta: 'LA 3649',
    duracionIda: '7h 30m',
    duracionVuelta: '7h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '007',
    brandId: 'brand-1',
    ruta: 'MVD - MAD - MVD',
    destino: 'Madrid',
    aerolinea: 'Iberia',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 22:00 → MAD 12:30+1 (directo). VUELTA: MAD 00:30 → MVD 07:00 (directo).',
    escalas: 0,
    codigoVueloIda: 'IB 6012',
    codigoVueloVuelta: 'IB 6013',
    duracionIda: '12h 30m',
    duracionVuelta: '12h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono)
  {
    id: '008',
    brandId: 'brand-2',
    ruta: 'MVD - GIG - MVD',
    destino: 'Rio de Janeiro',
    aerolinea: 'LATAM',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 09:00 → GRU 11:30 / GRU 13:00 → GIG 14:00. VUELTA: GIG 16:00 → GRU 17:00 / GRU 19:00 → MVD 21:30.',
    escalas: 1,
    codigoVueloIda: 'LA 2710',
    codigoVueloVuelta: 'LA 2711',
    duracionIda: '5h 00m',
    duracionVuelta: '5h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '009',
    brandId: 'brand-2',
    ruta: 'MVD - EZE - MVD',
    destino: 'Buenos Aires',
    aerolinea: 'Aerolineas Argentinas',
    equipaje: 'Articulo personal + Equipaje de mano',
    itinerario: 'IDA: MVD 08:00 → EZE 08:50 (directo). VUELTA: EZE 19:00 → MVD 19:50 (directo).',
    escalas: 0,
    codigoVueloIda: 'AR 1401',
    codigoVueloVuelta: 'AR 1402',
    duracionIda: '0h 50m',
    duracionVuelta: '0h 50m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '010',
    brandId: 'brand-2',
    ruta: 'MVD - MCO - MVD',
    destino: 'Orlando',
    aerolinea: 'Copa Airlines',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:00 → MCO 17:30. VUELTA: MCO 08:00 → PTY 11:30 / PTY 14:30 → MVD 22:00.',
    escalas: 1,
    codigoVueloIda: 'CM 3915',
    codigoVueloVuelta: 'CM 3916',
    duracionIda: '11h 00m',
    duracionVuelta: '13h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '011',
    brandId: 'brand-2',
    ruta: 'MVD - CUN - MVD',
    destino: 'Cancun',
    aerolinea: 'Copa Airlines',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:15 → CUN 16:30. VUELTA: CUN 09:00 → PTY 12:15 / PTY 14:30 → MVD 22:00.',
    escalas: 1,
    codigoVueloIda: 'CM 4821',
    codigoVueloVuelta: 'CM 4822',
    duracionIda: '10h 00m',
    duracionVuelta: '12h 30m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '012',
    brandId: 'brand-2',
    ruta: 'MVD - PUJ - MVD',
    destino: 'Punta Cana',
    aerolinea: 'LATAM',
    equipaje: 'Equipaje de mano + Equipaje en bodega',
    itinerario: 'IDA: MVD 06:00 → GRU 08:30 / GRU 11:00 → PUJ 17:00. VUELTA: PUJ 18:30 → GRU 01:00+1 / GRU 07:00 → MVD 09:30.',
    escalas: 1,
    codigoVueloIda: 'LA 8074',
    codigoVueloVuelta: 'LA 8075',
    duracionIda: '11h 00m',
    duracionVuelta: '15h 00m',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// PrecioAereo -- 2-3 price periods per aereo
// Menores at ~70-80% of adult price
// ---------------------------------------------------------------------------

export const SEED_PRECIOS_AEREO: PrecioAereo[] = [
  // aereo-1: MVD-GIG (Azul) brand-1
  { id: 'precio-aereo-1', aereoId: '001', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 420 },
  { id: 'precio-aereo-2', aereoId: '001', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 580 },

  // aereo-2: MVD-CUN (Copa) brand-1
  { id: 'precio-aereo-3', aereoId: '002', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 680 },
  { id: 'precio-aereo-4', aereoId: '002', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 890 },
  { id: 'precio-aereo-5', aereoId: '002', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 950 },

  // aereo-3: MVD-PUJ (Aerolineas Argentinas) brand-1
  { id: 'precio-aereo-6', aereoId: '003', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 620 },
  { id: 'precio-aereo-7', aereoId: '003', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 820 },

  // aereo-4: MVD-MIA (American Airlines) brand-1
  { id: 'precio-aereo-8', aereoId: '004', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 750 },
  { id: 'precio-aereo-9', aereoId: '004', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 980 },
  { id: 'precio-aereo-10', aereoId: '004', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 1050 },

  // aereo-5: MVD-FLN (Azul) brand-1
  { id: 'precio-aereo-11', aereoId: '005', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 350 },
  { id: 'precio-aereo-12', aereoId: '005', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 490 },

  // aereo-6: MVD-SSA (LATAM) brand-1
  { id: 'precio-aereo-13', aereoId: '006', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 480 },
  { id: 'precio-aereo-14', aereoId: '006', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 650 },

  // aereo-7: MVD-MAD (Iberia) brand-1
  { id: 'precio-aereo-15', aereoId: '007', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 890 },
  { id: 'precio-aereo-16', aereoId: '007', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 1180 },

  // aereo-8: MVD-GIG (LATAM) brand-2
  { id: 'precio-aereo-17', aereoId: '008', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 440 },
  { id: 'precio-aereo-18', aereoId: '008', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 610 },

  // aereo-9: MVD-EZE (Aerolineas Argentinas) brand-2
  { id: 'precio-aereo-19', aereoId: '009', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 180 },
  { id: 'precio-aereo-20', aereoId: '009', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 260 },

  // aereo-10: MVD-MCO (Copa) brand-2
  { id: 'precio-aereo-21', aereoId: '010', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 780 },
  { id: 'precio-aereo-22', aereoId: '010', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 1020 },
  { id: 'precio-aereo-23', aereoId: '010', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 1100 },

  // aereo-11: MVD-CUN (Copa) brand-2
  { id: 'precio-aereo-24', aereoId: '011', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 700 },
  { id: 'precio-aereo-25', aereoId: '011', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 920 },

  // aereo-12: MVD-PUJ (LATAM) brand-2
  { id: 'precio-aereo-26', aereoId: '012', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 640 },
  { id: 'precio-aereo-27', aereoId: '012', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 850 },
];
