// ---------------------------------------------------------------------------
// Catalog Seed Data -- Reference data for the TravelOz admin panel.
// All values in Spanish. Realistic Uruguayan outbound travel market.
// ---------------------------------------------------------------------------

import type {
  Temporada,
  TipoPaquete,
  Regimen,
  Pais,
  Ciudad,
  Etiqueta,
} from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Temporadas (seasons) -- 4 for brand-1, 3 for brand-2
// ---------------------------------------------------------------------------

export const SEED_TEMPORADAS: Temporada[] = [
  // brand-1 (TravelOz)
  {
    id: 'temporada-1',
    brandId: 'brand-1',
    nombre: 'Baja 2026',
    orden: 1,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'temporada-2',
    brandId: 'brand-1',
    nombre: 'Alta 2026',
    orden: 2,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'temporada-3',
    brandId: 'brand-1',
    nombre: 'Baja 2027',
    orden: 3,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'temporada-4',
    brandId: 'brand-1',
    nombre: 'Vacaciones Julio 2026',
    orden: 4,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  // brand-2 (DestinoIcono)
  {
    id: 'temporada-5',
    brandId: 'brand-2',
    nombre: 'Baja 2026',
    orden: 1,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'temporada-6',
    brandId: 'brand-2',
    nombre: 'Alta 2026',
    orden: 2,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'temporada-7',
    brandId: 'brand-2',
    nombre: 'Vacaciones Julio 2026',
    orden: 3,
    activa: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];

// ---------------------------------------------------------------------------
// Tipos de Paquete -- 5 for brand-1, 3 for brand-2
// ---------------------------------------------------------------------------

export const SEED_TIPOS_PAQUETE: TipoPaquete[] = [
  // brand-1 (TravelOz)
  {
    id: 'tipo-1',
    brandId: 'brand-1',
    nombre: 'Lunas de miel',
    orden: 1,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-2',
    brandId: 'brand-1',
    nombre: 'Salidas grupales',
    orden: 2,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-3',
    brandId: 'brand-1',
    nombre: 'Cruceros',
    orden: 3,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-4',
    brandId: 'brand-1',
    nombre: 'Eventos',
    orden: 4,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-5',
    brandId: 'brand-1',
    nombre: 'Deporte',
    orden: 5,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  // brand-2 (DestinoIcono)
  {
    id: 'tipo-6',
    brandId: 'brand-2',
    nombre: 'Lunas de miel',
    orden: 1,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-7',
    brandId: 'brand-2',
    nombre: 'Salidas grupales',
    orden: 2,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'tipo-8',
    brandId: 'brand-2',
    nombre: 'Eventos',
    orden: 3,
    activo: true,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];

// ---------------------------------------------------------------------------
// Regimenes (meal plans) -- shared across brands, each brand gets its own set
// ---------------------------------------------------------------------------

export const SEED_REGIMENES: Regimen[] = [
  // brand-1
  {
    id: 'regimen-1',
    brandId: 'brand-1',
    nombre: 'Desayuno',
    abrev: 'BB',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-2',
    brandId: 'brand-1',
    nombre: 'All Inclusive',
    abrev: 'AI',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-3',
    brandId: 'brand-1',
    nombre: 'Media Pension',
    abrev: 'MP',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-4',
    brandId: 'brand-1',
    nombre: 'Solo Alojamiento',
    abrev: 'SA',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-5',
    brandId: 'brand-1',
    nombre: 'Pension Completa',
    abrev: 'PC',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  // brand-2
  {
    id: 'regimen-6',
    brandId: 'brand-2',
    nombre: 'Desayuno',
    abrev: 'BB',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-7',
    brandId: 'brand-2',
    nombre: 'All Inclusive',
    abrev: 'AI',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-8',
    brandId: 'brand-2',
    nombre: 'Media Pension',
    abrev: 'MP',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-9',
    brandId: 'brand-2',
    nombre: 'Solo Alojamiento',
    abrev: 'SA',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'regimen-10',
    brandId: 'brand-2',
    nombre: 'Pension Completa',
    abrev: 'PC',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];

// ---------------------------------------------------------------------------
// Paises -- 6 countries, duplicated per brand
// ---------------------------------------------------------------------------

export const SEED_PAISES: Pais[] = [
  // brand-1
  {
    id: 'pais-1',
    brandId: 'brand-1',
    nombre: 'Brasil',
    codigo: 'BR',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-2',
    brandId: 'brand-1',
    nombre: 'Mexico',
    codigo: 'MX',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-3',
    brandId: 'brand-1',
    nombre: 'Republica Dominicana',
    codigo: 'DO',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-4',
    brandId: 'brand-1',
    nombre: 'Argentina',
    codigo: 'AR',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-5',
    brandId: 'brand-1',
    nombre: 'Estados Unidos',
    codigo: 'US',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-6',
    brandId: 'brand-1',
    nombre: 'Espana',
    codigo: 'ES',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  // brand-2
  {
    id: 'pais-7',
    brandId: 'brand-2',
    nombre: 'Brasil',
    codigo: 'BR',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-8',
    brandId: 'brand-2',
    nombre: 'Mexico',
    codigo: 'MX',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-9',
    brandId: 'brand-2',
    nombre: 'Republica Dominicana',
    codigo: 'DO',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-10',
    brandId: 'brand-2',
    nombre: 'Argentina',
    codigo: 'AR',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-11',
    brandId: 'brand-2',
    nombre: 'Estados Unidos',
    codigo: 'US',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'pais-12',
    brandId: 'brand-2',
    nombre: 'Espana',
    codigo: 'ES',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];

// ---------------------------------------------------------------------------
// Ciudades -- No brandId (inherits from Pais)
// brand-1 paises: pais-1..pais-6, brand-2 paises: pais-7..pais-12
// ---------------------------------------------------------------------------

export const SEED_CIUDADES: Ciudad[] = [
  // Brasil (pais-1 / pais-7)
  { id: 'ciudad-1', paisId: 'pais-1', nombre: 'Buzios', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-2', paisId: 'pais-1', nombre: 'Rio de Janeiro', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-3', paisId: 'pais-1', nombre: 'Florianopolis', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-4', paisId: 'pais-1', nombre: 'Salvador de Bahia', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-5', paisId: 'pais-1', nombre: 'Maceio', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // Mexico (pais-2 / pais-8)
  { id: 'ciudad-6', paisId: 'pais-2', nombre: 'Cancun', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-7', paisId: 'pais-2', nombre: 'Playa del Carmen', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-8', paisId: 'pais-2', nombre: 'Los Cabos', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-9', paisId: 'pais-2', nombre: 'Puerto Vallarta', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // Republica Dominicana (pais-3 / pais-9)
  { id: 'ciudad-10', paisId: 'pais-3', nombre: 'Punta Cana', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-11', paisId: 'pais-3', nombre: 'Santo Domingo', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // Argentina (pais-4 / pais-10)
  { id: 'ciudad-12', paisId: 'pais-4', nombre: 'Buenos Aires', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-13', paisId: 'pais-4', nombre: 'Bariloche', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-14', paisId: 'pais-4', nombre: 'Mendoza', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // Estados Unidos (pais-5 / pais-11)
  { id: 'ciudad-15', paisId: 'pais-5', nombre: 'Miami', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-16', paisId: 'pais-5', nombre: 'Orlando', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-17', paisId: 'pais-5', nombre: 'Nueva York', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // Espana (pais-6 / pais-12)
  { id: 'ciudad-18', paisId: 'pais-6', nombre: 'Madrid', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-19', paisId: 'pais-6', nombre: 'Barcelona', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  // brand-2 ciudades (same cities, different paisIds)
  { id: 'ciudad-20', paisId: 'pais-7', nombre: 'Buzios', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-21', paisId: 'pais-7', nombre: 'Rio de Janeiro', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-22', paisId: 'pais-7', nombre: 'Florianopolis', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-23', paisId: 'pais-7', nombre: 'Salvador de Bahia', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-24', paisId: 'pais-8', nombre: 'Cancun', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-25', paisId: 'pais-8', nombre: 'Playa del Carmen', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-26', paisId: 'pais-9', nombre: 'Punta Cana', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-27', paisId: 'pais-9', nombre: 'Santo Domingo', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-28', paisId: 'pais-10', nombre: 'Buenos Aires', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-29', paisId: 'pais-11', nombre: 'Miami', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-30', paisId: 'pais-11', nombre: 'Orlando', createdAt: SEED_DATE, updatedAt: SEED_DATE },
  { id: 'ciudad-31', paisId: 'pais-12', nombre: 'Madrid', createdAt: SEED_DATE, updatedAt: SEED_DATE },
];

// ---------------------------------------------------------------------------
// Etiquetas -- 8 for brand-1, 5 for brand-2
// ---------------------------------------------------------------------------

export const SEED_ETIQUETAS: Etiqueta[] = [
  // brand-1
  {
    id: 'etiqueta-1',
    brandId: 'brand-1',
    nombre: 'Brasil',
    slug: 'brasil',
    color: '#22c55e',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-2',
    brandId: 'brand-1',
    nombre: 'Caribe',
    slug: 'caribe',
    color: '#06b6d4',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-3',
    brandId: 'brand-1',
    nombre: 'Europa',
    slug: 'europa',
    color: '#8b5cf6',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-4',
    brandId: 'brand-1',
    nombre: 'Black Week',
    slug: 'black-week',
    color: '#1e293b',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-5',
    brandId: 'brand-1',
    nombre: 'Promo Nordeste',
    slug: 'promo-nordeste',
    color: '#f97316',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-6',
    brandId: 'brand-1',
    nombre: 'Lunas de Miel',
    slug: 'lunas-de-miel',
    color: '#ec4899',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-7',
    brandId: 'brand-1',
    nombre: 'Vacaciones Julio',
    slug: 'vacaciones-julio',
    color: '#3b82f6',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-8',
    brandId: 'brand-1',
    nombre: 'Escapadas',
    slug: 'escapadas',
    color: '#14b8a6',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  // brand-2
  {
    id: 'etiqueta-9',
    brandId: 'brand-2',
    nombre: 'Brasil',
    slug: 'brasil',
    color: '#22c55e',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-10',
    brandId: 'brand-2',
    nombre: 'Caribe',
    slug: 'caribe',
    color: '#06b6d4',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-11',
    brandId: 'brand-2',
    nombre: 'Europa',
    slug: 'europa',
    color: '#8b5cf6',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-12',
    brandId: 'brand-2',
    nombre: 'Escapadas',
    slug: 'escapadas',
    color: '#14b8a6',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: 'etiqueta-13',
    brandId: 'brand-2',
    nombre: 'Lunas de Miel',
    slug: 'lunas-de-miel',
    color: '#ec4899',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];
