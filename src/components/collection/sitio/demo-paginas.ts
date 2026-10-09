// Páginas de muestra (Inicio, Nosotros, Términos y un artículo) para maquetar
// sin base de datos. Pasan por `armarVistaPagina`, igual que en el sitio. Los
// medios no tienen url: se dibuja su color. Textos de ejemplo, no aprobados.

import {
  armarVistaPagina,
  bloqueSchema,
  nuevoBloque,
  TIPOS_BLOQUE,
  type AliadoVista,
  type ArticuloCardVista,
  type ArticuloVista,
  type DestinoCardVista,
  type ExperienciaCardVista,
  type MapasPagina,
  type PaginaVista,
  type PreguntaVista,
  type TestimonioVista,
} from "@/lib/collection/paginas/contenido";
import type { EspecialistaVista, MedioVista } from "@/lib/collection/experiencia/contenido";
import { demo, medio } from "./demo";

const ACTUALIZADA = "2026-10-09T15:00:00.000Z";

// ── Medios ──────────────────────────────────────────────────────────────────

const lista: MedioVista[] = [
  medio("p-portada", "#5B6B70", 2400, 1600, "Cordillera al amanecer desde un refugio"),
  medio("p-nosotros", "#7A6A5C", 2400, 1600, "Mesa de trabajo con mapas y cuadernos de viaje"),
  medio("p-oficina", "#9A8A78", 1600, 2000, "La oficina de Collection en Montevideo"),
  medio("p-ruta", "#5F7A73", 1600, 2000, "Camioneta en un camino de ripio en la Patagonia"),
  medio("p-cita", "#3F5E66", 2400, 1400, "Atardecer sobre un lago de montaña"),
  medio("p-cierre", "#6E5B4C", 1600, 1800, "Terraza con vista al mar en Milos"),
  medio("p-news", "#40494D", 2000, 1200, "Cuaderno de viaje abierto"),
  medio("d-oriente", "#8A6B52", 1600, 2000, "Templo de madera entre arces en Kioto"),
  medio("d-africa", "#B08A5A", 1600, 2000, "Acacias al atardecer en el Serengeti"),
  medio("d-europa", "#5D7E95", 1600, 2000, "Casas blancas sobre el mar en Santorini"),
  medio("d-patagonia", "#6F8C8A", 1600, 2000, "Torres del Paine reflejadas en la laguna"),
  medio("d-pacifico", "#3E8A8E", 1600, 2000, "Bungalós sobre el agua en la Polinesia"),
  medio("d-islas", "#A7B5A6", 1600, 2000, "Isla privada con un solo muelle"),
  medio("x-kioto", "#9C6B4E", 1600, 2000, "Calle de Gion al anochecer"),
  medio("x-safari", "#B4925F", 1600, 2000, "Jeep abierto frente a una manada de elefantes"),
  medio("x-grecia", "#6A8FA8", 1600, 2000, "Velero frente a Milos"),
  medio("x-paine", "#5E7C78", 1600, 2000, "Estancia con los cuernos del Paine al fondo"),
  medio("x-vietnam", "#5D7A5A", 1600, 2000, "Tren nocturno entre arrozales"),
  medio("s-luna", "#B48C7A", 1200, 2000, "Cena para dos en la arena"),
  medio("s-familia", "#7E9A88", 1200, 2000, "Chicos corriendo en un muelle"),
  medio("s-safari", "#A27E52", 1200, 2000, "Binoculares sobre el capó de un jeep"),
  medio("s-bienestar", "#8DA3A0", 1200, 2000, "Piscina de piedra en un ryokan"),
  medio("s-gastro", "#8E5E48", 1200, 2000, "Mesa de mercado con frutas tropicales"),
  medio("e-tomas", "#6C6258", 800, 1000, "Tomás Vidal, especialista en África"),
  medio("e-martina", "#8F7B6D", 800, 1000, "Martina Acosta, especialista en Europa"),
  medio("e-joaquin", "#5D6864", 800, 1000, "Joaquín Pereyra, especialista en América del Sur"),
  medio("t-nido", "#2F6E73", 1600, 2000, "Bangka entre lagunas en El Nido"),
  medio("t-safari", "#A8834F", 1600, 2000, "Campamento de carpas en el Serengeti"),
  medio("t-japon", "#8B5E4A", 1600, 2000, "Puente rojo entre arces en Nikko"),
  medio("j-kioto", "#94603F", 2000, 1500, "Arces rojos en el templo Tofuku-ji"),
  medio("j-campamento", "#3D4A55", 1200, 1200, "Carpa iluminada bajo un cielo estrellado"),
  medio("j-safari", "#A99067", 1200, 1200, "Bolso de lona con binoculares y sombrero"),
  medio("g1", "#5B7A7E", 2000, 1333, "Equipo revisando un itinerario"),
  medio("g2", "#A08670", 1200, 1600, "Visita a un hotel en la Toscana"),
  medio("g3", "#6E8A6B", 1200, 1500, "Guía local en Hoi An"),
  medio("g4", "#4D6A80", 1600, 1067, "Lago Pehoé al amanecer"),
  medio("g5", "#B39A7C", 1200, 1200, "Desayuno en una estancia"),
  medio("g6", "#7B5D52", 1200, 1700, "Pasillo de un ryokan en Hakone"),
];
const M = Object.fromEntries(lista.map((m) => [m.id, m])) as Record<string, MedioVista>;

