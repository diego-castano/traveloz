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
    id: 'aereo-1',
    brandId: 'brand-1',
    ruta: 'MVD - GIG - MVD',
    destino: 'Rio de Janeiro',
    aerolinea: 'Azul',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 08:00 → GIG 11:30 (directo). VUELTA: GIG 14:00 → MVD 17:30 (directo).',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-2',
    brandId: 'brand-1',
    ruta: 'MVD - CUN - MVD',
    destino: 'Cancun',
    aerolinea: 'Copa Airlines',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:15 → CUN 16:30. VUELTA: CUN 09:00 → PTY 12:15 / PTY 14:30 → MVD 22:00.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-3',
    brandId: 'brand-1',
    ruta: 'MVD - PUJ - MVD',
    destino: 'Punta Cana',
    aerolinea: 'Aerolineas Argentinas',
    equipaje: '1 valija 23kg + 1 carry-on 8kg',
    itinerario: 'IDA: MVD 07:00 → EZE 07:50 / EZE 10:00 → PUJ 16:30. VUELTA: PUJ 18:00 → EZE 00:30+1 / EZE 08:00 → MVD 08:50.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-4',
    brandId: 'brand-1',
    ruta: 'MVD - MIA - MVD',
    destino: 'Miami',
    aerolinea: 'American Airlines',
    equipaje: '2 valijas 23kg c/u + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 01:00 → MIA 09:30 (directo). VUELTA: MIA 22:00 → MVD 06:30+1 (directo).',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-5',
    brandId: 'brand-1',
    ruta: 'MVD - FLN - MVD',
    destino: 'Florianopolis',
    aerolinea: 'Azul',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 10:00 → FLN 12:00 (directo). VUELTA: FLN 15:00 → MVD 17:00 (directo).',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-6',
    brandId: 'brand-1',
    ruta: 'MVD - SSA - MVD',
    destino: 'Salvador de Bahia',
    aerolinea: 'LATAM',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 06:00 → GRU 08:30 / GRU 10:45 → SSA 13:30. VUELTA: SSA 14:30 → GRU 17:15 / GRU 19:30 → MVD 22:00.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-7',
    brandId: 'brand-1',
    ruta: 'MVD - MAD - MVD',
    destino: 'Madrid',
    aerolinea: 'Iberia',
    equipaje: '2 valijas 23kg c/u + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 22:00 → MAD 12:30+1 (directo). VUELTA: MAD 00:30 → MVD 07:00 (directo).',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono)
  {
    id: 'aereo-8',
    brandId: 'brand-2',
    ruta: 'MVD - GIG - MVD',
    destino: 'Rio de Janeiro',
    aerolinea: 'LATAM',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 09:00 → GRU 11:30 / GRU 13:00 → GIG 14:00. VUELTA: GIG 16:00 → GRU 17:00 / GRU 19:00 → MVD 21:30.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-9',
    brandId: 'brand-2',
    ruta: 'MVD - EZE - MVD',
    destino: 'Buenos Aires',
    aerolinea: 'Aerolineas Argentinas',
    equipaje: '1 valija 15kg + 1 carry-on 8kg',
    itinerario: 'IDA: MVD 08:00 → EZE 08:50 (directo). VUELTA: EZE 19:00 → MVD 19:50 (directo).',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-10',
    brandId: 'brand-2',
    ruta: 'MVD - MCO - MVD',
    destino: 'Orlando',
    aerolinea: 'Copa Airlines',
    equipaje: '2 valijas 23kg c/u + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:00 → MCO 17:30. VUELTA: MCO 08:00 → PTY 11:30 / PTY 14:30 → MVD 22:00.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-11',
    brandId: 'brand-2',
    ruta: 'MVD - CUN - MVD',
    destino: 'Cancun',
    aerolinea: 'Copa Airlines',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 06:30 → PTY 11:00 / PTY 13:15 → CUN 16:30. VUELTA: CUN 09:00 → PTY 12:15 / PTY 14:30 → MVD 22:00.',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'aereo-12',
    brandId: 'brand-2',
    ruta: 'MVD - PUJ - MVD',
    destino: 'Punta Cana',
    aerolinea: 'LATAM',
    equipaje: '1 valija 23kg + 1 carry-on 10kg',
    itinerario: 'IDA: MVD 06:00 → GRU 08:30 / GRU 11:00 → PUJ 17:00. VUELTA: PUJ 18:30 → GRU 01:00+1 / GRU 07:00 → MVD 09:30.',
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
  { id: 'precio-aereo-1', aereoId: 'aereo-1', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 420, precioMenor: 310 },
  { id: 'precio-aereo-2', aereoId: 'aereo-1', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 580, precioMenor: 430 },

  // aereo-2: MVD-CUN (Copa) brand-1
  { id: 'precio-aereo-3', aereoId: 'aereo-2', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 680, precioMenor: 510 },
  { id: 'precio-aereo-4', aereoId: 'aereo-2', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 890, precioMenor: 670 },
  { id: 'precio-aereo-5', aereoId: 'aereo-2', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 950, precioMenor: 710 },

  // aereo-3: MVD-PUJ (Aerolineas Argentinas) brand-1
  { id: 'precio-aereo-6', aereoId: 'aereo-3', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 620, precioMenor: 465 },
  { id: 'precio-aereo-7', aereoId: 'aereo-3', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 820, precioMenor: 615 },

  // aereo-4: MVD-MIA (American Airlines) brand-1
  { id: 'precio-aereo-8', aereoId: 'aereo-4', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 750, precioMenor: 560 },
  { id: 'precio-aereo-9', aereoId: 'aereo-4', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 980, precioMenor: 735 },
  { id: 'precio-aereo-10', aereoId: 'aereo-4', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 1050, precioMenor: 790 },

  // aereo-5: MVD-FLN (Azul) brand-1
  { id: 'precio-aereo-11', aereoId: 'aereo-5', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 350, precioMenor: 260 },
  { id: 'precio-aereo-12', aereoId: 'aereo-5', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 490, precioMenor: 370 },

  // aereo-6: MVD-SSA (LATAM) brand-1
  { id: 'precio-aereo-13', aereoId: 'aereo-6', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 480, precioMenor: 360 },
  { id: 'precio-aereo-14', aereoId: 'aereo-6', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 650, precioMenor: 490 },

  // aereo-7: MVD-MAD (Iberia) brand-1
  { id: 'precio-aereo-15', aereoId: 'aereo-7', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 890, precioMenor: 670 },
  { id: 'precio-aereo-16', aereoId: 'aereo-7', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 1180, precioMenor: 890 },

  // aereo-8: MVD-GIG (LATAM) brand-2
  { id: 'precio-aereo-17', aereoId: 'aereo-8', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 440, precioMenor: 330 },
  { id: 'precio-aereo-18', aereoId: 'aereo-8', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 610, precioMenor: 460 },

  // aereo-9: MVD-EZE (Aerolineas Argentinas) brand-2
  { id: 'precio-aereo-19', aereoId: 'aereo-9', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 180, precioMenor: 135 },
  { id: 'precio-aereo-20', aereoId: 'aereo-9', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 260, precioMenor: 195 },

  // aereo-10: MVD-MCO (Copa) brand-2
  { id: 'precio-aereo-21', aereoId: 'aereo-10', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 780, precioMenor: 585 },
  { id: 'precio-aereo-22', aereoId: 'aereo-10', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 1020, precioMenor: 765 },
  { id: 'precio-aereo-23', aereoId: 'aereo-10', periodoDesde: VACACIONES_DESDE, periodoHasta: VACACIONES_HASTA, precioAdulto: 1100, precioMenor: 825 },

  // aereo-11: MVD-CUN (Copa) brand-2
  { id: 'precio-aereo-24', aereoId: 'aereo-11', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 700, precioMenor: 525 },
  { id: 'precio-aereo-25', aereoId: 'aereo-11', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 920, precioMenor: 690 },

  // aereo-12: MVD-PUJ (LATAM) brand-2
  { id: 'precio-aereo-26', aereoId: 'aereo-12', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioAdulto: 640, precioMenor: 480 },
  { id: 'precio-aereo-27', aereoId: 'aereo-12', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioAdulto: 850, precioMenor: 640 },
];
