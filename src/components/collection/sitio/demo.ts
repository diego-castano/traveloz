// Experiencia de muestra para maquetar y probar la página sin base de datos.
// Textos de docs/collection/contexto/05-contenido-de-ejemplo.md (no aprobados
// por el cliente). Los medios no tienen url: la página dibuja su color.

import type { ExperienciaVista, MedioVista } from "@/lib/collection/experiencia/contenido";

function medio(
  id: string,
  color: string,
  ancho: number,
  alto: number,
  alt: string,
  leyenda = "",
  credito = "",
  extra: Partial<MedioVista> = {},
): MedioVista {
  return {
    id,
    tipo: "FOTO",
    url: "",
    variantes: [],
    ancho,
    alto,
    colorDominante: color,
    placeholder: null,
    alt,
    leyenda,
    credito,
    focoX: 0.5,
    focoY: 0.5,
    posterUrl: null,
    duracion: null,
    ...extra,
  };
}

const M = {
  portada: medio("m-portada", "#3E7C86", 2400, 1600, "Lagunas de Bacuit vistas desde una bangka, El Nido"),
  manila: medio("m-manila", "#8A6B52", 1600, 2000, "Murallas de Intramuros a primera hora, Manila"),
  elnido: medio("m-elnido", "#2F6E73", 1600, 2000, "Acantilados de piedra caliza sobre el agua turquesa"),
  boracay: medio("m-boracay", "#C9A57A", 1600, 2000, "Velas al atardecer frente a White Beach"),
  imperdible: medio("m-imp", "#4E7F7A", 1600, 2000, "Embarcación privada entre las lagunas"),
  pen1: medio("m-pen1", "#7B6A58", 2000, 1400, "Lobby de The Peninsula Manila"),
  pen2: medio("m-pen2", "#9C8770", 1200, 1200, "Suite con vista a Makati"),
  pen3: medio("m-pen3", "#5E5A54", 1200, 1200, "Pileta del hotel"),
  pan1: medio("m-pan1", "#3B7D7A", 2000, 1400, "Villa frente al mar en Pangulasian"),
  pan2: medio("m-pan2", "#C4B394", 1200, 1200, "Playa privada de la isla"),
  pan3: medio("m-pan3", "#2E5F66", 1200, 1200, "Deck al atardecer"),
  nay1: medio("m-nay1", "#B79C78", 2000, 1400, "Casa de playa en Nay Palad"),
  nay2: medio("m-nay2", "#6D8B74", 1200, 1200, "Jardín tropical"),
  retrato: medio("m-lucia", "#8E7F74", 800, 1000, "Lucía Fernández, especialista en Asia"),
  video: medio("m-video", "#28545A", 1920, 1080, "Un día navegando por Bacuit", "", "", {
    tipo: "VIDEO",
    duracion: 134,
  }),
};

const galeria: ExperienciaVista["galeria"] = [
  ["g1", "#3E7C86", 2000, 1333, "Laguna grande de Bacuit", "El Nido · Laguna grande", "Ana Ruiz"],
  ["g2", "#C9A57A", 1200, 1600, "Velero al atardecer", "Boracay · Velas en White Beach", ""],
  ["g3", "#8A6B52", 1200, 1500, "Calles de Intramuros", "Manila · Intramuros", "Ana Ruiz"],
  ["g4", "#2F6E73", 1600, 1067, "Kayak en una laguna escondida", "El Nido · Kayak al amanecer", ""],
  ["g5", "#D9B48C", 1200, 1200, "Mercado de Salcedo", "Manila · Mercado de Salcedo", ""],
  ["g6", "#4E7F7A", 1200, 1700, "Snorkel en Apo Reef", "Apo Reef · Arrecife", "Tomás Vidal"],
  ["g7", "#B79C78", 1800, 1200, "Playa de Nay Palad", "Siargao · Playa privada", ""],
  ["g8", "#5C7A86", 1200, 1500, "Bangka tradicional", "El Nido · Bangka", ""],
  ["g9", "#A88466", 2000, 1250, "Cena frente al mar", "Boracay · Cena en la arena", "Tomás Vidal"],
].map(([id, c, w, h, alt, ley, cred]) => ({
  ...medio(id as string, c as string, w as number, h as number, alt as string, ley as string, cred as string),
  leyendaUso: ley as string,
}));