// ── Listas resueltas ───────────────────────────────────────────────────────

const destinos: DestinoCardVista[] = [
  ["oriente", "Misterios de Oriente", "Templos que abren antes del amanecer, mercados que no duermen y trenes nocturnos entre Japón, Vietnam y Filipinas.", 6],
  ["africa", "África esencial", "Safaris privados, campamentos de pocas carpas y cielos que cambian la forma de mirar.", 4],
  ["europa", "Bello Mundo", "Europa sin apuro: viñedos, islas griegas y pueblos de piedra.", 5],
  ["patagonia", "Patagonia y los Andes", "Glaciares, estancias y vinos de altura.", 3],
  ["pacifico", "Mares del Sur", "Islas del Pacífico con casas sobre el agua.", 2],
  ["islas", "Islas privadas", "Estamos eligiendo cada isla, una por una.", 0],
].map(([id, nombre, bajada, n]) => ({
  id: `d-${id}`,
  slug: String(id),
  nombre: String(nombre),
  bajada: String(bajada),
  portada: M[`d-${id}`],
  experiencias: Number(n),
  proximamente: n === 0,
}));

const experiencias: (ExperienciaCardVista & { destacada: boolean })[] = [
  {
    id: "x-filipinas",
    slug: demo.slug,
    titulo: demo.titulo,
    bajada: demo.bajada,
    tipo: "VIAJE",
    portada: demo.portada,
    noches: 11,
    destinos: ["Manila", "El Nido", "Boracay"],
    precioDesde: 5099,
    destacada: true,
  },
  {
    id: "x-kioto",
    slug: "japon-kioto-y-los-alpes",
    titulo: "Japón: Kioto, Takayama y los Alpes",
    bajada: "Ryokanes con baño termal, templos al amanecer y un tren entre montañas.",
    tipo: "VIAJE",
    portada: M["x-kioto"],
    noches: 10,
    destinos: ["Kioto", "Takayama", "Tokio"],
    precioDesde: null,
    destacada: true,
  },
  {
    id: "x-safari",
    slug: "safari-serengeti-zanzibar",
    titulo: "Safari en el Serengeti y Zanzíbar",
    bajada: "Cinco noches de campamento y cuatro frente al Índico.",
    tipo: "VIAJE",
    portada: M["x-safari"],
    noches: 9,
    destinos: ["Serengeti", "Zanzíbar"],
    precioDesde: 7480,
    destacada: true,
  },
  {
    id: "x-grecia",
    slug: "santorini-milos-atenas",
    titulo: "Grecia lenta: Atenas, Milos y Santorini",
    bajada: "Islas chicas, barcos propios y cenas largas frente al Egeo.",
    tipo: "VIAJE",
    portada: M["x-grecia"],
    noches: 8,
    destinos: ["Atenas", "Milos", "Santorini"],
    precioDesde: null,
    destacada: true,
  },
  {
    id: "x-paine",
    slug: "torres-del-paine-mendoza",
    titulo: "Torres del Paine y Mendoza",
    bajada: "Caminatas al pie de las torres y cosecha en el Valle de Uco.",
    tipo: "VIAJE",
    portada: M["x-paine"],
    noches: 9,
    destinos: ["Torres del Paine", "Mendoza"],
    precioDesde: 4320,
    destacada: true,
  },
  {
    id: "x-vietnam",
    slug: "vietnam-en-tren",
    titulo: "Vietnam en tren, de Hanói a Saigón",
    bajada: "Doce noches de norte a sur, con la bahía de Ha Long en el medio.",
    tipo: "TREN",
    portada: M["x-vietnam"],
    noches: 12,
    destinos: ["Hanói", "Ha Long", "Hoi An", "Saigón"],
    precioDesde: null,
    destacada: true,
  },
];

