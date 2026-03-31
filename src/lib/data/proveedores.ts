// ---------------------------------------------------------------------------
// Proveedor Seed Data -- Service suppliers for the Uruguayan travel market.
// All contact data realistic format. Phone numbers in +598 format.
// ---------------------------------------------------------------------------

import type { Proveedor, CategoriaServicio } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Proveedores -- 6 for brand-1, 4 for brand-2 (some shared suppliers)
// ---------------------------------------------------------------------------

export const SEED_PROVEEDORES: Proveedor[] = [
  // brand-1 (TravelOz) -- seguros providers
  {
    id: 'proveedor-1',
    brandId: 'brand-1',
    nombre: 'Universal Assistance',
    contacto: 'Maria Gonzalez',
    email: 'comercial@universalassistance.com',
    telefono: '+598 2900 1234',
    notas: 'Proveedor principal de seguros de viaje. Cobertura global.',
    servicio: 'SEGUROS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-2',
    brandId: 'brand-1',
    nombre: 'Assist Card',
    contacto: 'Juan Rodriguez',
    email: 'ventas@assistcard.com.uy',
    telefono: '+598 2901 5678',
    notas: 'Seguros premium con alta cobertura. Red global de asistencia.',
    servicio: 'SEGUROS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-3',
    brandId: 'brand-1',
    nombre: 'Tarjetas Celeste',
    contacto: 'Ana Fernandez',
    email: 'info@tarjetasceleste.com.uy',
    telefono: '+598 2902 3456',
    notas: 'Opcion economica para seguros basicos.',
    servicio: 'SEGUROS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-1 -- traslados providers
  {
    id: 'proveedor-4',
    brandId: 'brand-1',
    nombre: 'Sevens',
    contacto: 'Carlos Perez',
    email: 'reservas@sevenstransfers.com',
    telefono: '+598 2903 7890',
    notas: 'Traslados regulares y privados en Brasil y Caribe.',
    servicio: 'TRASLADOS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-5',
    brandId: 'brand-1',
    nombre: 'BRT',
    contacto: 'Laura Martinez',
    email: 'operaciones@brt.com.uy',
    telefono: '+598 2904 2345',
    notas: 'Traslados aeroportuarios en multiples destinos.',
    servicio: 'TRASLADOS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-1 -- circuitos provider
  {
    id: 'proveedor-6',
    brandId: 'brand-1',
    nombre: 'Europa Mundo',
    contacto: 'Roberto Silva',
    email: 'agencias@europamundo.com',
    telefono: '+598 2905 6789',
    notas: 'Circuitos guiados por Europa. Partner principal para circuitos.',
    servicio: 'CIRCUITOS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono) -- shared suppliers with different contracts
  {
    id: 'proveedor-7',
    brandId: 'brand-2',
    nombre: 'Universal Assistance',
    contacto: 'Maria Gonzalez',
    email: 'comercial@universalassistance.com',
    telefono: '+598 2900 1234',
    notas: 'Seguros para DestinoIcono. Mismo proveedor, contrato diferente.',
    servicio: 'SEGUROS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-8',
    brandId: 'brand-2',
    nombre: 'Assist Card',
    contacto: 'Juan Rodriguez',
    email: 'ventas@assistcard.com.uy',
    telefono: '+598 2901 5678',
    notas: 'Seguros premium para DestinoIcono.',
    servicio: 'SEGUROS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-9',
    brandId: 'brand-2',
    nombre: 'Sevens',
    contacto: 'Carlos Perez',
    email: 'reservas@sevenstransfers.com',
    telefono: '+598 2903 7890',
    notas: 'Traslados para DestinoIcono.',
    servicio: 'TRASLADOS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'proveedor-10',
    brandId: 'brand-2',
    nombre: 'Europa Mundo',
    contacto: 'Roberto Silva',
    email: 'agencias@europamundo.com',
    telefono: '+598 2905 6789',
    notas: 'Circuitos guiados para DestinoIcono.',
    servicio: 'CIRCUITOS',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];