export const demo: ExperienciaVista = {
  titulo: "Filipinas: Manila, El Nido y Boracay",
  bajada: "Tres islas, dos mares y una idea distinta de la calma.",
  tipo: "VIAJE",
  slug: "filipinas-manila-el-nido-boracay",
  destinos: [{ id: "d-oriente", nombre: "Misterios de Oriente", slug: "misterios-de-oriente" }],
  portada: M.portada,
  noches: 11,
  mostrarPrecio: true,
  precioDesde: 5099,
  frase: "Filipinas no se recorre: se navega.",
  intro:
    "<p>Entre acantilados de piedra caliza y lagunas que cambian de color con la marea, este viaje alterna la energía de Manila con dos islas que se disfrutan sin apuro.</p>" +
    "<p>Once noches pensadas para viajar liviano: vuelos internos ya resueltos, traslados privados en cada escala y hoteles chicos, elegidos uno por uno por cómo se siente despertarse ahí. Empezás en la capital, con el casco antiguo y la mejor comida callejera del país; seguís en <strong>El Nido</strong>, donde el día lo marca la lancha; y cerrás en <strong>Boracay</strong>, con los pies en la arena.</p>" +
    "<p>Es un viaje para quien ya conoce el sudeste asiático y quiere algo más quieto, o para una primera vez que no quiere sentirse turista.</p>",
  mejorEpoca: "Dic a Abr",
  imperdibles: [
    ["i1", "Navegar entre las lagunas de Bacuit en una embarcación privada."],
    ["i2", "Ver el atardecer desde un velero en White Beach."],
    ["i3", "Comer en el mercado de Salcedo con un cocinero local."],
    ["i4", "Dormir frente al mar en un resort de ocho habitaciones."],
    ["i5", "Bucear en Apo Reef, uno de los arrecifes más grandes de Asia."],
  ].map(([id, titulo], i) => ({ id, titulo, texto: "", medio: i === 0 ? M.imperdible : null })),
  tramos: [
    {
      id: "t1",
      ciudadNombre: "Manila",
      paisNombre: "Filipinas",
      noches: 2,
      relato:
        "<p>La capital se disfruta en capas: el casco antiguo de Intramuros a primera hora, cuando todavía está fresco, y los bares de Poblacion cuando cae el sol.</p><p>Es la puerta de entrada y el primer contraste del viaje. Un cocinero local te lleva por el mercado de Salcedo el sábado a la mañana, puesto por puesto.</p>",
      medio: M.manila,
      hotel: {
        nombre: "The Peninsula Manila",
        texto:
          "<p>Lo elegimos por la calma: en medio de Makati, el lobby sigue siendo el punto de encuentro de la ciudad y las habitaciones dan a un jardín que no parece de Manila.</p>",
        destacados: ["Suite Deluxe con vista a Makati", "Traslado privado desde el aeropuerto", "Desayuno en The Lobby"],
        medios: [M.pen1, M.pen2, M.pen3],
        fotosCatalogo: [],
      },
    },
    {
      id: "t2",
      ciudadNombre: "El Nido",
      paisNombre: "Filipinas",
      noches: 5,
      relato:
        "<p>Acá el día empieza cuando sale la lancha. Las lagunas de Bacuit aparecen una detrás de otra, cada una más silenciosa, y al volver el hotel se siente como una casa con vista al mar.</p><p>Hay un día entero libre, sin plan, y una salida a una isla privada para almorzar sobre la arena.</p>",
      medio: M.elnido,
      hotel: {
        nombre: "Pangulasian Island Resort",
        texto:
          "<p>Lo elegimos porque es la única isla con playa propia dentro de Bacuit, y porque al atardecer no hay nadie más en el agua.</p>",
        destacados: ["Villa frente al mar con pileta", "Lancha privada a las lagunas", "Mayordomo durante la estadía"],
        medios: [M.pan1, M.pan2, M.pan3],
        fotosCatalogo: [],
      },
    },
    {
      id: "t3",
      ciudadNombre: "Boracay",
      paisNombre: "Filipinas",
      noches: 4,
      relato:
        "<p>Cuatro kilómetros de arena blanca que a la tarde se llenan de velas. Es el cierre del viaje: nada que hacer más que caminar, comer bien y mirar el atardecer.</p>",
      medio: M.boracay,
      hotel: {
        nombre: "Nay Palad Hideaway",
        texto: "<p>Ocho casas de madera entre palmeras, sin carta ni horarios: se come lo que salió del mar ese día.</p>",
        destacados: ["Casa de playa con dos ambientes", "Pensión completa"],
        medios: [M.nay1, M.nay2],
        fotosCatalogo: [],
      },
    },
  ],
  dias: [
    [1, 1, "Manila", "Llegada y traslado privado", "<p>Te esperamos en el aeropuerto y vas directo al hotel. La tarde es para descansar del vuelo.</p>", []],
    [2, 2, "Manila", "Intramuros y el mercado de Salcedo", "<p>Caminata temprana por el casco antiguo con un guía historiador y almuerzo en el mercado con un cocinero local.</p>", [galeria[2], galeria[4]]],
    [3, 3, "El Nido", "Vuelo a El Nido", "<p>Vuelo corto a Palawan y lancha privada hasta la isla. Atardecer en el deck de la villa.</p>", [galeria[7]]],
    [4, 5, "El Nido", "Lagunas de Bacuit", "<p>Dos días de navegación privada por las lagunas grande y chica, la playa secreta y el islote de Shimizu, con almuerzo a bordo.</p>", [galeria[0], galeria[3], galeria[7]]],
    [6, 7, "El Nido", "Día libre e isla privada", "<p>Un día sin plan y otro con almuerzo sobre la arena en una isla para vos solo.</p>", []],
    [8, 8, "Boracay", "Traslado a Boracay", "<p>Vuelo vía Manila y traslado privado a la casa de playa.</p>", []],
    [9, 10, "Boracay", "Velero al atardecer y día de spa", "<p>Paseo en paraw, el velero tradicional, al caer el sol, y un día entero de spa frente al mar.</p>", [galeria[1], galeria[8]]],
    [11, 12, "Boracay", "Regreso", "<p>Última mañana en la playa y traslado al aeropuerto para el vuelo de regreso.</p>", []],
  ].map(([desde, hasta, ciudad, titulo, texto, medios], i) => {
    const hoteles: Record<string, string> = {
      Manila: "The Peninsula Manila",
      "El Nido": "Pangulasian Island Resort",
      Boracay: "Nay Palad Hideaway",
    };
    return {
      id: `d${i + 1}`,
      desde: desde as number,
      hasta: hasta as number,
      titulo: titulo as string,
      texto: texto as string,
      ciudadNombre: ciudad as string,
      hotelNombre: hoteles[ciudad as string],
      medios: medios as MedioVista[],
    };
  }),
  galeria,
  video: { medio: M.video, titulo: "Bacuit, un día en el agua" },
  incluye: [
    "Vuelos internos entre Manila, El Nido y Boracay",
    "Traslados privados en cada destino",
    "Alojamiento con desayuno",
    "Navegaciones privadas por Bacuit",
    "Asistencia en destino, las 24 horas",
  ],
  noIncluye: ["Vuelos internacionales", "Almuerzos y cenas no mencionados", "Gastos personales"],
  info: {
    idioma: "Inglés y filipino. Todos los guías hablan inglés; en Manila, algunos español.",
    moneda: "Peso filipino. Tarjetas en hoteles; efectivo para mercados y propinas.",
    visado: "Sin visado hasta 30 días. Para pasaporte uruguayo. Validar antes de viajar.",
    comoLlegar: "Vía Doha o Estambul. Desde Montevideo, con una escala larga en Medio Oriente o Europa.",
    salud: "Sin vacunas obligatorias. Recomendamos seguro de viaje con cobertura de buceo.",
    clima: "Tropical todo el año. De diciembre a abril, cielo limpio y mar calmo; de junio a octubre, lluvias.",
  },
  precioNota: "Por persona, en base doble, sujeto a disponibilidad.",
  especialista: {
    id: "e-lucia",
    nombre: "Lucía Fernández",
    region: "Asia",
    frase: "Estuve en El Nido en marzo. Te puedo contar qué lancha tomar y a qué hora llegar a cada laguna.",
    idiomas: ["Español", "Inglés"],
    retrato: M.retrato,
    whatsapp: "+598 94 318 207",
    email: "lucia.fernandez@traveloz.com.uy",
    telefono: "+598 2903 1187",
  },
};

/** Un borrador recién empezado: casi todo vacío, para ver los fantasmas. */
export function demoVacia(): ExperienciaVista {
  return {
    titulo: "",
    bajada: "",
    tipo: "VIAJE",
    slug: "",
    destinos: [],
    portada: null,
    noches: 3,
    mostrarPrecio: false,
    precioDesde: null,
    especialista: null,
    frase: "",
    intro: "",
    mejorEpoca: "",
    imperdibles: [],
    tramos: [
      { id: "t1", ciudadNombre: "El Nido", paisNombre: "Filipinas", noches: 3, relato: "", medio: null, hotel: null },
    ],
    dias: [],
    galeria: [],
    video: null,
    incluye: [],
    noIncluye: [],
    info: { idioma: "", moneda: "", visado: "", comoLlegar: "", salud: "", clima: "" },
    precioNota: "",
  };
}