const especialistas: EspecialistaVista[] = [
  demo.especialista!,
  {
    id: "e-tomas",
    nombre: "Tomás Vidal",
    region: "África",
    frase: "Hice once safaris y todavía me emociona el primer elefante de cada viaje.",
    idiomas: ["Español", "Inglés"],
    retrato: M["e-tomas"],
    whatsapp: "+598 99 612 450",
    email: "tomas.vidal@traveloz.com.uy",
    telefono: "",
  },
  {
    id: "e-martina",
    nombre: "Martina Acosta",
    region: "Europa",
    frase: "Las islas griegas chicas son las mejores. Te digo cuáles y en qué mes.",
    idiomas: ["Español", "Italiano", "Inglés"],
    retrato: M["e-martina"],
    whatsapp: "+598 98 275 031",
    email: "martina.acosta@traveloz.com.uy",
    telefono: "",
  },
  {
    id: "e-joaquin",
    nombre: "Joaquín Pereyra",
    region: "América del Sur",
    frase: "Crucé la Patagonia en auto tres veces. Conozco cada estancia del camino.",
    idiomas: ["Español", "Portugués"],
    retrato: M["e-joaquin"],
    whatsapp: "+598 91 840 266",
    email: "joaquin.pereyra@traveloz.com.uy",
    telefono: "",
  },
];

const testimonios: TestimonioVista[] = [
  {
    id: "t1",
    nombre: "Carolina y Martín",
    lugar: "Montevideo",
    viaje: "Filipinas, enero 2026",
    cita: "Volvimos de El Nido con la sensación de haber tenido el mar para nosotros solos. Cada día tenía algo preparado, y nunca se sintió armado.",
    foto: M["t-nido"],
  },
  {
    id: "t2",
    nombre: "Familia Olivera",
    lugar: "Punta del Este",
    viaje: "Tanzania, agosto 2025",
    cita: "Los chicos todavía hablan del campamento. Tomás pensó en todo, hasta en la hora de la siesta.",
    foto: M["t-safari"],
  },
  {
    id: "t3",
    nombre: "Andrés Laborde",
    lugar: "Colonia",
    viaje: "Japón, noviembre 2025",
    cita: "Llegamos a Kioto en la semana justa de los arces. No fue suerte: Lucía lo tenía calculado.",
    foto: M["t-japon"],
  },
];

