// ---------------------------------------------------------------------------
// Circuito, CircuitoDia & PrecioCircuito Seed Data
// Guided tours operated by Europa Mundo from the Uruguayan market.
// ---------------------------------------------------------------------------

import type { Circuito, CircuitoDia, PrecioCircuito } from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// Price periods
const BAJA_DESDE = '2026-03-01';
const BAJA_HASTA = '2026-06-30';
const ALTA_DESDE = '2026-07-01';
const ALTA_HASTA = '2026-12-31';

// ---------------------------------------------------------------------------
// Circuitos -- 2 circuits (1 brand-1, 1 brand-2)
// proveedorId: proveedor-6 (Europa Mundo brand-1), proveedor-10 (Europa Mundo brand-2)
// ---------------------------------------------------------------------------

export const SEED_CIRCUITOS: Circuito[] = [
  {
    id: 'circuito-1',
    brandId: 'brand-1',
    nombre: 'Portugal Magnifico',
    noches: 8,
    proveedorId: 'proveedor-6', // Europa Mundo (brand-1)
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'circuito-2',
    brandId: 'brand-2',
    nombre: 'Turquia Clasica',
    noches: 10,
    proveedorId: 'proveedor-10', // Europa Mundo (brand-2)
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// CircuitoDia -- Day-by-day itinerary in Spanish
// ---------------------------------------------------------------------------

export const SEED_CIRCUITO_DIAS: CircuitoDia[] = [
  // circuito-1: Portugal Magnifico (8 noches = ~9 dias)
  {
    id: 'dia-1',
    circuitoId: 'circuito-1',
    numeroDia: 1,
    titulo: 'Lisboa - Llegada',
    descripcion: 'Llegada al aeropuerto de Lisboa. Traslado al hotel en el centro historico. Resto del dia libre para explorar el barrio de Baixa y la Plaza del Comercio. Cena de bienvenida.',
    orden: 1,
  },
  {
    id: 'dia-2',
    circuitoId: 'circuito-1',
    numeroDia: 2,
    titulo: 'Lisboa - Belem y Alfama',
    descripcion: 'Visita guiada por el barrio de Belem: Torre de Belem, Monasterio de los Jeronimos y degustacion de pasteles de nata. Por la tarde recorrido por Alfama, el barrio mas antiguo de Lisboa, con sus callejuelas y miradores.',
    orden: 2,
  },
  {
    id: 'dia-3',
    circuitoId: 'circuito-1',
    numeroDia: 3,
    titulo: 'Sintra y Cascais',
    descripcion: 'Excursion de dia completo a Sintra: Palacio Nacional de Pena y Quinta da Regaleira. Por la tarde visita a la villa costera de Cascais con tiempo libre para pasear por el puerto.',
    orden: 3,
  },
  {
    id: 'dia-4',
    circuitoId: 'circuito-1',
    numeroDia: 4,
    titulo: 'Obidos y Nazare',
    descripcion: 'Salida hacia Obidos, villa medieval amurallada. Degustacion de ginjinha. Continuacion a Nazare, famosa por sus olas gigantes. Almuerzo con pescado fresco local.',
    orden: 4,
  },
  {
    id: 'dia-5',
    circuitoId: 'circuito-1',
    numeroDia: 5,
    titulo: 'Coimbra y Valle del Duero',
    descripcion: 'Visita a la Universidad de Coimbra, Patrimonio de la Humanidad. Por la tarde llegada al Valle del Duero para una cata de vinos de Oporto en una quinta tradicional.',
    orden: 5,
  },
  {
    id: 'dia-6',
    circuitoId: 'circuito-1',
    numeroDia: 6,
    titulo: 'Porto - Ciudad',
    descripcion: 'Dia completo en Porto: Torre de los Clerigos, Libreria Lello, Ribeira (Patrimonio UNESCO). Crucero por el rio Duero con vistas a las bodegas de Vila Nova de Gaia.',
    orden: 6,
  },
  {
    id: 'dia-7',
    circuitoId: 'circuito-1',
    numeroDia: 7,
    titulo: 'Porto - Braga y Guimaraes',
    descripcion: 'Excursion al norte: Braga con su Santuario del Buen Jesus y Guimaraes, cuna de Portugal. Visita al castillo medieval y centro historico. Cena de despedida en Porto.',
    orden: 7,
  },
  {
    id: 'dia-8',
    circuitoId: 'circuito-1',
    numeroDia: 8,
    titulo: 'Aveiro y Fatima',
    descripcion: 'Visita a Aveiro, la "Venecia portuguesa", con paseo en moliceiro por los canales. Por la tarde visita al Santuario de Fatima, uno de los centros de peregrinacion mas importantes del mundo.',
    orden: 8,
  },
  {
    id: 'dia-9',
    circuitoId: 'circuito-1',
    numeroDia: 9,
    titulo: 'Lisboa - Regreso',
    descripcion: 'Traslado al aeropuerto de Lisboa. Fin del circuito y regreso a Montevideo.',
    orden: 9,
  },

  // circuito-2: Turquia Clasica (10 noches = ~11 dias)
  {
    id: 'dia-10',
    circuitoId: 'circuito-2',
    numeroDia: 1,
    titulo: 'Estambul - Llegada',
    descripcion: 'Llegada al aeropuerto de Estambul. Traslado al hotel en el barrio de Sultanahmet. Tarde libre para un primer contacto con la ciudad. Cena de bienvenida con vista al Bosforo.',
    orden: 1,
  },
  {
    id: 'dia-11',
    circuitoId: 'circuito-2',
    numeroDia: 2,
    titulo: 'Estambul - Ciudad Vieja',
    descripcion: 'Visita a Santa Sofia, la Mezquita Azul, el Hippodromo y la Cisterna Basilica. Por la tarde, recorrido por el Gran Bazar con tiempo libre para compras.',
    orden: 2,
  },
  {
    id: 'dia-12',
    circuitoId: 'circuito-2',
    numeroDia: 3,
    titulo: 'Estambul - Bosforo y Beyoglu',
    descripcion: 'Crucero por el estrecho del Bosforo entre Europa y Asia. Visita al Palacio de Topkapi. Por la tarde paseo por el barrio de Beyoglu y la calle Istiklal.',
    orden: 3,
  },
  {
    id: 'dia-13',
    circuitoId: 'circuito-2',
    numeroDia: 4,
    titulo: 'Ankara',
    descripcion: 'Vuelo interno a Ankara. Visita al Mausoleo de Ataturk (Anitkabir) y al Museo de las Civilizaciones de Anatolia. Noche en Ankara.',
    orden: 4,
  },
  {
    id: 'dia-14',
    circuitoId: 'circuito-2',
    numeroDia: 5,
    titulo: 'Capadocia - Llegada',
    descripcion: 'Traslado a Capadocia via Lago Salado de Tuz Golu. Llegada a Goreme y check-in en hotel cueva. Por la tarde visita a un taller de ceramica local.',
    orden: 5,
  },
  {
    id: 'dia-15',
    circuitoId: 'circuito-2',
    numeroDia: 6,
    titulo: 'Capadocia - Valles y ciudades subterraneas',
    descripcion: 'Opcional: vuelo en globo al amanecer (no incluido). Visita a la ciudad subterranea de Kaymakli, Valle de las Palomas y Museo al Aire Libre de Goreme (Patrimonio UNESCO).',
    orden: 6,
  },
  {
    id: 'dia-16',
    circuitoId: 'circuito-2',
    numeroDia: 7,
    titulo: 'Konya - Pamukkale',
    descripcion: 'Ruta hacia Pamukkale pasando por Konya, ciudad de los derviches girovagos. Visita al Museo de Mevlana. Llegada a Pamukkale por la noche.',
    orden: 7,
  },
  {
    id: 'dia-17',
    circuitoId: 'circuito-2',
    numeroDia: 8,
    titulo: 'Pamukkale y Hierapolis',
    descripcion: 'Visita a las terrazas de travertino blanco de Pamukkale y las ruinas de la antigua Hierapolis (Patrimonio UNESCO). Banho en las piscinas termales. Por la tarde traslado a Kusadasi.',
    orden: 8,
  },
  {
    id: 'dia-18',
    circuitoId: 'circuito-2',
    numeroDia: 9,
    titulo: 'Efeso',
    descripcion: 'Visita a las ruinas de Efeso: Biblioteca de Celso, Gran Teatro, Templo de Adriano. Visita a la Casa de la Virgen Maria en la colina. Por la tarde tiempo libre en Kusadasi.',
    orden: 9,
  },
  {
    id: 'dia-19',
    circuitoId: 'circuito-2',
    numeroDia: 10,
    titulo: 'Estambul - Dia libre',
    descripcion: 'Vuelo de regreso a Estambul. Dia libre para compras en el Bazar de las Especias, visitar el barrio de Kadikoy en el lado asiatico, o relajarse en un hammam tradicional. Cena de despedida.',
    orden: 10,
  },
  {
    id: 'dia-20',
    circuitoId: 'circuito-2',
    numeroDia: 11,
    titulo: 'Estambul - Regreso',
    descripcion: 'Traslado al aeropuerto de Estambul. Fin del circuito y regreso a Montevideo.',
    orden: 11,
  },
];

// ---------------------------------------------------------------------------
// PrecioCircuito -- 2 price periods per circuit (baja / alta)
// ---------------------------------------------------------------------------

export const SEED_PRECIOS_CIRCUITO: PrecioCircuito[] = [
  // circuito-1: Portugal Magnifico (brand-1)
  { id: 'precio-circ-1', circuitoId: 'circuito-1', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precio: 1450 },
  { id: 'precio-circ-2', circuitoId: 'circuito-1', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precio: 1890 },

  // circuito-2: Turquia Clasica (brand-2)
  { id: 'precio-circ-3', circuitoId: 'circuito-2', periodoDesde: BAJA_DESDE, periodoHasta: BAJA_HASTA, precio: 1680 },
  { id: 'precio-circ-4', circuitoId: 'circuito-2', periodoDesde: ALTA_DESDE, periodoHasta: ALTA_HASTA, precio: 2150 },
];
