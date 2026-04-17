// ---------------------------------------------------------------------------
// Alojamiento, PrecioAlojamiento & AlojamientoFoto Seed Data
// Real hotel names from the Uruguayan outbound travel market.
// ---------------------------------------------------------------------------

import type { Alojamiento, PrecioAlojamiento, AlojamientoFoto } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// Price periods
const BAJA_DESDE = '2026-03-01';
const BAJA_HASTA = '2026-06-30';
const ALTA_DESDE = '2026-07-01';
const ALTA_HASTA = '2026-12-31';

// ---------------------------------------------------------------------------
// Alojamientos -- 14 hotels (8 brand-1, 6 brand-2)
// ciudadId/paisId reference catalogos.ts IDs
// ---------------------------------------------------------------------------

export const SEED_ALOJAMIENTOS: Alojamiento[] = [
  // brand-1 (TravelOz)
  {
    id: '001',
    brandId: 'brand-1',
    nombre: 'Casas Brancas Boutique Hotel & Spa',
    ciudadId: 'ciudad-1', // Buzios
    paisId: 'pais-1',     // Brasil
    categoria: 5,
    sitioWeb: 'https://www.casasbrancas.com.br',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '002',
    brandId: 'brand-1',
    nombre: 'Insolia Buzios',
    ciudadId: 'ciudad-1', // Buzios
    paisId: 'pais-1',     // Brasil
    categoria: 4,
    sitioWeb: 'https://www.insoliabuzios.com.br',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '003',
    brandId: 'brand-1',
    nombre: 'Iberostar Cancun',
    ciudadId: 'ciudad-6', // Cancun
    paisId: 'pais-2',     // Mexico
    categoria: 5,
    sitioWeb: 'https://www.iberostar.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '004',
    brandId: 'brand-1',
    nombre: 'Grand Oasis Cancun',
    ciudadId: 'ciudad-6', // Cancun
    paisId: 'pais-2',     // Mexico
    categoria: 4,
    sitioWeb: 'https://www.oasishotels.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '005',
    brandId: 'brand-1',
    nombre: 'Barcelo Bavaro Palace',
    ciudadId: 'ciudad-10', // Punta Cana
    paisId: 'pais-3',      // Republica Dominicana
    categoria: 5,
    sitioWeb: 'https://www.barcelo.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '006',
    brandId: 'brand-1',
    nombre: 'Copacabana Palace',
    ciudadId: 'ciudad-2', // Rio de Janeiro
    paisId: 'pais-1',     // Brasil
    categoria: 5,
    sitioWeb: 'https://www.belmond.com/copacabana-palace',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '007',
    brandId: 'brand-1',
    nombre: 'Fontainebleau Miami Beach',
    ciudadId: 'ciudad-15', // Miami
    paisId: 'pais-5',      // Estados Unidos
    categoria: 5,
    sitioWeb: 'https://www.fontainebleau.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '008',
    brandId: 'brand-1',
    nombre: 'VP Plaza Espana Design',
    ciudadId: 'ciudad-18', // Madrid
    paisId: 'pais-6',      // Espana
    categoria: 5,
    sitioWeb: 'https://www.plazaespanadesign.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  // brand-2 (DestinoIcono)
  {
    id: '009',
    brandId: 'brand-2',
    nombre: 'Hyatt Ziva Cancun',
    ciudadId: 'ciudad-24', // Cancun (brand-2)
    paisId: 'pais-8',      // Mexico (brand-2)
    categoria: 5,
    sitioWeb: 'https://www.hyatt.com/ziva-cancun',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '010',
    brandId: 'brand-2',
    nombre: 'Hard Rock Hotel Punta Cana',
    ciudadId: 'ciudad-26', // Punta Cana (brand-2)
    paisId: 'pais-9',      // Republica Dominicana (brand-2)
    categoria: 5,
    sitioWeb: 'https://www.hardrockhotels.com/punta-cana',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '011',
    brandId: 'brand-2',
    nombre: 'Windsor Atlantica Hotel',
    ciudadId: 'ciudad-21', // Rio de Janeiro (brand-2)
    paisId: 'pais-7',      // Brasil (brand-2)
    categoria: 4,
    sitioWeb: 'https://www.windsorhoteis.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '012',
    brandId: 'brand-2',
    nombre: 'Hilton Miami Downtown',
    ciudadId: 'ciudad-29', // Miami (brand-2)
    paisId: 'pais-11',     // Estados Unidos (brand-2)
    categoria: 4,
    sitioWeb: 'https://www.hilton.com/miami-downtown',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '013',
    brandId: 'brand-2',
    nombre: 'Hotel Catalonia Gran Via',
    ciudadId: 'ciudad-31', // Madrid (brand-2)
    paisId: 'pais-12',     // Espana (brand-2)
    categoria: 4,
    sitioWeb: 'https://www.cataloniahotels.com',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: '014',
    brandId: 'brand-2',
    nombre: 'Insolia Buzios',
    ciudadId: 'ciudad-20', // Buzios (brand-2)
    paisId: 'pais-7',      // Brasil (brand-2)
    categoria: 4,
    sitioWeb: 'https://www.insoliabuzios.com.br',
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// PrecioAlojamiento -- 2+ per hotel with regimen references
// regimenId references catalogos.ts (brand-1: regimen-1..5, brand-2: regimen-6..10)
// ---------------------------------------------------------------------------

export const SEED_PRECIOS_ALOJAMIENTO: PrecioAlojamiento[] = [
  // alojamiento-1: Casas Brancas (Buzios, 5*, brand-1)
  { id: 'precio-aloj-1', alojamientoId: '001', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 180, regimenId: 'regimen-1' },
  { id: 'precio-aloj-2', alojamientoId: '001', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 280, regimenId: 'regimen-1' },

  // alojamiento-2: Insolia Buzios (Buzios, 4*, brand-1)
  { id: 'precio-aloj-3', alojamientoId: '002', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 120, regimenId: 'regimen-1' },
  { id: 'precio-aloj-4', alojamientoId: '002', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 190, regimenId: 'regimen-1' },

  // alojamiento-3: Iberostar Cancun (5*, brand-1)
  { id: 'precio-aloj-5', alojamientoId: '003', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 220, regimenId: 'regimen-2' },
  { id: 'precio-aloj-6', alojamientoId: '003', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 340, regimenId: 'regimen-2' },

  // alojamiento-4: Grand Oasis Cancun (4*, brand-1)
  { id: 'precio-aloj-7', alojamientoId: '004', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 160, regimenId: 'regimen-2' },
  { id: 'precio-aloj-8', alojamientoId: '004', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 250, regimenId: 'regimen-2' },

  // alojamiento-5: Barcelo Bavaro Palace (Punta Cana, 5*, brand-1)
  { id: 'precio-aloj-9', alojamientoId: '005', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 200, regimenId: 'regimen-2' },
  { id: 'precio-aloj-10', alojamientoId: '005', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 310, regimenId: 'regimen-2' },

  // alojamiento-6: Copacabana Palace (Rio, 5*, brand-1)
  { id: 'precio-aloj-11', alojamientoId: '006', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 280, regimenId: 'regimen-1' },
  { id: 'precio-aloj-12', alojamientoId: '006', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 350, regimenId: 'regimen-1' },

  // alojamiento-7: Fontainebleau Miami Beach (5*, brand-1)
  { id: 'precio-aloj-13', alojamientoId: '007', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 250, regimenId: 'regimen-4' },
  { id: 'precio-aloj-14', alojamientoId: '007', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 350, regimenId: 'regimen-4' },

  // alojamiento-8: VP Plaza Espana Design (Madrid, 5*, brand-1)
  { id: 'precio-aloj-15', alojamientoId: '008', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 190, regimenId: 'regimen-1' },
  { id: 'precio-aloj-16', alojamientoId: '008', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 290, regimenId: 'regimen-1' },

  // alojamiento-9: Hyatt Ziva Cancun (5*, brand-2)
  { id: 'precio-aloj-17', alojamientoId: '009', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 240, regimenId: 'regimen-7' },
  { id: 'precio-aloj-18', alojamientoId: '009', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 350, regimenId: 'regimen-7' },

  // alojamiento-10: Hard Rock Punta Cana (5*, brand-2)
  { id: 'precio-aloj-19', alojamientoId: '010', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 210, regimenId: 'regimen-7' },
  { id: 'precio-aloj-20', alojamientoId: '010', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 320, regimenId: 'regimen-7' },

  // alojamiento-11: Windsor Atlantica (Rio, 4*, brand-2)
  { id: 'precio-aloj-21', alojamientoId: '011', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 130, regimenId: 'regimen-6' },
  { id: 'precio-aloj-22', alojamientoId: '011', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 200, regimenId: 'regimen-6' },

  // alojamiento-12: Hilton Miami Downtown (4*, brand-2)
  { id: 'precio-aloj-23', alojamientoId: '012', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 170, regimenId: 'regimen-9' },
  { id: 'precio-aloj-24', alojamientoId: '012', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 260, regimenId: 'regimen-9' },

  // alojamiento-13: Hotel Catalonia Gran Via (Madrid, 4*, brand-2)
  { id: 'precio-aloj-25', alojamientoId: '013', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 110, regimenId: 'regimen-6' },
  { id: 'precio-aloj-26', alojamientoId: '013', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 180, regimenId: 'regimen-6' },

  // alojamiento-14: Insolia Buzios (4*, brand-2)
  { id: 'precio-aloj-27', alojamientoId: '014', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precioPorNoche: 125, regimenId: 'regimen-6' },
  { id: 'precio-aloj-28', alojamientoId: '014', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precioPorNoche: 195, regimenId: 'regimen-6' },
];

// ---------------------------------------------------------------------------
// AlojamientoFoto -- 2+ placeholder photos per hotel
// Using real Unsplash photo IDs for travel-relevant imagery
// ---------------------------------------------------------------------------

export const SEED_ALOJAMIENTO_FOTOS: AlojamientoFoto[] = [
  // alojamiento-1: Casas Brancas (Buzios)
  { id: 'foto-aloj-1', alojamientoId: '001', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop', alt: 'Vista panoramica Casas Brancas Buzios', orden: 1 },
  { id: 'foto-aloj-2', alojamientoId: '001', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop', alt: 'Habitacion superior Casas Brancas', orden: 2 },

  // alojamiento-2: Insolia Buzios
  { id: 'foto-aloj-3', alojamientoId: '002', url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop', alt: 'Piscina Insolia Buzios', orden: 1 },
  { id: 'foto-aloj-4', alojamientoId: '002', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop', alt: 'Fachada hotel Insolia Buzios', orden: 2 },

  // alojamiento-3: Iberostar Cancun
  { id: 'foto-aloj-5', alojamientoId: '003', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop', alt: 'Vista aerea Iberostar Cancun', orden: 1 },
  { id: 'foto-aloj-6', alojamientoId: '003', url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop', alt: 'Playa Iberostar Cancun', orden: 2 },

  // alojamiento-4: Grand Oasis Cancun
  { id: 'foto-aloj-7', alojamientoId: '004', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop', alt: 'Lobby Grand Oasis Cancun', orden: 1 },
  { id: 'foto-aloj-8', alojamientoId: '004', url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop', alt: 'Piscina Grand Oasis Cancun', orden: 2 },

  // alojamiento-5: Barcelo Bavaro Palace
  { id: 'foto-aloj-9', alojamientoId: '005', url: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&h=600&fit=crop', alt: 'Playa Barcelo Bavaro Palace', orden: 1 },
  { id: 'foto-aloj-10', alojamientoId: '005', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop', alt: 'Suite Barcelo Bavaro Palace', orden: 2 },

  // alojamiento-6: Copacabana Palace
  { id: 'foto-aloj-11', alojamientoId: '006', url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop', alt: 'Fachada Copacabana Palace', orden: 1 },
  { id: 'foto-aloj-12', alojamientoId: '006', url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop', alt: 'Piscina Copacabana Palace', orden: 2 },

  // alojamiento-7: Fontainebleau Miami Beach
  { id: 'foto-aloj-13', alojamientoId: '007', url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop', alt: 'Vista Fontainebleau Miami Beach', orden: 1 },
  { id: 'foto-aloj-14', alojamientoId: '007', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop', alt: 'Habitacion Fontainebleau Miami', orden: 2 },

  // alojamiento-8: VP Plaza Espana Design
  { id: 'foto-aloj-15', alojamientoId: '008', url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop', alt: 'Lobby VP Plaza Espana Design Madrid', orden: 1 },
  { id: 'foto-aloj-16', alojamientoId: '008', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop', alt: 'Suite VP Plaza Espana Design', orden: 2 },

  // alojamiento-9: Hyatt Ziva Cancun (brand-2)
  { id: 'foto-aloj-17', alojamientoId: '009', url: 'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=800&h=600&fit=crop', alt: 'Vista aerea Hyatt Ziva Cancun', orden: 1 },
  { id: 'foto-aloj-18', alojamientoId: '009', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&h=600&fit=crop', alt: 'Piscina infinity Hyatt Ziva', orden: 2 },

  // alojamiento-10: Hard Rock Punta Cana (brand-2)
  { id: 'foto-aloj-19', alojamientoId: '010', url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop', alt: 'Entrada Hard Rock Punta Cana', orden: 1 },
  { id: 'foto-aloj-20', alojamientoId: '010', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop', alt: 'Playa Hard Rock Punta Cana', orden: 2 },

  // alojamiento-11: Windsor Atlantica (brand-2)
  { id: 'foto-aloj-21', alojamientoId: '011', url: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&h=600&fit=crop', alt: 'Habitacion Windsor Atlantica Rio', orden: 1 },
  { id: 'foto-aloj-22', alojamientoId: '011', url: 'https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?w=800&h=600&fit=crop', alt: 'Vista playa Windsor Atlantica', orden: 2 },

  // alojamiento-12: Hilton Miami Downtown (brand-2)
  { id: 'foto-aloj-23', alojamientoId: '012', url: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&h=600&fit=crop', alt: 'Fachada Hilton Miami Downtown', orden: 1 },
  { id: 'foto-aloj-24', alojamientoId: '012', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop', alt: 'Suite Hilton Miami Downtown', orden: 2 },

  // alojamiento-13: Hotel Catalonia Gran Via (brand-2)
  { id: 'foto-aloj-25', alojamientoId: '013', url: 'https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=800&h=600&fit=crop', alt: 'Exterior Catalonia Gran Via Madrid', orden: 1 },
  { id: 'foto-aloj-26', alojamientoId: '013', url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=800&h=600&fit=crop', alt: 'Terraza Catalonia Gran Via', orden: 2 },

  // alojamiento-14: Insolia Buzios (brand-2)
  { id: 'foto-aloj-27', alojamientoId: '014', url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop', alt: 'Piscina Insolia Buzios', orden: 1 },
  { id: 'foto-aloj-28', alojamientoId: '014', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop', alt: 'Fachada Insolia Buzios', orden: 2 },
];