const aliados: AliadoVista[] = [
  ["Cala Blanca Hotels", "Hoteles", "Hoteles boutique en el Mediterráneo, con pocas habitaciones y vista al mar."],
  ["Andes Wilderness", "Operador", "Expediciones en la Patagonia con guías baqueanos y refugios propios."],
  ["Kiri Safaris", "Campamentos", "Campamentos móviles en el Serengeti que siguen la migración."],
  ["Ryokan Hanaya", "Hoteles", "Posadas tradicionales en Hakone y Kioto, con baños termales privados."],
  ["Bangka Blue", "Navegación", "Embarcaciones privadas entre las islas de Palawan."],
  ["Bodegas del Cuyo", "Vinos", "Visitas de cosecha y almuerzos en viñedos del Valle de Uco."],
].map(([nombre, tipo, descripcion], i) => ({
  id: `a${i + 1}`,
  nombre,
  tipo,
  descripcion,
  url: "",
  logo: null,
}));

const preguntas: PreguntaVista[] = [
  [
    "¿Cuánto tiempo antes conviene empezar a planear?",
    "<p>Entre seis y nueve meses para viajes largos o en temporada alta. Para escapadas cortas alcanza con dos o tres meses.</p>",
  ],
  [
    "¿Puedo cambiar un itinerario publicado?",
    "<p>Sí. Cada experiencia es un punto de partida: tu especialista ajusta noches, hoteles y ritmo a tu medida.</p>",
  ],
  ["¿Los precios incluyen los vuelos internacionales?", "<p>No, salvo que la propuesta lo diga. Los vuelos internos y los traslados sí están incluidos.</p>"],
  ["¿Qué pasa si tengo que cancelar?", "<p>Depende de cuándo avises. Las condiciones están en los <a href=\"/terminos\">términos y condiciones</a>.</p>"],
  ["¿Viajan con grupos?", "<p>No. Cada viaje es privado: solo vos y quienes elijas.</p>"],
].map(([pregunta, respuesta], i) => ({ id: `q${i + 1}`, pregunta, respuesta, categoria: "General" }));

const articulos: ArticuloCardVista[] = [
  {
    id: "j1",
    slug: "kioto-en-otono",
    tipo: "GUIA",
    titulo: "Kioto en otoño, templo por templo",
    bajada: "Cuándo ir, a qué hora llegar y dónde comer después de cada templo.",
    minutos: 8,
    portada: M["j-kioto"],
    publicadoEn: "2026-09-22T12:00:00.000Z",
  },
  {
    id: "j2",
    slug: "una-noche-sin-luces",
    tipo: "RELATO",
    titulo: "Una noche en un campamento sin luces",
    bajada: "",
    minutos: 5,
    portada: M["j-campamento"],
    publicadoEn: "2026-09-10T12:00:00.000Z",
  },
  {
    id: "j3",
    slug: "que-llevar-a-un-safari",
    tipo: "CONSEJOS",
    titulo: "Qué llevar a un safari (y qué dejar en casa)",
    bajada: "",
    minutos: 4,
    portada: M["j-safari"],
    publicadoEn: "2026-08-28T12:00:00.000Z",
  },
];

const mapas: MapasPagina = {
  medios: new Map(lista.map((m) => [m.id, m])),
  destinos,
  experiencias,
  especialistas,
  testimonios,
  aliados,
  preguntas,
  articulos,
};

const mapasVacios: MapasPagina = {
  medios: new Map(),
  destinos: [],
  experiencias: [],
  especialistas: [],
  testimonios: [],
  aliados: [],
  preguntas: [],
  articulos: [],
};

const ref = (medioId: string) => ({ medioId });

function pagina(slug: string, titulo: string, bloques: unknown[]): PaginaVista {
  return armarVistaPagina(
    { slug, titulo, actualizadaEn: ACTUALIZADA },
    { version: 1, bloques: bloques.map((b) => bloqueSchema.parse(b)) },
    mapas,
    { incluirOcultos: true },
  );
}

// ── Inicio ──────────────────────────────────────────────────────────────────

