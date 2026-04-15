/**
 * Step 1: Seed global catalogs (Temporadas, Tipos, Regímenes, Países, Ciudades)
 *         for every brand in the DB.
 * Step 2: Link existing records (Alojamientos, Traslados, Paquetes) to those
 *         catalogs via fuzzy name matching.
 *
 * Run with:  npx tsx prisma/seed-catalogs-and-link.ts --confirm
 * Dry-run:   npx tsx prisma/seed-catalogs-and-link.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes('--confirm');

// ---------------------------------------------------------------------------
// Catalog definitions (exact names from user spec)
// ---------------------------------------------------------------------------

const TEMPORADAS = [
  { nombre: 'Temporada Baja (Sep-Nov)', orden: 1 },
  { nombre: 'Temporada Media (Mar-May, Jun-Ago)', orden: 2 },
  { nombre: 'Temporada Alta (Dic-Feb)', orden: 3 },
  { nombre: 'Semana Santa', orden: 4 },
  { nombre: 'Vacaciones de Julio', orden: 5 },
  { nombre: 'Black Week / Black Friday', orden: 6 },
];

const TIPOS_PAQUETE = [
  { nombre: 'Playa', orden: 1 },
  { nombre: 'Ciudad', orden: 2 },
  { nombre: 'Combinado (playa + ciudad)', orden: 3 },
  { nombre: 'Circuito / Tour', orden: 4 },
  { nombre: 'Crucero', orden: 5 },
  { nombre: 'All Inclusive', orden: 6 },
  { nombre: 'Luna de Miel', orden: 7 },
  { nombre: 'Aventura', orden: 8 },
  { nombre: 'Familiar', orden: 9 },
];

const REGIMENES = [
  { nombre: 'Solo alojamiento (sin comidas)', abrev: 'SA' },
  { nombre: 'Desayuno incluido', abrev: 'DES' },
  { nombre: 'Media pensión (desayuno + cena)', abrev: 'MP' },
  { nombre: 'Pensión completa (desayuno + almuerzo + cena)', abrev: 'PC' },
  { nombre: 'All Inclusive', abrev: 'AI' },
  { nombre: 'Ultra All Inclusive', abrev: 'UAI' },
];

const PAISES_CIUDADES: Record<string, string[]> = {
  Brasil: [
    'Búzios',
    'Río de Janeiro',
    'Florianópolis',
    'Salvador de Bahía',
    'São Paulo',
    'Maceió',
    'Natal',
    'Porto de Galinhas',
    'Foz de Iguazú',
  ],
  México: [
    'Cancún',
    'Playa del Carmen',
    'Tulum',
    'Costa Mujeres',
    'Riviera Maya',
    'Ciudad de México',
    'Los Cabos',
  ],
  'Estados Unidos': [
    'Miami',
    'Orlando',
    'Nueva York',
    'Las Vegas',
    'Los Ángeles',
  ],
  Argentina: [
    'Buenos Aires',
    'Bariloche',
    'Mendoza',
    'Ushuaia',
    'Iguazú',
    'El Calafate',
    'Salta',
  ],
  Colombia: [
    'Cartagena',
    'Bogotá',
    'San Andrés',
    'Medellín',
  ],
  'República Dominicana': [
    'Punta Cana',
    'Santo Domingo',
  ],
  Cuba: [
    'La Habana',
    'Varadero',
  ],
  Perú: [
    'Lima',
    'Cusco',
    'Machu Picchu',
  ],
  Chile: [
    'Santiago',
    'Viña del Mar',
    'Torres del Paine',
    'Puerto Montt',
    'Calama',
  ],
  Uruguay: [
    'Montevideo',
    'Punta del Este',
  ],
  España: [
    'Madrid',
    'Barcelona',
    'Ibiza',
    'Mallorca',
  ],
  Portugal: [
    'Lisboa',
    'Porto',
    'Algarve',
  ],
  Italia: [
    'Roma',
    'Milán',
    'Florencia',
    'Venecia',
    'Costa Amalfitana',
  ],
  Grecia: [
    'Atenas',
    'Santorini',
    'Mykonos',
  ],
  Turquía: [
    'Estambul',
    'Capadocia',
  ],
  Francia: [
    'París',
    'Niza',
  ],
  Tailandia: [
    'Bangkok',
    'Phuket',
    'Krabi',
  ],
  Sudáfrica: [
    'Ciudad del Cabo',
    'Johannesburgo',
  ],
  Egipto: [
    'El Cairo',
    'Sharm el-Sheikh',
  ],
  'Emiratos Árabes': [
    'Dubái',
    'Abu Dabi',
  ],
  Jamaica: [
    'Montego Bay',
    'Negril',
    'Ocho Ríos',
  ],
  Curazao: [
    'Willemstad',
  ],
  Aruba: [
    'Oranjestad',
    'Eagle Beach',
  ],
  Panamá: [
    'Ciudad de Panamá',
    'Playa Blanca',
  ],
  'Costa Rica': [
    'San José',
    'Guanacaste',
  ],
  Nepal: [
    'Kathmandú',
    'Pokhara',
  ],
  Filipinas: [
    'Manila',
    'El Nido',
  ],
  Camboya: [
    'Siem Reap',
    'Phnom Penh',
  ],
  India: [
    'Hyderabad',
  ],
};

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Keyword matcher — maps text fragments to [paisNombre, ciudadNombre]
// Longer/more specific patterns first so "porto de galinhas" wins over "porto".
// Ciudad must exist in PAISES_CIUDADES above (no synthetic values).
// ---------------------------------------------------------------------------

type Match = { pais: string; ciudad: string };

const KEYWORD_MATCHES: Array<[string, Match]> = [
  // Brasil — multi-word first
  ['porto de galinhas', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['salvador de bahia', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['salvador bahia', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['sao paulo', { pais: 'Brasil', ciudad: 'São Paulo' }],
  ['rio de janeiro', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['foz de iguazu', { pais: 'Brasil', ciudad: 'Foz de Iguazú' }],
  ['foz do iguacu', { pais: 'Brasil', ciudad: 'Foz de Iguazú' }],
  ['barra da lagoa', { pais: 'Brasil', ciudad: 'Florianópolis' }],
  ['barra da tijuca', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['joao fernandes', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['rio othon', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['othon palace', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['pestana rio', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['atlantico travel', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['vila do galo', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['praia dos anjos', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['monte pascoal', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['croa mares', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['recanto do lobo', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['praia dourada', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['pousada shalom', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['shalom beach', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['bicho preguica', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['casa do forte', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['pedra d agua', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['rosa dos ventos', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['vila do mar', { pais: 'Brasil', ciudad: 'Natal' }],
  ['marsol beach', { pais: 'Brasil', ciudad: 'Natal' }],
  ['costeira palace', { pais: 'Brasil', ciudad: 'Natal' }],
  ['ponta negra', { pais: 'Brasil', ciudad: 'Natal' }],
  ['ritz lagoa da anta', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['ritz lagoa', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['jericoacoara', { pais: 'Brasil', ciudad: 'Natal' }],
  ['fortaleza', { pais: 'Brasil', ciudad: 'Natal' }],
  ['cumbuco', { pais: 'Brasil', ciudad: 'Natal' }],
  ['joao pessoa', { pais: 'Brasil', ciudad: 'Natal' }],
  ['tabapitanga', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['atlante plaza', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['henrosa', { pais: 'Brasil', ciudad: 'Natal' }],
  ['grande hotel da barra', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['galinhas', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['oka da mata', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['buzios', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['florianopolis', { pais: 'Brasil', ciudad: 'Florianópolis' }],
  ['floripa', { pais: 'Brasil', ciudad: 'Florianópolis' }],
  ['maceio', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['maragogi', { pais: 'Brasil', ciudad: 'Maceió' }],
  ['natal', { pais: 'Brasil', ciudad: 'Natal' }],
  ['recife', { pais: 'Brasil', ciudad: 'Porto de Galinhas' }],
  ['salvador', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['bahia', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['imbassai', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['sauipe', { pais: 'Brasil', ciudad: 'Salvador de Bahía' }],
  ['cabo frio', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['arraial', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['ferradura', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['posada joao', { pais: 'Brasil', ciudad: 'Búzios' }],
  ['copacabana', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['ipanema', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['leme', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['hotel windsor asturias', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],
  ['maraton de rio', { pais: 'Brasil', ciudad: 'Río de Janeiro' }],

  // México — multi-word first
  ['playa del carmen', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['costa mujeres', { pais: 'México', ciudad: 'Costa Mujeres' }],
  ['riviera maya', { pais: 'México', ciudad: 'Riviera Maya' }],
  ['ciudad de mexico', { pais: 'México', ciudad: 'Ciudad de México' }],
  ['los cabos', { pais: 'México', ciudad: 'Los Cabos' }],
  ['isla mujeres', { pais: 'México', ciudad: 'Cancún' }],
  ['paraiso maya', { pais: 'México', ciudad: 'Riviera Maya' }],
  ['paraiso beach', { pais: 'México', ciudad: 'Riviera Maya' }],
  ['cancun', { pais: 'México', ciudad: 'Cancún' }],
  ['tulum', { pais: 'México', ciudad: 'Tulum' }],
  ['cozumel', { pais: 'México', ciudad: 'Cancún' }],
  ['holbox', { pais: 'México', ciudad: 'Cancún' }],
  ['cabo san lucas', { pais: 'México', ciudad: 'Los Cabos' }],
  ['playacar', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['tucancun', { pais: 'México', ciudad: 'Cancún' }],
  ['kantenah', { pais: 'México', ciudad: 'Riviera Maya' }],
  ['riu yucatan', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['riu tequila', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['riu lupita', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['riu caribe', { pais: 'México', ciudad: 'Cancún' }],
  ['riu dunamar', { pais: 'México', ciudad: 'Costa Mujeres' }],
  ['riu latino', { pais: 'México', ciudad: 'Costa Mujeres' }],
  ['riu palace las americas', { pais: 'México', ciudad: 'Cancún' }],
  ['riu palace mexico', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['riu palace costa mujeres', { pais: 'México', ciudad: 'Costa Mujeres' }],
  ['oasis palm', { pais: 'México', ciudad: 'Cancún' }],
  ['ocean view cancun', { pais: 'México', ciudad: 'Cancún' }],
  ['occidental tucancun', { pais: 'México', ciudad: 'Cancún' }],
  ['hm playa del carmen', { pais: 'México', ciudad: 'Playa del Carmen' }],
  ['allegro playacar', { pais: 'México', ciudad: 'Playa del Carmen' }],

  // Rep Dominicana
  ['punta cana', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['bayahibe', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['la romana', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['santo domingo', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['bavaro', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['riu palace bavaro', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['riu bambu', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['riu naiboa', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['riu republica', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['riu ventura', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['bahia principe grand turquesa', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['bahia principe grand bavaro', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['iberostar selection bavaro', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['iberostar selection coral bavaro', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['iberostar selection hacienda dominicus', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['iberostar waves dominicana', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['iberostar waves bahia all', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['iberostar waves costa dorada', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['iberostar waves bahia', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['grand palladium punta cana', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['vik hotel arena', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['senator puerto plata', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],
  ['new paradise', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],
  ['coronado inn', { pais: 'República Dominicana', ciudad: 'Punta Cana' }],

  // Cuba
  ['varadero', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['la habana', { pais: 'Cuba', ciudad: 'La Habana' }],
  ['habana', { pais: 'Cuba', ciudad: 'La Habana' }],
  ['parque central', { pais: 'Cuba', ciudad: 'La Habana' }],
  ['sol palmeras', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['melia las americas', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['melia buenavista', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['melia varadero', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['cuatro palmas', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['starfish cuatro palmas', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['iberostar parque central', { pais: 'Cuba', ciudad: 'La Habana' }],
  ['hotel nacional', { pais: 'Cuba', ciudad: 'La Habana' }],
  ['hotel playa cayo', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['paradisus los cayos', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['paradisus varadero', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['paradisus princesa', { pais: 'Cuba', ciudad: 'Varadero' }],

  // Colombia
  ['cartagena', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['san andres', { pais: 'Colombia', ciudad: 'San Andrés' }],
  ['bogota', { pais: 'Colombia', ciudad: 'Bogotá' }],
  ['medellin', { pais: 'Colombia', ciudad: 'Medellín' }],
  ['santa marta', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['decameron baru', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['decameron san luis', { pais: 'Colombia', ciudad: 'San Andrés' }],
  ['baluarte cartagena', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['mood matuna', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['capilla del mar', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['portofino caribe', { pais: 'Colombia', ciudad: 'San Andrés' }],
  ['bahia sardina', { pais: 'Colombia', ciudad: 'San Andrés' }],
  ['tamaca beach', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['hilton garden inn santa marta', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['poblado alejandria', { pais: 'Colombia', ciudad: 'Medellín' }],
  ['samawi', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['blu hotel by tamaca', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['quinta by wyndham', { pais: 'Colombia', ciudad: 'Cartagena' }],
  ['san martin', { pais: 'Colombia', ciudad: 'San Andrés' }],
  ['valladolid', { pais: 'Colombia', ciudad: 'Medellín' }],

  // Perú
  ['machu picchu', { pais: 'Perú', ciudad: 'Machu Picchu' }],
  ['cusco', { pais: 'Perú', ciudad: 'Cusco' }],
  ['cuzco', { pais: 'Perú', ciudad: 'Cusco' }],
  ['lima', { pais: 'Perú', ciudad: 'Lima' }],

  // Chile
  ['torres del paine', { pais: 'Chile', ciudad: 'Torres del Paine' }],
  ['vina del mar', { pais: 'Chile', ciudad: 'Viña del Mar' }],
  ['san pedro de atacama', { pais: 'Chile', ciudad: 'Calama' }],
  ['atacama', { pais: 'Chile', ciudad: 'Calama' }],
  ['puerto montt', { pais: 'Chile', ciudad: 'Puerto Montt' }],
  ['puerto varas', { pais: 'Chile', ciudad: 'Puerto Montt' }],
  ['calama', { pais: 'Chile', ciudad: 'Calama' }],
  ['santiago', { pais: 'Chile', ciudad: 'Santiago' }],

  // Uruguay
  ['punta del este', { pais: 'Uruguay', ciudad: 'Punta del Este' }],
  ['montevideo', { pais: 'Uruguay', ciudad: 'Montevideo' }],

  // Argentina
  ['buenos aires', { pais: 'Argentina', ciudad: 'Buenos Aires' }],
  ['el calafate', { pais: 'Argentina', ciudad: 'El Calafate' }],
  ['perito moreno', { pais: 'Argentina', ciudad: 'El Calafate' }],
  ['calafate', { pais: 'Argentina', ciudad: 'El Calafate' }],
  ['bariloche', { pais: 'Argentina', ciudad: 'Bariloche' }],
  ['ushuaia', { pais: 'Argentina', ciudad: 'Ushuaia' }],
  ['mendoza', { pais: 'Argentina', ciudad: 'Mendoza' }],
  ['salta', { pais: 'Argentina', ciudad: 'Salta' }],
  ['iguazu argentina', { pais: 'Argentina', ciudad: 'Iguazú' }],
  // Note: generic "iguazu" → Foz de Iguazú (Brasil side is more common in packages)

  // Jamaica
  ['riu palace tropical bay', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['tropical bay', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['rose hall', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['lady hamilton', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['grand palladium jamaica', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['riu negril', { pais: 'Jamaica', ciudad: 'Negril' }],
  ['riu ocho rios', { pais: 'Jamaica', ciudad: 'Ocho Ríos' }],
  ['ocho rios', { pais: 'Jamaica', ciudad: 'Ocho Ríos' }],
  ['montego bay', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['negril', { pais: 'Jamaica', ciudad: 'Negril' }],
  ['zona palladium', { pais: 'Jamaica', ciudad: 'Montego Bay' }],
  ['jamaica', { pais: 'Jamaica', ciudad: 'Montego Bay' }],

  // Curazao
  ['sunscape curacao', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['mangrove beach corendon', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['kunuku aqua', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['kunuku resort', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['kunuku', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['brion city', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['curacao', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['curazao', { pais: 'Curazao', ciudad: 'Willemstad' }],
  ['willemstad', { pais: 'Curazao', ciudad: 'Willemstad' }],

  // Aruba
  ['tryp by wyndham aruba', { pais: 'Aruba', ciudad: 'Oranjestad' }],
  ['eagle aruba', { pais: 'Aruba', ciudad: 'Eagle Beach' }],
  ['mvc eagle', { pais: 'Aruba', ciudad: 'Eagle Beach' }],
  ['eagle beach', { pais: 'Aruba', ciudad: 'Eagle Beach' }],
  ['oranjestad', { pais: 'Aruba', ciudad: 'Oranjestad' }],
  ['coconut inn', { pais: 'Aruba', ciudad: 'Oranjestad' }],
  ['aruba', { pais: 'Aruba', ciudad: 'Oranjestad' }],

  // Panamá
  ['riu playa blanca', { pais: 'Panamá', ciudad: 'Playa Blanca' }],
  ['playa blanca panama', { pais: 'Panamá', ciudad: 'Playa Blanca' }],
  ['ciudad de panama', { pais: 'Panamá', ciudad: 'Ciudad de Panamá' }],
  ['panama city', { pais: 'Panamá', ciudad: 'Ciudad de Panamá' }],
  ['puerto colon', { pais: 'Panamá', ciudad: 'Ciudad de Panamá' }],
  ['panama', { pais: 'Panamá', ciudad: 'Ciudad de Panamá' }],

  // Costa Rica
  ['san jose costa rica', { pais: 'Costa Rica', ciudad: 'San José' }],
  ['guanacaste', { pais: 'Costa Rica', ciudad: 'Guanacaste' }],
  ['costa rica', { pais: 'Costa Rica', ciudad: 'San José' }],

  // Nepal
  ['kathmandu', { pais: 'Nepal', ciudad: 'Kathmandú' }],
  ['pokhara', { pais: 'Nepal', ciudad: 'Pokhara' }],
  ['nepal', { pais: 'Nepal', ciudad: 'Kathmandú' }],

  // Filipinas
  ['el nido', { pais: 'Filipinas', ciudad: 'El Nido' }],
  ['manila', { pais: 'Filipinas', ciudad: 'Manila' }],
  ['filipinas', { pais: 'Filipinas', ciudad: 'Manila' }],
  ['philippines', { pais: 'Filipinas', ciudad: 'Manila' }],

  // Camboya
  ['siem reap', { pais: 'Camboya', ciudad: 'Siem Reap' }],
  ['phnom penh', { pais: 'Camboya', ciudad: 'Phnom Penh' }],
  ['camboya', { pais: 'Camboya', ciudad: 'Siem Reap' }],
  ['cambodia', { pais: 'Camboya', ciudad: 'Siem Reap' }],
  ['angkor', { pais: 'Camboya', ciudad: 'Siem Reap' }],

  // India
  ['hyderabad', { pais: 'India', ciudad: 'Hyderabad' }],
  ['india', { pais: 'India', ciudad: 'Hyderabad' }],

  // EEUU
  ['buena vista', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['lake buena vista', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['disney springs', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['nueva york', { pais: 'Estados Unidos', ciudad: 'Nueva York' }],
  ['new york', { pais: 'Estados Unidos', ciudad: 'Nueva York' }],
  ['manhattan', { pais: 'Estados Unidos', ciudad: 'Nueva York' }],
  ['times square', { pais: 'Estados Unidos', ciudad: 'Nueva York' }],
  ['las vegas', { pais: 'Estados Unidos', ciudad: 'Las Vegas' }],
  ['los angeles', { pais: 'Estados Unidos', ciudad: 'Los Ángeles' }],
  ['miami', { pais: 'Estados Unidos', ciudad: 'Miami' }],
  ['collins', { pais: 'Estados Unidos', ciudad: 'Miami' }],
  ['orlando', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['disney', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['universal', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['kissimmee', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['holiday inn orlando', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['rosen inn', { pais: 'Estados Unidos', ciudad: 'Orlando' }],
  ['riu plaza', { pais: 'Estados Unidos', ciudad: 'Nueva York' }],
  ['all star', { pais: 'Estados Unidos', ciudad: 'Orlando' }],

  // España — multi-word first
  ['sur de espana', { pais: 'España', ciudad: 'Madrid' }],
  ['barcelona', { pais: 'España', ciudad: 'Barcelona' }],
  ['mallorca', { pais: 'España', ciudad: 'Mallorca' }],
  ['madrid', { pais: 'España', ciudad: 'Madrid' }],
  ['ibiza', { pais: 'España', ciudad: 'Ibiza' }],

  // Portugal — "porto" AFTER "porto de galinhas" (covered above)
  ['lisboa', { pais: 'Portugal', ciudad: 'Lisboa' }],
  ['algarve', { pais: 'Portugal', ciudad: 'Algarve' }],
  ['oporto', { pais: 'Portugal', ciudad: 'Porto' }],
  ['porto', { pais: 'Portugal', ciudad: 'Porto' }],

  // Italia
  ['costa amalfitana', { pais: 'Italia', ciudad: 'Costa Amalfitana' }],
  ['florencia', { pais: 'Italia', ciudad: 'Florencia' }],
  ['venecia', { pais: 'Italia', ciudad: 'Venecia' }],
  ['milan', { pais: 'Italia', ciudad: 'Milán' }],
  ['roma', { pais: 'Italia', ciudad: 'Roma' }],

  // Grecia
  ['santorini', { pais: 'Grecia', ciudad: 'Santorini' }],
  ['mykonos', { pais: 'Grecia', ciudad: 'Mykonos' }],
  ['atenas', { pais: 'Grecia', ciudad: 'Atenas' }],

  // Turquía
  ['capadocia', { pais: 'Turquía', ciudad: 'Capadocia' }],
  ['estambul', { pais: 'Turquía', ciudad: 'Estambul' }],
  ['turquia', { pais: 'Turquía', ciudad: 'Estambul' }],

  // Francia
  ['paris', { pais: 'Francia', ciudad: 'París' }],
  ['niza', { pais: 'Francia', ciudad: 'Niza' }],

  // Tailandia
  ['bangkok', { pais: 'Tailandia', ciudad: 'Bangkok' }],
  ['phuket', { pais: 'Tailandia', ciudad: 'Phuket' }],
  ['krabi', { pais: 'Tailandia', ciudad: 'Krabi' }],

  // Sudáfrica
  ['ciudad del cabo', { pais: 'Sudáfrica', ciudad: 'Ciudad del Cabo' }],
  ['johannesburgo', { pais: 'Sudáfrica', ciudad: 'Johannesburgo' }],

  // Egipto
  ['sharm', { pais: 'Egipto', ciudad: 'Sharm el-Sheikh' }],
  ['el cairo', { pais: 'Egipto', ciudad: 'El Cairo' }],
  ['cairo', { pais: 'Egipto', ciudad: 'El Cairo' }],

  // EAU
  ['abu dabi', { pais: 'Emiratos Árabes', ciudad: 'Abu Dabi' }],
  ['abu dhabi', { pais: 'Emiratos Árabes', ciudad: 'Abu Dabi' }],
  ['dubai', { pais: 'Emiratos Árabes', ciudad: 'Dubái' }],

  // Generic iguazu fallback (assume Brasil side - Foz)
  ['iguazu', { pais: 'Brasil', ciudad: 'Foz de Iguazú' }],
  ['jericoacoara', { pais: 'Brasil', ciudad: 'Natal' }],
  ['fortaleza', { pais: 'Brasil', ciudad: 'Natal' }],
  ['pipa', { pais: 'Brasil', ciudad: 'Natal' }],

  // More Cuba
  ['cayo santa maria', { pais: 'Cuba', ciudad: 'Varadero' }],
  ['cayo', { pais: 'Cuba', ciudad: 'Varadero' }],

  // More RD
  ['puerto plata', { pais: 'República Dominicana', ciudad: 'Santo Domingo' }],

  // Panamá — generic "playa blanca" (Riu Playa Blanca is in Panamá)
  ['playa blanca', { pais: 'Panamá', ciudad: 'Playa Blanca' }],

  // Airport code hint pattern "en MIA" / "en GDL" for generic traslados
  ['en mia', { pais: 'Estados Unidos', ciudad: 'Miami' }],
  ['en gdl', { pais: 'México', ciudad: 'Ciudad de México' }],

  // FIFA 2026 "PARTIDOS" packages — host city unknown from data; best guess CDMX
  ['partidos', { pais: 'México', ciudad: 'Ciudad de México' }],
];

// Sort by length descending so longer patterns match first
KEYWORD_MATCHES.sort((a, b) => b[0].length - a[0].length);

// IATA airport code → pais/ciudad (for traslados like "CUN → Cancun")
const IATA_TO_CITY: Record<string, Match> = {
  CUN: { pais: 'México', ciudad: 'Cancún' },
  PUJ: { pais: 'República Dominicana', ciudad: 'Punta Cana' },
  SDQ: { pais: 'República Dominicana', ciudad: 'Santo Domingo' },
  GIG: { pais: 'Brasil', ciudad: 'Río de Janeiro' },
  SDU: { pais: 'Brasil', ciudad: 'Río de Janeiro' },
  SSA: { pais: 'Brasil', ciudad: 'Salvador de Bahía' },
  REC: { pais: 'Brasil', ciudad: 'Porto de Galinhas' },
  NAT: { pais: 'Brasil', ciudad: 'Natal' },
  MCZ: { pais: 'Brasil', ciudad: 'Maceió' },
  FLN: { pais: 'Brasil', ciudad: 'Florianópolis' },
  GRU: { pais: 'Brasil', ciudad: 'São Paulo' },
  CGH: { pais: 'Brasil', ciudad: 'São Paulo' },
  IGU: { pais: 'Brasil', ciudad: 'Foz de Iguazú' },
  FOR: { pais: 'Brasil', ciudad: 'Natal' },
  JPA: { pais: 'Brasil', ciudad: 'Natal' },
  TQO: { pais: 'México', ciudad: 'Tulum' },
  GDL: { pais: 'México', ciudad: 'Ciudad de México' },
  LIM: { pais: 'Perú', ciudad: 'Lima' },
  CUZ: { pais: 'Perú', ciudad: 'Cusco' },
  BOG: { pais: 'Colombia', ciudad: 'Bogotá' },
  MDE: { pais: 'Colombia', ciudad: 'Medellín' },
  CTG: { pais: 'Colombia', ciudad: 'Cartagena' },
  ADZ: { pais: 'Colombia', ciudad: 'San Andrés' },
  HAV: { pais: 'Cuba', ciudad: 'La Habana' },
  VRA: { pais: 'Cuba', ciudad: 'Varadero' },
  MCO: { pais: 'Estados Unidos', ciudad: 'Orlando' },
  MIA: { pais: 'Estados Unidos', ciudad: 'Miami' },
  JFK: { pais: 'Estados Unidos', ciudad: 'Nueva York' },
  LGA: { pais: 'Estados Unidos', ciudad: 'Nueva York' },
  LAS: { pais: 'Estados Unidos', ciudad: 'Las Vegas' },
  LAX: { pais: 'Estados Unidos', ciudad: 'Los Ángeles' },
  MAD: { pais: 'España', ciudad: 'Madrid' },
  BCN: { pais: 'España', ciudad: 'Barcelona' },
  IBZ: { pais: 'España', ciudad: 'Ibiza' },
  PMI: { pais: 'España', ciudad: 'Mallorca' },
  LIS: { pais: 'Portugal', ciudad: 'Lisboa' },
  OPO: { pais: 'Portugal', ciudad: 'Porto' },
  FAO: { pais: 'Portugal', ciudad: 'Algarve' },
  FCO: { pais: 'Italia', ciudad: 'Roma' },
  MXP: { pais: 'Italia', ciudad: 'Milán' },
  VCE: { pais: 'Italia', ciudad: 'Venecia' },
  FLR: { pais: 'Italia', ciudad: 'Florencia' },
  ATH: { pais: 'Grecia', ciudad: 'Atenas' },
  JTR: { pais: 'Grecia', ciudad: 'Santorini' },
  JMK: { pais: 'Grecia', ciudad: 'Mykonos' },
  IST: { pais: 'Turquía', ciudad: 'Estambul' },
  CDG: { pais: 'Francia', ciudad: 'París' },
  ORY: { pais: 'Francia', ciudad: 'París' },
  NCE: { pais: 'Francia', ciudad: 'Niza' },
  BKK: { pais: 'Tailandia', ciudad: 'Bangkok' },
  HKT: { pais: 'Tailandia', ciudad: 'Phuket' },
  KBV: { pais: 'Tailandia', ciudad: 'Krabi' },
  CPT: { pais: 'Sudáfrica', ciudad: 'Ciudad del Cabo' },
  JNB: { pais: 'Sudáfrica', ciudad: 'Johannesburgo' },
  CAI: { pais: 'Egipto', ciudad: 'El Cairo' },
  SSH: { pais: 'Egipto', ciudad: 'Sharm el-Sheikh' },
  DXB: { pais: 'Emiratos Árabes', ciudad: 'Dubái' },
  AUH: { pais: 'Emiratos Árabes', ciudad: 'Abu Dabi' },
  EZE: { pais: 'Argentina', ciudad: 'Buenos Aires' },
  AEP: { pais: 'Argentina', ciudad: 'Buenos Aires' },
  BRC: { pais: 'Argentina', ciudad: 'Bariloche' },
  USH: { pais: 'Argentina', ciudad: 'Ushuaia' },
  MDZ: { pais: 'Argentina', ciudad: 'Mendoza' },
  SCL: { pais: 'Chile', ciudad: 'Santiago' },
  PMC: { pais: 'Chile', ciudad: 'Puerto Montt' },
  CJC: { pais: 'Chile', ciudad: 'Calama' },
  MVD: { pais: 'Uruguay', ciudad: 'Montevideo' },
  PDP: { pais: 'Uruguay', ciudad: 'Punta del Este' },
  FTE: { pais: 'Argentina', ciudad: 'El Calafate' },
  SLA: { pais: 'Argentina', ciudad: 'Salta' },
  MBJ: { pais: 'Jamaica', ciudad: 'Montego Bay' },
  KIN: { pais: 'Jamaica', ciudad: 'Montego Bay' },
  AUA: { pais: 'Aruba', ciudad: 'Oranjestad' },
  CUR: { pais: 'Curazao', ciudad: 'Willemstad' },
  PTY: { pais: 'Panamá', ciudad: 'Ciudad de Panamá' },
  SJO: { pais: 'Costa Rica', ciudad: 'San José' },
  LIR: { pais: 'Costa Rica', ciudad: 'Guanacaste' },
  KTM: { pais: 'Nepal', ciudad: 'Kathmandú' },
  MNL: { pais: 'Filipinas', ciudad: 'Manila' },
  PPS: { pais: 'Filipinas', ciudad: 'El Nido' },
  REP: { pais: 'Camboya', ciudad: 'Siem Reap' },
  PNH: { pais: 'Camboya', ciudad: 'Phnom Penh' },
  HYD: { pais: 'India', ciudad: 'Hyderabad' },
};

function findMatch(text: string): Match | null {
  const norm = normalize(text);
  if (!norm) return null;

  // 1) IATA code prefix (e.g., "CUN → Cancun")
  const iataMatch = text.match(/^([A-Z]{3})\s*[→>\-]/);
  if (iataMatch && IATA_TO_CITY[iataMatch[1]]) {
    return IATA_TO_CITY[iataMatch[1]];
  }

  // 2) Keyword match (longest first)
  for (const [kw, match] of KEYWORD_MATCHES) {
    if (norm.includes(kw)) return match;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tipo paquete inference
// ---------------------------------------------------------------------------

function inferTipoPaquete(titulo: string, destino: string): string {
  const text = normalize(titulo + ' ' + destino);

  // Crucero
  if (/\b(crucero|cruceros|cabina)\b/.test(text)) return 'Crucero';

  // Familiar (Disney / Universal)
  if (/\b(disney|universal|kissimmee|buena vista|orlando)\b/.test(text))
    return 'Familiar';

  // Luna de miel
  if (/\b(luna de miel|honeymoon)\b/.test(text)) return 'Luna de Miel';

  // Aventura
  if (/\b(aventura|trekking|ushuaia|bariloche|machu picchu|torres del paine)\b/.test(text))
    return 'Aventura';

  // Circuito / Tour (multiple destinations joined with +, y, &, commas → but filter out "con fortaleza")
  if (/\b(circuito|tour|europamundo)\b/.test(text)) return 'Circuito / Tour';

  // Combinado — has " + " or " y " or " & " with multiple destinations
  const hasCombination =
    /\s\+\s/.test(text) ||
    /\s&\s/.test(text) ||
    /,\s*(madrid|paris|roma|florencia|venecia|milan|barcelona|amsterdam|londres|ibiza|mallorca)/.test(text);
  if (hasCombination) return 'Combinado (playa + ciudad)';

  // All Inclusive (only if pure beach + AI marker)
  if (/all\s*inc/.test(text)) return 'All Inclusive';

  // City destinations → Ciudad
  const isCity =
    /\b(madrid|barcelona|paris|roma|milan|lisboa|oporto|porto|londres|amsterdam|nueva york|new york|estambul|atenas|dubai|abu dabi|buenos aires|santiago|montevideo|ciudad de mexico|cartagena|bogota|medellin|lima|cusco|la habana|capadocia|el cairo|florencia|venecia|niza)\b/.test(
      text,
    );
  if (isCity) return 'Ciudad';

  // Default → Playa (most common in the data)
  return 'Playa';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[seed-catalogs] Mode: ${CONFIRM ? 'CONFIRM (will write)' : 'DRY-RUN'}`);

  // Discover brands
  const brandRows = await prisma.user.findMany({
    distinct: ['brandId'],
    select: { brandId: true },
  });
  const brandIds = brandRows.map((r) => r.brandId);
  console.log(`[seed-catalogs] Brands detected: ${brandIds.join(', ')}`);

  // ---- STEP 1: Upsert catalogs per brand ----
  console.log('\n[step 1] Seeding catalogs for each brand...');

  // brand → {paisName → paisId}, {pais|ciudad → ciudadId}
  const paisMap: Record<string, Record<string, string>> = {};
  const ciudadMap: Record<string, Record<string, string>> = {};
  const temporadaMap: Record<string, Record<string, string>> = {};
  const tipoMap: Record<string, Record<string, string>> = {};
  const regimenMap: Record<string, Record<string, string>> = {};

  for (const brandId of brandIds) {
    paisMap[brandId] = {};
    ciudadMap[brandId] = {};
    temporadaMap[brandId] = {};
    tipoMap[brandId] = {};
    regimenMap[brandId] = {};

    // Temporadas
    for (const t of TEMPORADAS) {
      if (CONFIRM) {
        const up = await prisma.temporada.upsert({
          where: { brandId_nombre: { brandId, nombre: t.nombre } },
          create: { brandId, nombre: t.nombre, orden: t.orden, activa: true },
          update: { orden: t.orden, activa: true },
        });
        temporadaMap[brandId][t.nombre] = up.id;
      } else {
        temporadaMap[brandId][t.nombre] = `dry-temp-${t.nombre}`;
      }
    }

    // Tipos
    for (const t of TIPOS_PAQUETE) {
      if (CONFIRM) {
        const up = await prisma.tipoPaquete.upsert({
          where: { brandId_nombre: { brandId, nombre: t.nombre } },
          create: { brandId, nombre: t.nombre, orden: t.orden, activo: true },
          update: { orden: t.orden, activo: true },
        });
        tipoMap[brandId][t.nombre] = up.id;
      } else {
        tipoMap[brandId][t.nombre] = `dry-tipo-${t.nombre}`;
      }
    }

    // Regímenes
    for (const r of REGIMENES) {
      if (CONFIRM) {
        const up = await prisma.regimen.upsert({
          where: { brandId_nombre: { brandId, nombre: r.nombre } },
          create: { brandId, nombre: r.nombre, abrev: r.abrev },
          update: { abrev: r.abrev },
        });
        regimenMap[brandId][r.nombre] = up.id;
      } else {
        regimenMap[brandId][r.nombre] = `dry-reg-${r.nombre}`;
      }
    }

    // Países + Ciudades
    for (const [paisNombre, ciudades] of Object.entries(PAISES_CIUDADES)) {
      let paisId: string;
      if (CONFIRM) {
        // Pais has no @@unique — use findFirst + create manually
        const existing = await prisma.pais.findFirst({
          where: { brandId, nombre: paisNombre },
        });
        if (existing) {
          paisId = existing.id;
        } else {
          const created = await prisma.pais.create({
            data: { brandId, nombre: paisNombre },
          });
          paisId = created.id;
        }
      } else {
        paisId = `dry-pais-${paisNombre}`;
      }
      paisMap[brandId][paisNombre] = paisId;

      for (const ciudadNombre of ciudades) {
        let ciudadId: string;
        if (CONFIRM) {
          const existing = await prisma.ciudad.findFirst({
            where: { paisId, nombre: ciudadNombre },
          });
          if (existing) {
            ciudadId = existing.id;
          } else {
            const created = await prisma.ciudad.create({
              data: { paisId, nombre: ciudadNombre },
            });
            ciudadId = created.id;
          }
        } else {
          ciudadId = `dry-ciudad-${paisNombre}-${ciudadNombre}`;
        }
        ciudadMap[brandId][`${paisNombre}|${ciudadNombre}`] = ciudadId;
      }
    }

    console.log(
      `  [${brandId}] temporadas=${Object.keys(temporadaMap[brandId]).length} tipos=${Object.keys(tipoMap[brandId]).length} regimenes=${Object.keys(regimenMap[brandId]).length} paises=${Object.keys(paisMap[brandId]).length} ciudades=${Object.keys(ciudadMap[brandId]).length}`,
    );
  }

  // ---- STEP 2: Link existing records ----
  console.log('\n[step 2] Linking existing records...');

  // First: compute location match for every paquete (so we can fall back to
  // parent-paquete location when a hotel/traslado name is unclear).
  const allPaquetes = await prisma.paquete.findMany({
    select: { id: true, titulo: true, destino: true, brandId: true },
  });
  const paqueteLocationMap = new Map<string, Match>();
  for (const p of allPaquetes) {
    const m = findMatch(p.titulo + ' ' + p.destino);
    if (m) paqueteLocationMap.set(p.id, m);
  }

  // Load junction tables for fallback lookups
  const [paqAlojamientos, paqTraslados] = await Promise.all([
    prisma.paqueteAlojamiento.findMany({ select: { paqueteId: true, alojamientoId: true } }),
    prisma.paqueteTraslado.findMany({ select: { paqueteId: true, trasladoId: true } }),
  ]);

  // Reverse index: alojamientoId → [paqueteId,...]
  const alojamientoToPaquetes = new Map<string, string[]>();
  for (const pa of paqAlojamientos) {
    const arr = alojamientoToPaquetes.get(pa.alojamientoId) ?? [];
    arr.push(pa.paqueteId);
    alojamientoToPaquetes.set(pa.alojamientoId, arr);
  }
  const trasladoToPaquetes = new Map<string, string[]>();
  for (const pt of paqTraslados) {
    const arr = trasladoToPaquetes.get(pt.trasladoId) ?? [];
    arr.push(pt.paqueteId);
    trasladoToPaquetes.set(pt.trasladoId, arr);
  }

  // Helper: resolve a match from parent paquetes (most frequent wins)
  function matchFromParents(parents: string[]): Match | null {
    if (parents.length === 0) return null;
    const counts = new Map<string, { match: Match; count: number }>();
    for (const pid of parents) {
      const m = paqueteLocationMap.get(pid);
      if (!m) continue;
      const key = `${m.pais}|${m.ciudad}`;
      const prev = counts.get(key);
      if (prev) prev.count++;
      else counts.set(key, { match: m, count: 1 });
    }
    let best: { match: Match; count: number } | null = null;
    counts.forEach((entry) => {
      if (!best || entry.count > best.count) best = entry;
    });
    return best ? (best as { match: Match; count: number }).match : null;
  }

  // Alojamientos — only process those without paisId (safe for re-runs)
  const alojamientos = await prisma.alojamiento.findMany({
    select: { id: true, nombre: true, brandId: true, paisId: true, ciudadId: true },
  });
  let aloAlreadyLinked = 0;
  let aloMatched = 0;
  let aloViaParent = 0;
  const aloUnmatched: Array<{ id: string; nombre: string }> = [];
  for (const a of alojamientos) {
    if (a.paisId) {
      aloAlreadyLinked++;
      continue;
    }
    let match = findMatch(a.nombre);
    let viaParent = false;
    if (!match) {
      const parents = alojamientoToPaquetes.get(a.id) ?? [];
      match = matchFromParents(parents);
      if (match) viaParent = true;
    }
    if (!match) {
      aloUnmatched.push({ id: a.id, nombre: a.nombre });
      continue;
    }
    const paisId = paisMap[a.brandId]?.[match.pais];
    const ciudadId = ciudadMap[a.brandId]?.[`${match.pais}|${match.ciudad}`];
    if (!paisId || !ciudadId) {
      aloUnmatched.push({ id: a.id, nombre: a.nombre });
      continue;
    }
    if (CONFIRM) {
      await prisma.alojamiento.update({
        where: { id: a.id },
        data: { paisId, ciudadId },
      });
    }
    aloMatched++;
    if (viaParent) aloViaParent++;
  }
  console.log(
    `  Alojamientos: ${aloAlreadyLinked} already linked, ${aloMatched} newly matched (${aloViaParent} via parent), ${aloUnmatched.length} unmatched — total ${alojamientos.length}`,
  );

  // Traslados — only process those without paisId (safe for re-runs)
  const traslados = await prisma.traslado.findMany({
    select: { id: true, nombre: true, brandId: true, paisId: true },
  });
  let traAlreadyLinked = 0;
  let traMatched = 0;
  let traViaParent = 0;
  const traUnmatched: Array<{ id: string; nombre: string }> = [];
  for (const t of traslados) {
    if (t.paisId) {
      traAlreadyLinked++;
      continue;
    }
    let match = findMatch(t.nombre);
    let viaParent = false;
    if (!match) {
      const parents = trasladoToPaquetes.get(t.id) ?? [];
      match = matchFromParents(parents);
      if (match) viaParent = true;
    }
    if (!match) {
      traUnmatched.push({ id: t.id, nombre: t.nombre });
      continue;
    }
    const paisId = paisMap[t.brandId]?.[match.pais];
    const ciudadId = ciudadMap[t.brandId]?.[`${match.pais}|${match.ciudad}`];
    if (!paisId || !ciudadId) {
      traUnmatched.push({ id: t.id, nombre: t.nombre });
      continue;
    }
    if (CONFIRM) {
      await prisma.traslado.update({
        where: { id: t.id },
        data: { paisId, ciudadId },
      });
    }
    traMatched++;
    if (viaParent) traViaParent++;
  }
  console.log(
    `  Traslados: ${traAlreadyLinked} already linked, ${traMatched} newly matched (${traViaParent} via parent), ${traUnmatched.length} unmatched — total ${traslados.length}`,
  );

  // Paquetes — set temporada (default Media) + tipo (inferred) + destino refinement
  const paquetes = await prisma.paquete.findMany({
    select: { id: true, titulo: true, destino: true, brandId: true, salidas: true },
  });
  let paqMatched = 0;
  const paqNoTipo: Array<{ id: string; titulo: string }> = [];
  for (const p of paquetes) {
    const tipoNombre = inferTipoPaquete(p.titulo, p.destino);
    const tipoId = tipoMap[p.brandId]?.[tipoNombre];
    // Default temporada: Media (broadest — user can refine later)
    const temporadaId = temporadaMap[p.brandId]?.['Temporada Media (Mar-May, Jun-Ago)'];

    if (!tipoId || !temporadaId) {
      paqNoTipo.push({ id: p.id, titulo: p.titulo });
      continue;
    }

    if (CONFIRM) {
      await prisma.paquete.update({
        where: { id: p.id },
        data: { tipoPaqueteId: tipoId, temporadaId },
      });
    }
    paqMatched++;
  }
  console.log(
    `  Paquetes: ${paqMatched}/${paquetes.length} (temporada=Media default, tipo inferred)`,
  );

  // ---- Verification ----
  if (CONFIRM) {
    console.log('\n[verify] Final counts:');
    const [aloNull, traNull, paqTempNull, paqTipoNull] = await Promise.all([
      prisma.alojamiento.count({ where: { paisId: null } }),
      prisma.traslado.count({ where: { paisId: null } }),
      prisma.paquete.count({ where: { temporadaId: null } }),
      prisma.paquete.count({ where: { tipoPaqueteId: null } }),
    ]);
    console.log(`  Alojamientos sin paisId: ${aloNull}`);
    console.log(`  Traslados sin paisId: ${traNull}`);
    console.log(`  Paquetes sin temporadaId: ${paqTempNull}`);
    console.log(`  Paquetes sin tipoPaqueteId: ${paqTipoNull}`);
  }

  // ---- Unmatched reports ----
  if (aloUnmatched.length > 0) {
    console.log(`\n[UNMATCHED] ${aloUnmatched.length} alojamientos could not be matched:`);
    for (const a of aloUnmatched) {
      console.log(`  - ${a.nombre}`);
    }
  }
  if (traUnmatched.length > 0) {
    console.log(`\n[UNMATCHED] ${traUnmatched.length} traslados could not be matched:`);
    for (const t of traUnmatched) {
      console.log(`  - ${t.nombre}`);
    }
  }

  if (!CONFIRM) {
    console.log('\n[seed-catalogs] Dry-run complete. Re-run with --confirm to apply.');
  } else {
    console.log('\n[seed-catalogs] Done.');
  }
}

main()
  .catch((e) => {
    console.error('[seed-catalogs] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
