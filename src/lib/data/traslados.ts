// ---------------------------------------------------------------------------
// Traslado Seed Data -- Airport and intercity transfers.
// Real transfer routes from the Uruguayan travel market.
// ---------------------------------------------------------------------------

import type { Traslado } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Traslados -- 10 transfers (6 brand-1, 4 brand-2)
// proveedorId: proveedor-4 (Sevens) or proveedor-5 (BRT) for brand-1
//              proveedor-9 (Sevens brand-2) for brand-2
// ciudadId/paisId reference catalogos.ts IDs
// ---------------------------------------------------------------------------

export const SEED_TRASLADOS: Traslado[] = [
  // brand-1 (TravelOz)
  {
    id: 'traslado-1',
    brandId: 'brand-1',
    nombre: 'Transfer Aeropuerto Galeao - Zona Sur Rio',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-2', // Rio de Janeiro
    paisId: 'pais-1',     // Brasil
    proveedorId: 'proveedor-4', // Sevens
    precio: 35,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-2',
    brandId: 'brand-1',
    nombre: 'Transfer Aeropuerto Cancun - Zona Hotelera',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-6', // Cancun
    paisId: 'pais-2',     // Mexico
    proveedorId: 'proveedor-4', // Sevens
    precio: 25,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-3',
    brandId: 'brand-1',
    nombre: 'Transfer Privado Aeropuerto Cancun',
    tipo: 'PRIVADO',
    ciudadId: 'ciudad-6', // Cancun
    paisId: 'pais-2',     // Mexico
    proveedorId: 'proveedor-4', // Sevens
    precio: 85,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-4',
    brandId: 'brand-1',
    nombre: 'Transfer Aeropuerto Punta Cana - Hotel',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-10', // Punta Cana
    paisId: 'pais-3',      // Republica Dominicana
    proveedorId: 'proveedor-5', // BRT
    precio: 30,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-5',
    brandId: 'brand-1',
    nombre: 'Transfer Aeropuerto Miami - South Beach',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-15', // Miami
    paisId: 'pais-5',      // Estados Unidos
    proveedorId: 'proveedor-5', // BRT
    precio: 40,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-6',
    brandId: 'brand-1',
    nombre: 'Transfer Aeropuerto Barajas - Centro Madrid',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-18', // Madrid
    paisId: 'pais-6',      // Espana
    proveedorId: 'proveedor-5', // BRT
    precio: 35,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono)
  {
    id: 'traslado-7',
    brandId: 'brand-2',
    nombre: 'Transfer Aeropuerto Galeao - Zona Sur Rio',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-21', // Rio de Janeiro (brand-2)
    paisId: 'pais-7',      // Brasil (brand-2)
    proveedorId: 'proveedor-9', // Sevens (brand-2)
    precio: 35,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-8',
    brandId: 'brand-2',
    nombre: 'Transfer Aeropuerto Cancun - Zona Hotelera',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-24', // Cancun (brand-2)
    paisId: 'pais-8',      // Mexico (brand-2)
    proveedorId: 'proveedor-9', // Sevens (brand-2)
    precio: 25,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-9',
    brandId: 'brand-2',
    nombre: 'Transfer Privado Aeropuerto Barajas - Centro Madrid',
    tipo: 'PRIVADO',
    ciudadId: 'ciudad-31', // Madrid (brand-2)
    paisId: 'pais-12',     // Espana (brand-2)
    proveedorId: 'proveedor-9', // Sevens (brand-2)
    precio: 90,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'traslado-10',
    brandId: 'brand-2',
    nombre: 'Transfer Aeropuerto Ezeiza - Centro Buenos Aires',
    tipo: 'REGULAR',
    ciudadId: 'ciudad-28', // Buenos Aires (brand-2)
    paisId: 'pais-10',     // Argentina (brand-2)
    proveedorId: 'proveedor-9', // Sevens (brand-2)
    precio: 20,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];