export const demoInicio = pagina("inicio", "Inicio", [
  {
    id: "portada",
    tipo: "portada",
    eyebrow: "Viajes de autor",
    titulo: "Viajes que se recuerdan toda la vida.",
    bajada: "Itinerarios para pocos, armados por especialistas que recorrieron cada destino.",
    medio: ref("p-portada"),
    ctaTexto: "Ver experiencias",
    ctaHref: "/experiencias",
  },
  {
    id: "manifiesto",
    tipo: "manifiesto",
    eyebrow: "Manifiesto",
    texto: "<p>No armamos paquetes. Diseñamos viajes para pocos, con los hoteles, los guías y los momentos que hacen la diferencia.</p>",
    firma: "Cada itinerario nace de una conversación.",
  },
  { id: "destinos", tipo: "destinos", titulo: "Seis maneras de mirar el mundo" },
  {
    id: "experiencias",
    tipo: "experiencias",
    titulo: "Viajes para este año",
    bajada: "Una selección de lo que más nos piden. Todo se ajusta a tu medida.",
  },
  {
    id: "estilos",
    tipo: "estilos",
    eyebrow: "Según cómo viajás",
    titulo: "Para cada ocasión, un viaje",
    items: [
      ["Luna de miel", "Islas, cenas en la arena y nadie más alrededor.", "s-luna"],
      ["En familia", "Ritmos tranquilos y actividades para todas las edades.", "s-familia"],
      ["Safari", "Campamentos chicos y guías que leen el monte.", "s-safari"],
      ["Bienestar", "Termas, ryokanes y retiros frente al mar.", "s-bienestar"],
      ["Gastronomía", "Mercados, bodegas y mesas de cocineros locales.", "s-gastro"],
    ].map(([titulo, texto, m], i) => ({ id: `s${i}`, titulo, texto, medio: ref(m), href: `/experiencias?estilo=${i}` })),
  },
  {
    id: "cifras",
    tipo: "cifras",
    oculto: true,
    titulo: "Collection en números",
    items: [
      { id: "c1", valor: "18", etiqueta: "Años armando viajes" },
      { id: "c2", valor: "41", etiqueta: "Países recorridos" },
      { id: "c3", valor: "2.300", etiqueta: "Viajeros" },
    ],
  },
  { id: "testimonios", tipo: "testimonios", titulo: "Historias de viajeros" },
  { id: "journal", tipo: "journal", eyebrow: "Journal", titulo: "Para leer antes de salir" },
  { id: "preguntas", tipo: "preguntas", titulo: "Lo que nos preguntan antes de viajar" },
  {
    id: "newsletter",
    tipo: "newsletter",
    titulo: "Cuatro cartas al año, con viajes que todavía no publicamos.",
    texto: "Destinos nuevos, temporadas que conviene reservar temprano y algún relato.",
  },
  {
    id: "cierre",
    tipo: "cierre",
    eyebrow: "Viaje a medida",
    titulo: "¿No encontraste tu viaje? Lo diseñamos desde cero.",
    texto: "Contanos qué te imaginás. Un especialista arma la primera propuesta en pocos días.",
    ctaTexto: "Empezar la conversación",
    ctaHref: "/contacto",
    medio: ref("p-cierre"),
  },
]);

// ── Nosotros ────────────────────────────────────────────────────────────────

