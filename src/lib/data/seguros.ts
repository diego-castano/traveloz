// ---------------------------------------------------------------------------
// Seguro Seed Data -- Travel insurance plans from Uruguayan providers.
// Real provider names and realistic coverage amounts / daily costs.
// ---------------------------------------------------------------------------

import type { Seguro } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Seguros -- 8 plans (5 brand-1, 3 brand-2)
// proveedorId: proveedor-1 (Universal Assistance), proveedor-2 (Assist Card),
//              proveedor-3 (Tarjetas Celeste) for brand-1
//              proveedor-7 (Universal Assistance b2), proveedor-8 (Assist Card b2) for brand-2
// ---------------------------------------------------------------------------

export const SEED_SEGUROS: Seguro[] = [
  // brand-1 (TravelOz)
  {
    id: '001',
    brandId: 'brand-1',
    proveedorId: 'proveedor-1', // Universal Assistance
    plan: 'Plan Basico',
    cobertura: 'USD 40.000',
    costoPorDia: 8,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '002',
    brandId: 'brand-1',
    proveedorId: 'proveedor-1', // Universal Assistance
    plan: 'Plan Premium',
    cobertura: 'USD 80.000',
    costoPorDia: 14,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '003',
    brandId: 'brand-1',
    proveedorId: 'proveedor-2', // Assist Card
    plan: 'AC 60',
    cobertura: 'USD 60.000',
    costoPorDia: 10,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '004',
    brandId: 'brand-1',
    proveedorId: 'proveedor-2', // Assist Card
    plan: 'AC 150',
    cobertura: 'USD 150.000',
    costoPorDia: 18,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '005',
    brandId: 'brand-1',
    proveedorId: 'proveedor-3', // Tarjetas Celeste
    plan: 'Plan Celeste',
    cobertura: 'USD 40.000',
    costoPorDia: 7,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-1 -- CX (no dedicated proveedor, uses generic brand-1 entry)
  {
    id: '006',
    brandId: 'brand-1',
    proveedorId: 'proveedor-1', // Universal Assistance (acts as CX distributor)
    plan: 'CX Max',
    cobertura: 'USD 300.000',
    costoPorDia: 22,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono)
  {
    id: '007',
    brandId: 'brand-2',
    proveedorId: 'proveedor-7', // Universal Assistance (brand-2)
    plan: 'Plan Basico',
    cobertura: 'USD 40.000',
    costoPorDia: 8,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '008',
    brandId: 'brand-2',
    proveedorId: 'proveedor-8', // Assist Card (brand-2)
    plan: 'AC 60',
    cobertura: 'USD 60.000',
    costoPorDia: 10,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];
