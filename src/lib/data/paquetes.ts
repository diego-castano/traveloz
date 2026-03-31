// ---------------------------------------------------------------------------
// Paquete Seed Data -- Travel packages with service assignments.
// Central entity that references aereos, alojamientos, traslados, seguros,
// circuitos, and catalogs. All prices pre-computed as static values.
// ---------------------------------------------------------------------------

import type {
  Paquete,
  PaqueteAereo,
  PaqueteAlojamiento,
  PaqueteTraslado,
  PaqueteSeguro,
  PaqueteCircuito,
  PaqueteFoto,
  PaqueteEtiqueta,
  OpcionHotelera,
} from '../types';

const SEED_DATE = '2026-01-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// SEED_PAQUETES -- 16 packages (10 brand-1, 6 brand-2)
// Estado mix: 9 ACTIVO, 4 BORRADOR, 3 INACTIVO
// Temporada/TipoPaquete IDs reference catalogos.ts
// ---------------------------------------------------------------------------

export const SEED_PAQUETES: Paquete[] = [
  // ---- brand-1 (TravelOz) ----
  {
    id: 'paquete-1',
    brandId: 'brand-1',
    titulo: 'Buzios Relax',
    destino: 'Buzios',
    descripcion: 'Escapate a las playas paradisiacas de Buzios con 7 noches en un hotel boutique de primera categoria. Disfruta del sol, la arena blanca y la gastronomia brasilena en un entorno unico.',
    textoVisual: 'Relax total en Buzios',
    noches: 7,
    salidas: 'Salidas diarias desde Montevideo',
    temporadaId: 'temporada-1', // Baja 2026
    tipoPaqueteId: 'tipo-1',    // Lunas de miel
    validezDesde: '2026-03-01',
    validezHasta: '2026-12-31',
    estado: 'ACTIVO',
    destacado: true,
    // Pricing: aereo-1 baja 420 + alojamiento-1 baja 180*7=1260 + traslado-1 35*2=70 + seguro-1 8*7=56 = 1806 neto
    netoCalculado: 1806,
    markup: 0.77,
    precioVenta: 2346,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: '2026-03-15T14:30:00.000Z',
    deletedAt: null,
  },
  {
    id: 'paquete-2',
    brandId: 'brand-1',
    titulo: 'Cancun All Inclusive',
    destino: 'Cancun',
    descripcion: 'Vivi la experiencia all inclusive en Cancun con 7 noches en un resort 5 estrellas frente al mar Caribe. Incluye vuelos, traslados y seguro de viaje completo.',
    textoVisual: 'Todo incluido en el Caribe',
    noches: 7,
    salidas: 'Salidas martes y sabados',
    temporadaId: 'temporada-2', // Alta 2026
    tipoPaqueteId: 'tipo-2',    // Salidas grupales
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'ACTIVO',
    destacado: true,
    // Pricing: aereo-2 alta 890 + alojamiento-3 alta 340*7=2380 + traslado-2 25*2=50 + seguro-3 10*7=70 = 3390 neto
    netoCalculado: 3390,
    markup: 0.78,
    precioVenta: 4346,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: '2026-03-14T09:15:00.000Z',
    deletedAt: null,
  },
  {
    id: 'paquete-3',
    brandId: 'brand-1',
    titulo: 'Punta Cana Paradise',
    destino: 'Punta Cana',
    descripcion: 'Descubri el paraiso en Punta Cana con 7 noches all inclusive en el Barcelo Bavaro Palace. Playas de arena blanca, aguas cristalinas y entretenimiento para toda la familia.',
    textoVisual: null,
    noches: 7,
    salidas: 'Salidas semanales',
    temporadaId: 'temporada-1', // Baja 2026
    tipoPaqueteId: 'tipo-2',    // Salidas grupales
    validezDesde: '2026-03-01',
    validezHasta: '2026-03-21',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-3 baja 620 + alojamiento-5 baja 200*7=1400 + traslado-4 30*2=60 + seguro-1 8*7=56 = 2136 neto
    netoCalculado: 2136,
    markup: 0.76,
    precioVenta: 2811,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-4',
    brandId: 'brand-1',
    titulo: 'Miami Shopping',
    destino: 'Miami',
    descripcion: 'Cinco noches en Miami con hotel en South Beach y traslados incluidos. Aprovecha para recorrer los outlets, disfrutar de la gastronomia y la vida nocturna de la Magic City.',
    textoVisual: 'Shopping & Beach en Miami',
    noches: 5,
    salidas: 'Salidas diarias',
    temporadaId: 'temporada-2', // Alta 2026
    tipoPaqueteId: 'tipo-4',    // Eventos
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-4 alta 980 + alojamiento-7 alta 350*5=1750 + traslado-5 40*2=80 + seguro-2 14*5=70 = 2880 neto
    netoCalculado: 2880,
    markup: 0.73,
    precioVenta: 3945,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-5',
    brandId: 'brand-1',
    titulo: 'Portugal Magnifico',
    destino: 'Portugal',
    descripcion: 'Recorre Portugal de punta a punta con este circuito guiado de 8 noches. Desde Lisboa hasta Porto, pasando por Sintra, Coimbra y el Valle del Duero. Incluye vuelos, circuito completo y seguro.',
    textoVisual: 'Circuito completo por Portugal',
    noches: 8,
    salidas: 'Salidas quincenales',
    temporadaId: 'temporada-2', // Alta 2026
    tipoPaqueteId: 'tipo-2',    // Salidas grupales
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'ACTIVO',
    destacado: true,
    // Pricing: aereo-7 alta 1180 + circuito-1 alta 1890 + traslado-6 35*2=70 + seguro-4 18*8=144 = 3284 neto
    netoCalculado: 3284,
    markup: 0.77,
    precioVenta: 4265,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: '2026-03-10T16:45:00.000Z',
    deletedAt: null,
  },
  {
    id: 'paquete-6',
    brandId: 'brand-1',
    titulo: 'Rio + Buzios Clasico',
    destino: 'Rio de Janeiro + Buzios',
    descripcion: 'Combina lo mejor de Rio de Janeiro y Buzios en un paquete multi-destino de 10 noches. Cinco noches en la ciudad maravillosa y cinco en la peninsula mas exclusiva de Brasil.',
    textoVisual: 'Dos destinos, un viaje',
    noches: 10,
    salidas: 'Salidas lunes y viernes',
    temporadaId: 'temporada-1', // Baja 2026
    tipoPaqueteId: 'tipo-1',    // Lunas de miel
    validezDesde: '2026-03-01',
    validezHasta: '2026-03-22',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-1 baja 420 + alojamiento-6 baja 280*5=1400 + alojamiento-1 baja 180*5=900 + traslado-1 35*2=70 + seguro-2 14*10=140 = 2930 neto
    netoCalculado: 2930,
    markup: 0.75,
    precioVenta: 3907,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-7',
    brandId: 'brand-1',
    titulo: 'Escapada Buenos Aires',
    destino: 'Buenos Aires',
    descripcion: 'Cuatro noches en la capital del tango. Recorre San Telmo, La Boca, Recoleta y Puerto Madero. Gastronomia de primer nivel y espectaculos de tango incluidos.',
    textoVisual: null,
    noches: 4,
    salidas: 'Salidas diarias',
    temporadaId: 'temporada-1', // Baja 2026
    tipoPaqueteId: 'tipo-4',    // Eventos
    validezDesde: '2026-03-01',
    validezHasta: '2026-06-30',
    estado: 'BORRADOR',
    destacado: false,
    // Pricing: uses brand-2 aereo-9 EZE route as reference proxy, approx neto
    // aereo ~180 + alojamiento est ~100*4=400 + seguro ~8*4=32 = 612 neto
    netoCalculado: 612,
    markup: 0.71,
    precioVenta: 862,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-8',
    brandId: 'brand-1',
    titulo: 'Orlando Magic',
    destino: 'Orlando',
    descripcion: 'Siete noches en Orlando con acceso a los mejores parques tematicos del mundo. Disney, Universal y SeaWorld te esperan. Incluye vuelos, hotel y seguro de viaje.',
    textoVisual: 'Parques y diversion en familia',
    noches: 7,
    salidas: 'Salidas en julio',
    temporadaId: 'temporada-4', // Vacaciones Julio 2026
    tipoPaqueteId: 'tipo-4',    // Eventos
    validezDesde: '2026-07-01',
    validezHasta: '2026-07-31',
    estado: 'ACTIVO',
    destacado: true,
    // Pricing: aereo-4 vacaciones 1050 + alojamiento-7 alta 350*7=2450 + traslado-5 40*2=80 + seguro-3 10*7=70 = 3650 neto
    netoCalculado: 3650,
    markup: 0.78,
    precioVenta: 4679,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: '2026-03-13T11:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 'paquete-9',
    brandId: 'brand-1',
    titulo: 'Salvador de Bahia Tropical',
    destino: 'Salvador de Bahia',
    descripcion: 'Siete noches en Salvador de Bahia, cuna del axe y la cultura afrobrasilena. Playas tropicales, Pelourinho historico y la mejor gastronomia bahiana.',
    textoVisual: null,
    noches: 7,
    salidas: 'Salidas semanales',
    temporadaId: 'temporada-1', // Baja 2026
    tipoPaqueteId: 'tipo-2',    // Salidas grupales
    validezDesde: '2026-03-01',
    validezHasta: '2026-06-30',
    estado: 'BORRADOR',
    destacado: false,
    // Pricing: aereo-6 baja 480 + alojamiento est ~130*7=910 + traslado est ~35*2=70 + seguro-5 7*7=49 = 1509 neto
    netoCalculado: 1509,
    markup: 0.74,
    precioVenta: 2039,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-10',
    brandId: 'brand-1',
    titulo: 'Madrid Cultural',
    destino: 'Madrid',
    descripcion: 'Seis noches en la capital espanola. Visita el Museo del Prado, el Palacio Real, el Parque del Retiro y disfruta de las tapas en los bares del centro historico.',
    textoVisual: 'Arte, cultura y tapas',
    noches: 6,
    salidas: 'Salidas semanales',
    temporadaId: 'temporada-2', // Alta 2026
    tipoPaqueteId: 'tipo-2',    // Salidas grupales
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'INACTIVO',
    destacado: false,
    // Pricing: aereo-7 alta 1180 + alojamiento-8 alta 290*6=1740 + traslado-6 35*2=70 + seguro-1 8*6=48 = 3038 neto
    netoCalculado: 3038,
    markup: 0.77,
    precioVenta: 3946,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },

  // ---- brand-2 (DestinoIcono) ----
  {
    id: 'paquete-11',
    brandId: 'brand-2',
    titulo: 'Caribe Sonado',
    destino: 'Cancun',
    descripcion: 'Siete noches en Cancun en el espectacular Hyatt Ziva con regimen all inclusive. Playas de ensueno, snorkel en arrecifes de coral y excursiones a Chichen Itza.',
    textoVisual: 'El Caribe que sonaste',
    noches: 7,
    salidas: 'Salidas miercoles y domingos',
    temporadaId: 'temporada-6', // Alta 2026 (brand-2)
    tipoPaqueteId: 'tipo-7',    // Salidas grupales (brand-2)
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-11 alta 920 + alojamiento-9 alta 350*7=2450 + traslado-8 25*2=50 + seguro-7 8*7=56 = 3476 neto
    netoCalculado: 3476,
    markup: 0.77,
    precioVenta: 4514,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-12',
    brandId: 'brand-2',
    titulo: 'Punta Cana Deluxe',
    destino: 'Punta Cana',
    descripcion: 'Siete noches en el Hard Rock Hotel Punta Cana con todo incluido. Piscinas, spa, entretenimiento en vivo y playas paradisiacas en la Republica Dominicana.',
    textoVisual: null,
    noches: 7,
    salidas: 'Salidas semanales',
    temporadaId: 'temporada-5', // Baja 2026 (brand-2)
    tipoPaqueteId: 'tipo-6',    // Lunas de miel (brand-2)
    validezDesde: '2026-03-01',
    validezHasta: '2026-06-30',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-12 baja 640 + alojamiento-10 baja 210*7=1470 + traslado est ~30*2=60 + seguro-8 10*7=70 = 2240 neto
    netoCalculado: 2240,
    markup: 0.76,
    precioVenta: 2947,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-13',
    brandId: 'brand-2',
    titulo: 'Brasil Express',
    destino: 'Rio de Janeiro',
    descripcion: 'Cinco noches en Rio de Janeiro para quienes quieren conocer la ciudad maravillosa en poco tiempo. Cristo Redentor, Pan de Azucar, Copacabana e Ipanema.',
    textoVisual: 'Rio en 5 dias',
    noches: 5,
    salidas: 'Salidas diarias',
    temporadaId: 'temporada-5', // Baja 2026 (brand-2)
    tipoPaqueteId: 'tipo-7',    // Salidas grupales (brand-2)
    validezDesde: '2026-03-01',
    validezHasta: '2026-06-30',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo-8 baja 440 + alojamiento-11 baja 130*5=650 + traslado-7 35*2=70 + seguro-7 8*5=40 = 1200 neto
    netoCalculado: 1200,
    markup: 0.74,
    precioVenta: 1622,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-14',
    brandId: 'brand-2',
    titulo: 'Turquia Magica',
    destino: 'Turquia',
    descripcion: 'Diez noches recorriendo Turquia desde Estambul hasta Capadocia. Circuito guiado completo con vuelos, traslados, hoteles cueva en Goreme y visitas a Efeso y Pamukkale.',
    textoVisual: 'Oriente y Occidente en un viaje',
    noches: 10,
    salidas: 'Salidas quincenales',
    temporadaId: 'temporada-6', // Alta 2026 (brand-2)
    tipoPaqueteId: 'tipo-7',    // Salidas grupales (brand-2)
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'BORRADOR',
    destacado: false,
    // Pricing: aereo est ~1100 + circuito-2 alta 2150 + seguro-8 10*10=100 = 3350 neto
    netoCalculado: 3350,
    markup: 0.77,
    precioVenta: 4351,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-15',
    brandId: 'brand-2',
    titulo: 'Florianopolis Sol',
    destino: 'Florianopolis',
    descripcion: 'Siete noches en Florianopolis, la isla de la magia. Playas de aguas cristalinas, dunas de Joaquina, laguna de la Conceicao y la mejor vida nocturna del sur de Brasil.',
    textoVisual: null,
    noches: 7,
    salidas: 'Salidas diarias',
    temporadaId: 'temporada-5', // Baja 2026 (brand-2)
    tipoPaqueteId: 'tipo-6',    // Lunas de miel (brand-2)
    validezDesde: '2026-03-01',
    validezHasta: '2026-06-30',
    estado: 'ACTIVO',
    destacado: false,
    // Pricing: aereo est ~380 + alojamiento est ~125*7=875 + traslado est ~35*2=70 + seguro-7 8*7=56 = 1381 neto
    netoCalculado: 1381,
    markup: 0.75,
    precioVenta: 1841,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
  {
    id: 'paquete-16',
    brandId: 'brand-2',
    titulo: 'Costa Rica Aventura',
    destino: 'Costa Rica',
    descripcion: 'Ocho noches de aventura en Costa Rica. Volcanes, selvas tropicales, rafting, tirolesas y playas del Pacifico. Un destino para los amantes de la naturaleza y la adrenalina.',
    textoVisual: 'Aventura pura en Centroamerica',
    noches: 8,
    salidas: 'Salidas mensuales',
    temporadaId: 'temporada-6', // Alta 2026 (brand-2)
    tipoPaqueteId: 'tipo-8',    // Eventos (brand-2)
    validezDesde: '2026-07-01',
    validezHasta: '2026-12-31',
    estado: 'INACTIVO',
    destacado: false,
    // Pricing: aereo est ~900 + alojamiento est ~120*8=960 + traslado est ~30*2=60 + seguro-8 10*8=80 = 2000 neto
    netoCalculado: 2000,
    markup: 0.73,
    precioVenta: 2740,
    moneda: 'USD',
    ordenServicios: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_AEREOS -- Flight assignments (1 per paquete)
// aereoId references aereos.ts IDs
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_AEREOS: PaqueteAereo[] = [
  // brand-1
  { id: 'pa-1',  paqueteId: 'paquete-1',  aereoId: 'aereo-1',  textoDisplay: null, orden: 1 }, // MVD-GIG Azul (Buzios via Rio)
  { id: 'pa-2',  paqueteId: 'paquete-2',  aereoId: 'aereo-2',  textoDisplay: null, orden: 1 }, // MVD-CUN Copa (Cancun)
  { id: 'pa-3',  paqueteId: 'paquete-3',  aereoId: 'aereo-3',  textoDisplay: null, orden: 1 }, // MVD-PUJ ARSA (Punta Cana)
  { id: 'pa-4',  paqueteId: 'paquete-4',  aereoId: 'aereo-4',  textoDisplay: null, orden: 1 }, // MVD-MIA AA (Miami)
  { id: 'pa-5',  paqueteId: 'paquete-5',  aereoId: 'aereo-7',  textoDisplay: null, orden: 1 }, // MVD-MAD Iberia (Portugal via Madrid)
  { id: 'pa-6',  paqueteId: 'paquete-6',  aereoId: 'aereo-1',  textoDisplay: null, orden: 1 }, // MVD-GIG Azul (Rio+Buzios)
  { id: 'pa-7',  paqueteId: 'paquete-7',  aereoId: 'aereo-9',  textoDisplay: null, orden: 1 }, // MVD-EZE ARSA (Buenos Aires) -- brand-2 aereo used as proxy
  { id: 'pa-8',  paqueteId: 'paquete-8',  aereoId: 'aereo-4',  textoDisplay: null, orden: 1 }, // MVD-MIA AA (Orlando via Miami)
  { id: 'pa-9',  paqueteId: 'paquete-9',  aereoId: 'aereo-6',  textoDisplay: null, orden: 1 }, // MVD-SSA LATAM (Salvador)
  { id: 'pa-10', paqueteId: 'paquete-10', aereoId: 'aereo-7',  textoDisplay: null, orden: 1 }, // MVD-MAD Iberia (Madrid)
  // brand-2
  { id: 'pa-11', paqueteId: 'paquete-11', aereoId: 'aereo-11', textoDisplay: null, orden: 1 }, // MVD-CUN Copa (Cancun b2)
  { id: 'pa-12', paqueteId: 'paquete-12', aereoId: 'aereo-12', textoDisplay: null, orden: 1 }, // MVD-PUJ LATAM (Punta Cana b2)
  { id: 'pa-13', paqueteId: 'paquete-13', aereoId: 'aereo-8',  textoDisplay: null, orden: 1 }, // MVD-GIG LATAM (Rio b2)
  { id: 'pa-14', paqueteId: 'paquete-14', aereoId: 'aereo-11', textoDisplay: null, orden: 1 }, // MVD-CUN Copa (Turquia via connection)
  { id: 'pa-15', paqueteId: 'paquete-15', aereoId: 'aereo-8',  textoDisplay: null, orden: 1 }, // MVD-GIG LATAM (Floripa via connection)
  { id: 'pa-16', paqueteId: 'paquete-16', aereoId: 'aereo-11', textoDisplay: null, orden: 1 }, // MVD-CUN Copa (Costa Rica via connection)
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_ALOJAMIENTOS -- Hotel assignments (1-2 per paquete)
// alojamientoId references alojamientos.ts IDs
// paquete-6 "Rio+Buzios" has 2 hotels with nochesEnEste split
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_ALOJAMIENTOS: PaqueteAlojamiento[] = [
  // brand-1
  { id: 'paloj-1',  paqueteId: 'paquete-1',  alojamientoId: 'alojamiento-1',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Casas Brancas (Buzios)
  { id: 'paloj-2',  paqueteId: 'paquete-2',  alojamientoId: 'alojamiento-3',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Iberostar (Cancun)
  { id: 'paloj-3',  paqueteId: 'paquete-3',  alojamientoId: 'alojamiento-5',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Barcelo Bavaro (Punta Cana)
  { id: 'paloj-4',  paqueteId: 'paquete-4',  alojamientoId: 'alojamiento-7',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Fontainebleau (Miami)
  { id: 'paloj-5',  paqueteId: 'paquete-5',  alojamientoId: 'alojamiento-8',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // VP Plaza Espana (Madrid) -- circuito includes lodging, hotel for Madrid nights
  // paquete-6: multi-destino with 2 hotels
  { id: 'paloj-6',  paqueteId: 'paquete-6',  alojamientoId: 'alojamiento-6',  nochesEnEste: 5,    textoDisplay: 'Rio de Janeiro - 5 noches', orden: 1 }, // Copacabana Palace (Rio)
  { id: 'paloj-7',  paqueteId: 'paquete-6',  alojamientoId: 'alojamiento-1',  nochesEnEste: 5,    textoDisplay: 'Buzios - 5 noches',          orden: 2 }, // Casas Brancas (Buzios)
  { id: 'paloj-8',  paqueteId: 'paquete-8',  alojamientoId: 'alojamiento-7',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Fontainebleau (Orlando uses Miami hotel as reference)
  { id: 'paloj-9',  paqueteId: 'paquete-9',  alojamientoId: 'alojamiento-2',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Insolia Buzios (Salvador -- placeholder hotel)
  { id: 'paloj-10', paqueteId: 'paquete-10', alojamientoId: 'alojamiento-8',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // VP Plaza Espana (Madrid)
  // brand-2
  { id: 'paloj-11', paqueteId: 'paquete-11', alojamientoId: 'alojamiento-9',  nochesEnEste: null, textoDisplay: null, orden: 1 }, // Hyatt Ziva (Cancun b2)
  { id: 'paloj-12', paqueteId: 'paquete-12', alojamientoId: 'alojamiento-10', nochesEnEste: null, textoDisplay: null, orden: 1 }, // Hard Rock (Punta Cana b2)
  { id: 'paloj-13', paqueteId: 'paquete-13', alojamientoId: 'alojamiento-11', nochesEnEste: null, textoDisplay: null, orden: 1 }, // Windsor Atlantica (Rio b2)
  { id: 'paloj-14', paqueteId: 'paquete-14', alojamientoId: 'alojamiento-13', nochesEnEste: null, textoDisplay: null, orden: 1 }, // Catalonia Gran Via (Madrid b2 -- Turquia via Madrid)
  { id: 'paloj-15', paqueteId: 'paquete-15', alojamientoId: 'alojamiento-14', nochesEnEste: null, textoDisplay: null, orden: 1 }, // Insolia Buzios (Floripa placeholder)
  { id: 'paloj-16', paqueteId: 'paquete-16', alojamientoId: 'alojamiento-12', nochesEnEste: null, textoDisplay: null, orden: 1 }, // Hilton Miami (Costa Rica placeholder)
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_TRASLADOS -- Transfer assignments (1-2 per paquete)
// trasladoId references traslados.ts IDs
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_TRASLADOS: PaqueteTraslado[] = [
  // brand-1
  { id: 'ptras-1',  paqueteId: 'paquete-1',  trasladoId: 'traslado-1',  textoDisplay: null, orden: 1 }, // Galeao-Zona Sur (Rio/Buzios)
  { id: 'ptras-2',  paqueteId: 'paquete-2',  trasladoId: 'traslado-2',  textoDisplay: null, orden: 1 }, // Cancun apto-zona hotelera
  { id: 'ptras-3',  paqueteId: 'paquete-3',  trasladoId: 'traslado-4',  textoDisplay: null, orden: 1 }, // Punta Cana apto-hotel
  { id: 'ptras-4',  paqueteId: 'paquete-4',  trasladoId: 'traslado-5',  textoDisplay: null, orden: 1 }, // Miami apto-South Beach
  { id: 'ptras-5',  paqueteId: 'paquete-5',  trasladoId: 'traslado-6',  textoDisplay: null, orden: 1 }, // Barajas-Centro Madrid
  { id: 'ptras-6',  paqueteId: 'paquete-6',  trasladoId: 'traslado-1',  textoDisplay: null, orden: 1 }, // Galeao-Zona Sur (Rio+Buzios)
  { id: 'ptras-7',  paqueteId: 'paquete-8',  trasladoId: 'traslado-5',  textoDisplay: null, orden: 1 }, // Miami apto (Orlando via Miami)
  { id: 'ptras-8',  paqueteId: 'paquete-9',  trasladoId: 'traslado-1',  textoDisplay: null, orden: 1 }, // Galeao proxy for Salvador
  { id: 'ptras-9',  paqueteId: 'paquete-10', trasladoId: 'traslado-6',  textoDisplay: null, orden: 1 }, // Barajas-Centro Madrid
  // brand-2
  { id: 'ptras-10', paqueteId: 'paquete-11', trasladoId: 'traslado-8',  textoDisplay: null, orden: 1 }, // Cancun apto-zona hotelera b2
  { id: 'ptras-11', paqueteId: 'paquete-13', trasladoId: 'traslado-7',  textoDisplay: null, orden: 1 }, // Galeao-Zona Sur b2 (Rio)
  { id: 'ptras-12', paqueteId: 'paquete-14', trasladoId: 'traslado-9',  textoDisplay: null, orden: 1 }, // Barajas-Centro Madrid b2 (Turquia via Madrid)
  { id: 'ptras-13', paqueteId: 'paquete-15', trasladoId: 'traslado-7',  textoDisplay: null, orden: 1 }, // Galeao proxy b2 (Floripa)
  { id: 'ptras-14', paqueteId: 'paquete-16', trasladoId: 'traslado-10', textoDisplay: null, orden: 1 }, // Ezeiza proxy (Costa Rica)
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_SEGUROS -- Insurance assignments (1 per paquete)
// seguroId references seguros.ts IDs
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_SEGUROS: PaqueteSeguro[] = [
  // brand-1
  { id: 'pseg-1',  paqueteId: 'paquete-1',  seguroId: 'seguro-1',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // Plan Basico
  { id: 'pseg-2',  paqueteId: 'paquete-2',  seguroId: 'seguro-3',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // AC 60
  { id: 'pseg-3',  paqueteId: 'paquete-3',  seguroId: 'seguro-1',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // Plan Basico
  { id: 'pseg-4',  paqueteId: 'paquete-4',  seguroId: 'seguro-2',  diasCobertura: 5,   textoDisplay: null, orden: 1 }, // Plan Premium
  { id: 'pseg-5',  paqueteId: 'paquete-5',  seguroId: 'seguro-4',  diasCobertura: 8,   textoDisplay: null, orden: 1 }, // AC 150
  { id: 'pseg-6',  paqueteId: 'paquete-6',  seguroId: 'seguro-2',  diasCobertura: 10,  textoDisplay: null, orden: 1 }, // Plan Premium
  { id: 'pseg-7',  paqueteId: 'paquete-7',  seguroId: 'seguro-5',  diasCobertura: 4,   textoDisplay: null, orden: 1 }, // Plan Celeste
  { id: 'pseg-8',  paqueteId: 'paquete-8',  seguroId: 'seguro-3',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // AC 60
  { id: 'pseg-9',  paqueteId: 'paquete-9',  seguroId: 'seguro-5',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // Plan Celeste
  { id: 'pseg-10', paqueteId: 'paquete-10', seguroId: 'seguro-1',  diasCobertura: 6,   textoDisplay: null, orden: 1 }, // Plan Basico
  // brand-2
  { id: 'pseg-11', paqueteId: 'paquete-11', seguroId: 'seguro-7',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // Plan Basico b2
  { id: 'pseg-12', paqueteId: 'paquete-12', seguroId: 'seguro-8',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // AC 60 b2
  { id: 'pseg-13', paqueteId: 'paquete-13', seguroId: 'seguro-7',  diasCobertura: 5,   textoDisplay: null, orden: 1 }, // Plan Basico b2
  { id: 'pseg-14', paqueteId: 'paquete-14', seguroId: 'seguro-8',  diasCobertura: 10,  textoDisplay: null, orden: 1 }, // AC 60 b2
  { id: 'pseg-15', paqueteId: 'paquete-15', seguroId: 'seguro-7',  diasCobertura: 7,   textoDisplay: null, orden: 1 }, // Plan Basico b2
  { id: 'pseg-16', paqueteId: 'paquete-16', seguroId: 'seguro-8',  diasCobertura: 8,   textoDisplay: null, orden: 1 }, // AC 60 b2
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_CIRCUITOS -- Circuit assignments (only paquete-5 and paquete-14)
// circuitoId references circuitos.ts IDs
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_CIRCUITOS: PaqueteCircuito[] = [
  { id: 'pcirc-1', paqueteId: 'paquete-5',  circuitoId: 'circuito-1', textoDisplay: null, orden: 1 }, // Portugal Magnifico (brand-1)
  { id: 'pcirc-2', paqueteId: 'paquete-14', circuitoId: 'circuito-2', textoDisplay: null, orden: 1 }, // Turquia Clasica (brand-2)
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_FOTOS -- 2-3 placeholder photos per paquete
// Real Unsplash photo IDs for travel-relevant imagery
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_FOTOS: PaqueteFoto[] = [
  // paquete-1: Buzios Relax
  { id: 'fpaq-1',  paqueteId: 'paquete-1',  url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', alt: 'Playa paradisiaca de Buzios', orden: 1 },
  { id: 'fpaq-2',  paqueteId: 'paquete-1',  url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop', alt: 'Atardecer en Buzios', orden: 2 },
  { id: 'fpaq-3',  paqueteId: 'paquete-1',  url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop', alt: 'Barcos en la costa de Buzios', orden: 3 },

  // paquete-2: Cancun All Inclusive
  { id: 'fpaq-4',  paqueteId: 'paquete-2',  url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&h=600&fit=crop', alt: 'Playa de Cancun agua turquesa', orden: 1 },
  { id: 'fpaq-5',  paqueteId: 'paquete-2',  url: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&h=600&fit=crop', alt: 'Resort all inclusive Cancun', orden: 2 },

  // paquete-3: Punta Cana Paradise
  { id: 'fpaq-6',  paqueteId: 'paquete-3',  url: 'https://images.unsplash.com/photo-1580237541049-2d715a09486e?w=800&h=600&fit=crop', alt: 'Palmeras en Punta Cana', orden: 1 },
  { id: 'fpaq-7',  paqueteId: 'paquete-3',  url: 'https://images.unsplash.com/photo-1584132905271-512c958d674a?w=800&h=600&fit=crop', alt: 'Playa arena blanca Punta Cana', orden: 2 },

  // paquete-4: Miami Shopping
  { id: 'fpaq-8',  paqueteId: 'paquete-4',  url: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=600&fit=crop', alt: 'Skyline de Miami Beach', orden: 1 },
  { id: 'fpaq-9',  paqueteId: 'paquete-4',  url: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800&h=600&fit=crop', alt: 'Ocean Drive Miami noche', orden: 2 },

  // paquete-5: Portugal Magnifico
  { id: 'fpaq-10', paqueteId: 'paquete-5',  url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop', alt: 'Torre de Belem Lisboa', orden: 1 },
  { id: 'fpaq-11', paqueteId: 'paquete-5',  url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop', alt: 'Porto Ribeira y rio Duero', orden: 2 },
  { id: 'fpaq-12', paqueteId: 'paquete-5',  url: 'https://images.unsplash.com/photo-1548707309-dcebeab426c8?w=800&h=600&fit=crop', alt: 'Sintra Palacio de Pena', orden: 3 },

  // paquete-6: Rio + Buzios Clasico
  { id: 'fpaq-13', paqueteId: 'paquete-6',  url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop', alt: 'Cristo Redentor Rio de Janeiro', orden: 1 },
  { id: 'fpaq-14', paqueteId: 'paquete-6',  url: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=800&h=600&fit=crop', alt: 'Playa de Copacabana', orden: 2 },
  { id: 'fpaq-15', paqueteId: 'paquete-6',  url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', alt: 'Costa de Buzios', orden: 3 },

  // paquete-7: Escapada Buenos Aires
  { id: 'fpaq-16', paqueteId: 'paquete-7',  url: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&h=600&fit=crop', alt: 'Obelisco Buenos Aires', orden: 1 },
  { id: 'fpaq-17', paqueteId: 'paquete-7',  url: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=800&h=600&fit=crop', alt: 'Caminito La Boca Buenos Aires', orden: 2 },

  // paquete-8: Orlando Magic
  { id: 'fpaq-18', paqueteId: 'paquete-8',  url: 'https://images.unsplash.com/photo-1575796026498-e46e2db7b378?w=800&h=600&fit=crop', alt: 'Castillo Disney Orlando', orden: 1 },
  { id: 'fpaq-19', paqueteId: 'paquete-8',  url: 'https://images.unsplash.com/photo-1536086845989-0b62e6a0e440?w=800&h=600&fit=crop', alt: 'Parques tematicos Orlando', orden: 2 },
  { id: 'fpaq-20', paqueteId: 'paquete-8',  url: 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800&h=600&fit=crop', alt: 'Orlando skyline atardecer', orden: 3 },

  // paquete-9: Salvador de Bahia Tropical
  { id: 'fpaq-21', paqueteId: 'paquete-9',  url: 'https://images.unsplash.com/photo-1551264823-cf5a8ca2a8db?w=800&h=600&fit=crop', alt: 'Pelourinho Salvador de Bahia', orden: 1 },
  { id: 'fpaq-22', paqueteId: 'paquete-9',  url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&h=600&fit=crop', alt: 'Playa tropical Salvador', orden: 2 },

  // paquete-10: Madrid Cultural
  { id: 'fpaq-23', paqueteId: 'paquete-10', url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop', alt: 'Gran Via Madrid', orden: 1 },
  { id: 'fpaq-24', paqueteId: 'paquete-10', url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&h=600&fit=crop', alt: 'Palacio Real de Madrid', orden: 2 },

  // paquete-11: Caribe Sonado
  { id: 'fpaq-25', paqueteId: 'paquete-11', url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&h=600&fit=crop', alt: 'Mar Caribe Cancun', orden: 1 },
  { id: 'fpaq-26', paqueteId: 'paquete-11', url: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&h=600&fit=crop', alt: 'Resort frente al mar Caribe', orden: 2 },

  // paquete-12: Punta Cana Deluxe
  { id: 'fpaq-27', paqueteId: 'paquete-12', url: 'https://images.unsplash.com/photo-1580237541049-2d715a09486e?w=800&h=600&fit=crop', alt: 'Punta Cana palmeras y playa', orden: 1 },
  { id: 'fpaq-28', paqueteId: 'paquete-12', url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop', alt: 'Hard Rock Punta Cana resort', orden: 2 },

  // paquete-13: Brasil Express
  { id: 'fpaq-29', paqueteId: 'paquete-13', url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop', alt: 'Pan de Azucar Rio de Janeiro', orden: 1 },
  { id: 'fpaq-30', paqueteId: 'paquete-13', url: 'https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=800&h=600&fit=crop', alt: 'Playa de Ipanema Rio', orden: 2 },

  // paquete-14: Turquia Magica
  { id: 'fpaq-31', paqueteId: 'paquete-14', url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop', alt: 'Globos en Capadocia', orden: 1 },
  { id: 'fpaq-32', paqueteId: 'paquete-14', url: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&h=600&fit=crop', alt: 'Santa Sofia Estambul', orden: 2 },
  { id: 'fpaq-33', paqueteId: 'paquete-14', url: 'https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=800&h=600&fit=crop', alt: 'Pamukkale travertinos', orden: 3 },

  // paquete-15: Florianopolis Sol
  { id: 'fpaq-34', paqueteId: 'paquete-15', url: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=600&fit=crop', alt: 'Playa de Florianopolis', orden: 1 },
  { id: 'fpaq-35', paqueteId: 'paquete-15', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop', alt: 'Costa de Florianopolis', orden: 2 },

  // paquete-16: Costa Rica Aventura
  { id: 'fpaq-36', paqueteId: 'paquete-16', url: 'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=800&h=600&fit=crop', alt: 'Selva tropical Costa Rica', orden: 1 },
  { id: 'fpaq-37', paqueteId: 'paquete-16', url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=600&fit=crop', alt: 'Volcan Arenal Costa Rica', orden: 2 },
  { id: 'fpaq-38', paqueteId: 'paquete-16', url: 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&h=600&fit=crop', alt: 'Playa del Pacifico Costa Rica', orden: 3 },
];

// ---------------------------------------------------------------------------
// SEED_PAQUETE_ETIQUETAS -- Tag assignments (1-3 per paquete)
// etiquetaId references catalogos.ts IDs
// brand-1 etiquetas: etiqueta-1..8, brand-2: etiqueta-9..13
// ---------------------------------------------------------------------------

export const SEED_PAQUETE_ETIQUETAS: PaqueteEtiqueta[] = [
  // paquete-1: Buzios Relax (Brasil, Lunas de Miel)
  { id: 'petiq-1',  paqueteId: 'paquete-1',  etiquetaId: 'etiqueta-1' },  // Brasil
  { id: 'petiq-2',  paqueteId: 'paquete-1',  etiquetaId: 'etiqueta-6' },  // Lunas de Miel

  // paquete-2: Cancun All Inclusive (Caribe, Black Week promo)
  { id: 'petiq-3',  paqueteId: 'paquete-2',  etiquetaId: 'etiqueta-2' },  // Caribe
  { id: 'petiq-4',  paqueteId: 'paquete-2',  etiquetaId: 'etiqueta-4' },  // Black Week

  // paquete-3: Punta Cana Paradise (Caribe)
  { id: 'petiq-5',  paqueteId: 'paquete-3',  etiquetaId: 'etiqueta-2' },  // Caribe

  // paquete-4: Miami Shopping (Escapadas)
  { id: 'petiq-6',  paqueteId: 'paquete-4',  etiquetaId: 'etiqueta-8' },  // Escapadas

  // paquete-5: Portugal Magnifico (Europa)
  { id: 'petiq-7',  paqueteId: 'paquete-5',  etiquetaId: 'etiqueta-3' },  // Europa

  // paquete-6: Rio + Buzios Clasico (Brasil, Lunas de Miel)
  { id: 'petiq-8',  paqueteId: 'paquete-6',  etiquetaId: 'etiqueta-1' },  // Brasil
  { id: 'petiq-9',  paqueteId: 'paquete-6',  etiquetaId: 'etiqueta-6' },  // Lunas de Miel
  { id: 'petiq-10', paqueteId: 'paquete-6',  etiquetaId: 'etiqueta-5' },  // Promo Nordeste

  // paquete-7: Escapada Buenos Aires (Escapadas)
  { id: 'petiq-11', paqueteId: 'paquete-7',  etiquetaId: 'etiqueta-8' },  // Escapadas

  // paquete-8: Orlando Magic (Vacaciones Julio)
  { id: 'petiq-12', paqueteId: 'paquete-8',  etiquetaId: 'etiqueta-7' },  // Vacaciones Julio

  // paquete-9: Salvador de Bahia Tropical (Brasil, Promo Nordeste)
  { id: 'petiq-13', paqueteId: 'paquete-9',  etiquetaId: 'etiqueta-1' },  // Brasil
  { id: 'petiq-14', paqueteId: 'paquete-9',  etiquetaId: 'etiqueta-5' },  // Promo Nordeste

  // paquete-10: Madrid Cultural (Europa)
  { id: 'petiq-15', paqueteId: 'paquete-10', etiquetaId: 'etiqueta-3' },  // Europa

  // paquete-11: Caribe Sonado (Caribe b2)
  { id: 'petiq-16', paqueteId: 'paquete-11', etiquetaId: 'etiqueta-10' }, // Caribe (brand-2)

  // paquete-12: Punta Cana Deluxe (Caribe b2, Lunas de Miel b2)
  { id: 'petiq-17', paqueteId: 'paquete-12', etiquetaId: 'etiqueta-10' }, // Caribe (brand-2)
  { id: 'petiq-18', paqueteId: 'paquete-12', etiquetaId: 'etiqueta-13' }, // Lunas de Miel (brand-2)

  // paquete-13: Brasil Express (Brasil b2)
  { id: 'petiq-19', paqueteId: 'paquete-13', etiquetaId: 'etiqueta-9' },  // Brasil (brand-2)

  // paquete-14: Turquia Magica (Europa b2)
  { id: 'petiq-20', paqueteId: 'paquete-14', etiquetaId: 'etiqueta-11' }, // Europa (brand-2)

  // paquete-15: Florianopolis Sol (Brasil b2, Escapadas b2)
  { id: 'petiq-21', paqueteId: 'paquete-15', etiquetaId: 'etiqueta-9' },  // Brasil (brand-2)
  { id: 'petiq-22', paqueteId: 'paquete-15', etiquetaId: 'etiqueta-12' }, // Escapadas (brand-2)

  // paquete-16: Costa Rica Aventura (Escapadas b2)
  { id: 'petiq-23', paqueteId: 'paquete-16', etiquetaId: 'etiqueta-12' }, // Escapadas (brand-2)
];

// ---------------------------------------------------------------------------
// SEED_OPCIONES_HOTELERAS -- Hotel options per package
// Each option groups 1+ alojamientos with its own factor and sale price.
// ---------------------------------------------------------------------------

export const SEED_OPCIONES_HOTELERAS: OpcionHotelera[] = [
  // paquete-1: Buzios Relax (brand-1) - 2 options
  { id: 'opcion-1', paqueteId: 'paquete-1', nombre: 'Opcion Boutique', alojamientoIds: ['alojamiento-1'], factor: 0.77, precioVenta: 2346, orden: 1 },
  { id: 'opcion-2', paqueteId: 'paquete-1', nombre: 'Opcion Economica', alojamientoIds: ['alojamiento-2'], factor: 0.80, precioVenta: 1883, orden: 2 },

  // paquete-2: Cancun All Inclusive (brand-1) - 2 options
  { id: 'opcion-3', paqueteId: 'paquete-2', nombre: 'Iberostar 5*', alojamientoIds: ['alojamiento-3'], factor: 0.78, precioVenta: 4346, orden: 1 },
  { id: 'opcion-4', paqueteId: 'paquete-2', nombre: 'Grand Oasis 4*', alojamientoIds: ['alojamiento-4'], factor: 0.80, precioVenta: 3388, orden: 2 },

  // paquete-3: Punta Cana Paradise (brand-1)
  { id: 'opcion-5', paqueteId: 'paquete-3', nombre: 'Barcelo Bavaro 5*', alojamientoIds: ['alojamiento-5'], factor: 0.76, precioVenta: 2811, orden: 1 },

  // paquete-4: Miami Shopping (brand-1)
  { id: 'opcion-6', paqueteId: 'paquete-4', nombre: 'Fontainebleau 5*', alojamientoIds: ['alojamiento-7'], factor: 0.73, precioVenta: 3945, orden: 1 },

  // paquete-6: Rio + Buzios (brand-1) - 3 options (multi-hotel)
  { id: 'opcion-7', paqueteId: 'paquete-6', nombre: 'Premium', alojamientoIds: ['alojamiento-6', 'alojamiento-1'], factor: 0.75, precioVenta: 3907, orden: 1 },
  { id: 'opcion-8', paqueteId: 'paquete-6', nombre: 'Estandar', alojamientoIds: ['alojamiento-6', 'alojamiento-2'], factor: 0.78, precioVenta: 3474, orden: 2 },

  // paquete-8: Orlando Magic (brand-1)
  { id: 'opcion-9', paqueteId: 'paquete-8', nombre: 'Fontainebleau 5*', alojamientoIds: ['alojamiento-7'], factor: 0.78, precioVenta: 4679, orden: 1 },

  // paquete-11: Caribe Sonado (brand-2)
  { id: 'opcion-10', paqueteId: 'paquete-11', nombre: 'Hyatt Ziva 5*', alojamientoIds: ['alojamiento-9'], factor: 0.77, precioVenta: 4514, orden: 1 },

  // paquete-12: Punta Cana Deluxe (brand-2)
  { id: 'opcion-11', paqueteId: 'paquete-12', nombre: 'Hard Rock 5*', alojamientoIds: ['alojamiento-10'], factor: 0.76, precioVenta: 2947, orden: 1 },

  // paquete-13: Brasil Express (brand-2) - 1 option
  { id: 'opcion-12', paqueteId: 'paquete-13', nombre: 'Windsor Atlantica 4*', alojamientoIds: ['alojamiento-11'], factor: 0.74, precioVenta: 1622, orden: 1 },
];