export const demoNosotros = pagina("nosotros", "Nosotros", [
  {
    id: "portada",
    tipo: "portada",
    eyebrow: "Nosotros",
    titulo: "Una persona, de principio a fin.",
    bajada: "Collection es la línea de viajes a medida de Traveloz, desde Montevideo.",
    medio: ref("p-nosotros"),
  },
  {
    id: "historia",
    tipo: "texto",
    ancho: "ancho",
    titulo: "Una agencia uruguaya con oficio de viaje",
    texto:
      "<p>Traveloz arma viajes desde 2008. Collection nació de una pregunta que nos hacían cada vez más: <em>¿me lo pueden armar a mi medida?</em></p>" +
      "<p>Hoy es un equipo chico de especialistas. Cada uno conoce su región porque la recorre: duerme en los hoteles que recomienda, prueba las excursiones y vuelve con fotos propias.</p>" +
      "<h3>Cómo trabajamos</h3><ul><li>Una primera conversación, sin compromiso.</li><li>Una propuesta con hoteles y ritmo pensados para vos.</li><li>Acompañamiento durante todo el viaje, por WhatsApp.</li></ul>",
  },
  {
    id: "oficina",
    tipo: "imagenTexto",
    lado: "izquierda",
    titulo: "Viajamos antes que vos",
    texto:
      "<p>Cada año visitamos los destinos que vendemos. Así sabemos qué habitación pedir, a qué hora llegar al templo y qué restaurante ya no vale la pena.</p>",
    medio: ref("p-oficina"),
  },
  {
    id: "cifras",
    tipo: "cifras",
    items: [
      { id: "c1", valor: "18", etiqueta: "Años armando viajes" },
      { id: "c2", valor: "41", etiqueta: "Países recorridos" },
      { id: "c3", valor: "2.300", etiqueta: "Viajeros" },
      { id: "c4", valor: "6", etiqueta: "Especialistas" },
    ],
  },
  {
    id: "cita",
    tipo: "cita",
    texto: "El mejor viaje es el que se parece a quien lo hace.",
    autor: "Amparo, directora de Collection",
    medio: ref("p-cita"),
  },
  { id: "especialistas", tipo: "especialistas", titulo: "Quienes arman cada viaje", bajada: "Elegís con quién hablar y esa persona te acompaña hasta la vuelta." },
  { id: "aliados", tipo: "aliados", eyebrow: "Aliados", titulo: "Con quiénes viajamos", bajada: "Hoteles, guías y operadores que conocemos en persona." },
  { id: "galeria", tipo: "galeria", titulo: "Detrás de cada viaje", medios: ["g1", "g2", "g3", "g4", "g5", "g6"].map(ref) },
  {
    id: "ruta",
    tipo: "imagenTexto",
    lado: "derecha",
    titulo: "Y cuando estás de viaje, seguimos ahí",
    texto: "<p>Tu especialista está a un mensaje de distancia, con el horario de tu destino.</p>",
    medio: ref("p-ruta"),
  },
  {
    id: "cierre",
    tipo: "cierre",
    titulo: "Empecemos por una conversación.",
    texto: "Contanos cuándo querés viajar y con quién.",
    ctaTexto: "Escribinos",
    ctaHref: "/contacto",
    medio: ref("p-cierre"),
  },
]);

// ── Términos ────────────────────────────────────────────────────────────────

export const demoTerminos = pagina("terminos", "Términos y condiciones", [
  {
    id: "texto",
    tipo: "texto",
    texto:
      "<p>Estos términos explican cómo trabajamos con vos desde la primera consulta hasta que volvés a casa. Si algo no queda claro, tu especialista te lo explica.</p>" +
      "<h3>Quiénes somos</h3><p>Traveloz Collection es la línea de viajes a medida de Traveloz, agencia habilitada por el Ministerio de Turismo del Uruguay.</p>" +
      "<h3>Cómo armamos tu viaje</h3><p>Cada propuesta se arma a partir de una conversación. La propuesta tiene validez de siete días: después, los precios y la disponibilidad pueden cambiar.</p>" +
      "<h3>Valores y pagos</h3><p>Todos los valores se expresan en dólares estadounidenses (USD), por persona en base doble, salvo que la propuesta indique otra cosa.</p>" +
      "<ul><li>La reserva se confirma con una seña del 30 %.</li><li>El saldo se abona 45 días antes de la salida.</li><li>Aceptamos transferencia y tarjeta de crédito internacional.</li></ul>" +
      "<h3>Cambios y cancelaciones</h3><table><thead><tr><th>Aviso de cancelación</th><th>Se retiene</th></tr></thead><tbody><tr><td>Más de 60 días antes</td><td>Solo la seña</td></tr><tr><td>Entre 59 y 30 días</td><td>50 % del total</td></tr><tr><td>Menos de 30 días</td><td>100 % del total</td></tr></tbody></table>" +
      "<h3>Documentación</h3><p>Cada pasajero es responsable de tener su pasaporte vigente, las visas y las vacunas que pida cada destino. Te avisamos cuáles son al confirmar.</p>" +
      "<h3>Contacto</h3><p>Escribinos a <a href=\"mailto:collection@traveloz.com.uy\">collection@traveloz.com.uy</a> o a tu especialista por WhatsApp.</p>",
  },
]);

// ── Artículo ────────────────────────────────────────────────────────────────

export const demoArticulo: ArticuloVista = {
  ...articulos[0],
  cuerpo:
    "<p>Kioto tiene más de mil templos y en noviembre parece que todos se ponen de acuerdo para estar rojos al mismo tiempo. La tentación es querer verlos todos. El secreto es elegir pocos y llegar temprano.</p>" +
    "<p>Esta guía sigue el orden en que los recorrería Lucía, nuestra especialista en Asia, que fue cada otoño de los últimos seis años.</p>" +
    "<h2>Tofuku-ji, antes de las ocho</h2>" +
    "<p>El puente Tsutenkyo es la foto que todos buscan. A las siete y media hay poca gente y la luz entra de costado entre los arces. A las diez, la fila da la vuelta a la manzana.</p>" +
    "<blockquote><p>En Kioto, la hora a la que llegás importa más que el templo que elegís.</p></blockquote>" +
    "<h2>Eikan-do, al atardecer</h2>" +
    "<p>Abre de noche durante la temporada de arces, con los jardines iluminados. Conviene reservar la entrada nocturna con una semana de anticipación.</p>" +
    "<ul><li>Llevá calzado fácil de sacar: en casi todos los templos se entra descalzo.</li><li>La tarjeta ICOCA sirve para buses, trenes y la mayoría de los kioscos.</li><li>Los lunes cierran varios museos, pero no los templos.</li></ul>" +
    "<h2>Dónde comer después</h2>" +
    "<p>Cerca de Nanzen-ji hay casas de tofu que sirven el mismo menú hace más de un siglo. Pedí el yudofu y sentate del lado del jardín.</p>",
  galeria: [M["j-kioto"], M["x-kioto"], M["g6"], M["t-japon"], M["s-bienestar"], M["g3"]],
  autor: demo.especialista,
  experiencias: experiencias.filter((e) => ["x-kioto", "x-vietnam", "x-filipinas"].includes(e.id)),
};

// ── Vacías: todos los bloques sin contenido, para ver los fantasmas ────────

export function demoVacia(slug: string, titulo: string): PaginaVista {
  return armarVistaPagina(
    { slug, titulo, actualizadaEn: null },
    { version: 1, bloques: TIPOS_BLOQUE.map((t) => nuevoBloque(t.tipo, t.tipo)) },
    mapasVacios,
  );
}

export function demoLegalVacia(): PaginaVista {
  return armarVistaPagina(
    { slug: "terminos", titulo: "Términos y condiciones", actualizadaEn: null },
    { version: 1, bloques: [nuevoBloque("texto", "texto")] },
    mapasVacios,
  );
}

export function demoArticuloVacio(): ArticuloVista {
  return {
    id: "vacio",
    slug: "",
    tipo: "GUIA",
    titulo: "",
    bajada: "",
    minutos: 1,
    portada: null,
    publicadoEn: null,
    cuerpo: "",
    galeria: [],
    autor: null,
    experiencias: [],
  };
}

// Para los editores de la ruta de desarrollo (páginas y journal).
export { mapas as mapasDemo, articulos as articulosDemo, lista as mediosDemo };
