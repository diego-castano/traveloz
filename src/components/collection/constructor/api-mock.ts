"use client";

// Adaptador de prueba del constructor: todo en memoria, con demora falsa.
// Lo usa solo la ruta de desarrollo /dev/collection/constructor, para poder
// ver y probar el constructor sin login ni base de datos.

import {
  contenidoVacio,
  type BorradorExperiencia,
  type EspecialistaVista,
  type EstadoExperiencia,
  type FotoCatalogo,
  type MedioVista,
} from "@/lib/collection/experiencia/contenido";
import type { ExperienciaDetalle } from "@/actions/collection/experiencias.actions";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { demo } from "../sitio/demo";
import type { ApiConstructor } from "./api";
import type { Aspecto, Recorte } from "@/lib/collection/recortes";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.5));
const ok = <T,>(data: T) => ({ ok: true as const, data });

function medioColor(id: string, color: string, ancho: number, alto: number, alt: string): MedioVista {
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
    leyenda: "",
    credito: "",
    focoX: 0.5,
    focoY: 0.5,
    posterUrl: null,
    duracion: null,
  };
}

function fotoSvg(color: string): FotoCatalogo {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#32373B"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt: "Foto del catálogo" };
}

function dtoDe(m: MedioVista, i: number): ColMedioDto {
  return {
    id: m.id,
    tipo: m.tipo,
    nombre: `${m.alt.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || m.id}.jpg`,
    key: `collection/originales/${m.id}.jpg`,
    url: m.url,
    contentType: m.tipo === "VIDEO" ? "video/mp4" : "image/jpeg",
    peso: 1_400_000 + i * 37_000,
    ancho: m.ancho,
    alto: m.alto,
    duracion: m.duracion,
    colorDominante: m.colorDominante,
    placeholder: m.placeholder,
    variantes: m.variantes,
    posterUrl: m.posterUrl,
    alt: m.alt,
    leyenda: m.leyenda,
    credito: m.credito,
    focoX: m.focoX,
    focoY: m.focoY,
    recortes: m.recortes ?? {},
    etiquetas: [],
    subidoPorId: null,
    createdAt: new Date(Date.UTC(2026, 9, 1, 12) - i * 3_600_000).toISOString(),
  };
}

const EXTRA: [string, number, number, string][] = [
  ["#5D7F8C", 1600, 1067, "Templo de madera entre la niebla, Kioto"],
  ["#A3876A", 1200, 1600, "Tren entre arrozales al atardecer"],
  ["#2E5A63", 1600, 1067, "Fiordo en calma, Noruega"],
  ["#C2A27C", 1200, 1500, "Dunas al amanecer, Wadi Rum"],
  ["#6E7F62", 1600, 1067, "Viñedos en terrazas, Douro"],
  ["#8F6F5A", 1200, 1200, "Mercado de especias, Marrakech"],
  ["#3F6D7A", 1600, 900, "Lancha sobre aguas turquesa"],
  ["#B8957A", 1200, 1600, "Puerta azul en Chefchaouen"],
  ["#4C6B5E", 1600, 1067, "Selva y cascada, Costa Rica"],
  ["#9C8B78", 1600, 1067, "Lobby de hotel con luz de tarde"],
  ["#55707A", 1200, 1500, "Faro sobre acantilados"],
  ["#A6785E", 1600, 1067, "Cena en una terraza de piedra"],
];

/** Lo que sale de la demo de Filipinas: borrador, mapas y biblioteca. */
export function datosDemo(vacia = false): { detalle: ExperienciaDetalle; biblioteca: MedioVista[] } {
  const v = demo;
  const medios = new Map<string, MedioVista>();
  const add = (m: MedioVista | null | undefined) => m && medios.set(m.id, m);
  add(v.portada);
  v.imperdibles.forEach((i) => add(i.medio));
  v.tramos.forEach((t) => {
    add(t.medio);
    t.hotel?.medios.forEach(add);
  });
  v.dias.forEach((d) => d.medios.forEach(add));
  v.galeria.forEach(add);
  add(v.video?.medio);
  add(v.especialista?.retrato);
  EXTRA.forEach(([c, w, h, alt], i) => add(medioColor(`m-extra-${i + 1}`, c, w, h, alt)));

  const ciudadIds: Record<string, string> = { Manila: "c-manila", "El Nido": "c-elnido", Boracay: "c-boracay" };
  const ref = (m: MedioVista | null | undefined) => (m ? { medioId: m.id } : null);

  const borrador: BorradorExperiencia = vacia
    ? {
        campos: {
          titulo: "",
          bajada: "",
          slug: "",
          tipo: "VIAJE",
          destinoIds: [],
          especialistaId: null,
          proveedorId: null,
          portadaId: null,
          destacada: false,
          mostrarPrecio: false,
          precioDesde: null,
          seoTitulo: "",
          seoDescripcion: "",
          ogImagenId: null,
        },
        contenido: contenidoVacio(),
      }
    : {
        campos: {
          titulo: v.titulo,
          bajada: v.bajada,
          slug: v.slug,
          tipo: v.tipo,
          destinoIds: v.destinos.map((d) => d.id),
          especialistaId: v.especialista?.id ?? null,
          proveedorId: "p-2",
          portadaId: v.portada?.id ?? null,
          destacada: true,
          mostrarPrecio: v.mostrarPrecio,
          precioDesde: v.precioDesde,
          seoTitulo: "Filipinas en 11 noches: Manila, El Nido y Boracay",
          seoDescripcion: "",
          ogImagenId: null,
        },
        contenido: {
          version: 1,
          frase: v.frase,
          intro: v.intro,
          mejorEpoca: v.mejorEpoca,
          imperdibles: v.imperdibles.map((i) => ({ id: i.id, titulo: i.titulo, texto: i.texto, medio: ref(i.medio) })),
          tramos: v.tramos.map((t) => ({
            id: t.id,
            ciudadId: ciudadIds[t.ciudadNombre] ?? null,
            ciudadNombre: t.ciudadNombre,
            paisNombre: t.paisNombre,
            noches: t.noches,
            relato: t.relato,
            medio: ref(t.medio),
            hotel: t.hotel
              ? {
                  alojamientoId: t.ciudadNombre === "Boracay" ? "h-nay" : null,
                  nombre: t.hotel.nombre,
                  texto: t.hotel.texto,
                  destacados: t.hotel.destacados,
                  medios: t.ciudadNombre === "Boracay" ? [] : t.hotel.medios.map((m) => ({ medioId: m.id })),
                }
              : null,
          })),
          dias: v.dias.map((d) => ({
            id: d.id,
            desde: d.desde,
            hasta: d.hasta,
            tramoId: v.tramos.find((t) => t.ciudadNombre === d.ciudadNombre)?.id ?? null,
            titulo: d.titulo,
            texto: d.texto,
            medios: d.medios.map((m) => ({ medioId: m.id })),
          })),
          galeria: v.galeria.map((m) => ({ medioId: m.id })),
          video: v.video ? { medioId: v.video.medio.id, titulo: v.video.titulo } : null,
          incluye: v.incluye,
          noIncluye: v.noIncluye,
          info: v.info,
          precioNota: v.precioNota,
        },
      };

  const especialistas: EspecialistaVista[] = [
    ...(v.especialista ? [v.especialista] : []),
    {
      id: "e-mateo",
      nombre: "Mateo Quintana",
      region: "Europa y Medio Oriente",
      frase: "",
      idiomas: ["Español", "Italiano"],
      retrato: medioColor("m-mateo", "#6F7D80", 800, 1000, "Mateo Quintana"),
      whatsapp: "",
      email: "",
      telefono: "",
    },
    {
      id: "e-ines",
      nombre: "Inés Barreiro",
      region: "África y safaris",
      frase: "",
      idiomas: ["Español", "Inglés"],
      retrato: medioColor("m-ines", "#9A8170", 800, 1000, "Inés Barreiro"),
      whatsapp: "",
      email: "",
      telefono: "",
    },
  ];

  const detalle: ExperienciaDetalle = {
    id: "demo",
    estado: "BORRADOR",
    revision: 7,
    publicadoRevision: null,
    publicadaEn: null,
    borrador,
    mapas: {
      medios: Array.from(medios.values()),
      destinos: [
        { id: "d-oriente", nombre: "Misterios de Oriente", slug: "misterios-de-oriente", estado: "PUBLICADO" },
        { id: "d-seda", nombre: "Ruta de la Seda", slug: "ruta-de-la-seda", estado: "PUBLICADO" },
        { id: "d-medi", nombre: "Mediterráneo íntimo", slug: "mediterraneo-intimo", estado: "BORRADOR" },
        { id: "d-pata", nombre: "Patagonia austral", slug: "patagonia-austral", estado: "PROXIMAMENTE" },
      ],
      especialistas,
      fotosHotel: [["h-nay", [fotoSvg("#B79C78"), fotoSvg("#6D8B74"), fotoSvg("#C9A57A")]]],
    },
    historial: [
      { id: "h3", accion: "guardar", userNombre: "Amparo Ríos", detalle: null, createdAt: new Date(Date.now() - 42 * 60_000).toISOString() },
      { id: "h2", accion: "guardar", userNombre: "Agustina Ferrer", detalle: null, createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
      { id: "h1", accion: "crear", userNombre: "Diego Castaño", detalle: null, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    ],
  };
  return { detalle, biblioteca: Array.from(medios.values()) };
}

const CIUDADES = [
  ["c-manila", "Manila", "Filipinas"],
  ["c-elnido", "El Nido", "Filipinas"],
  ["c-boracay", "Boracay", "Filipinas"],
  ["c-siargao", "Siargao", "Filipinas"],
  ["c-kioto", "Kioto", "Japón"],
  ["c-tokio", "Tokio", "Japón"],
  ["c-bali", "Ubud", "Indonesia"],
  ["c-marrakech", "Marrakech", "Marruecos"],
  ["c-oporto", "Oporto", "Portugal"],
] as const;

const HOTELES = [
  ["h-pen", "The Peninsula Manila", "c-manila", "Manila", 5, "#7B6A58"],
  ["h-shang", "Shangri-La The Fort", "c-manila", "Manila", 5, "#5E5A54"],
  ["h-pan", "Pangulasian Island Resort", "c-elnido", "El Nido", 5, "#3B7D7A"],
  ["h-lagen", "Lagen Island Resort", "c-elnido", "El Nido", 4, "#2E5F66"],
  ["h-nay", "Nay Palad Hideaway", "c-boracay", "Boracay", 5, "#B79C78"],
  ["h-shang-b", "Shangri-La Boracay", "c-boracay", "Boracay", 5, "#C4B394"],
  ["h-hoshi", "Hoshinoya Kyoto", "c-kioto", "Kioto", 5, "#6D8B74"],
] as const;

/** Implementación en memoria del adaptador. Estable: crearla una sola vez. */
export function crearApiMock(biblioteca: MedioVista[], revisionInicial: number): ApiConstructor {
  const store = new Map(biblioteca.map((m) => [m.id, m]));
  let revision = revisionInicial;
  let estado: EstadoExperiencia = "BORRADOR";
  let n = 0;

  return {
    async guardar(_id, input) {
      await esperar(450);
      if (input.revision !== revision) {
        return { ok: false, error: "Alguien más guardó cambios en esta experiencia.", conflicto: true };
      }
      revision += 1;
      return ok({ revision });
    },
    async cambiarEstado(_id, accion) {
      await esperar(500);
      const destino: Record<string, EstadoExperiencia> = {
        "enviar-revision": "EN_REVISION",
        publicar: "PUBLICADA",
        pausar: "PAUSADA",
        archivar: "ARCHIVADA",
        "volver-borrador": "BORRADOR",
      };
      estado = destino[accion] ?? estado;
      return ok({ estado });
    },
    async buscarCiudades(q) {
      await esperar(200);
      const t = q.trim().toLowerCase();
      return ok(
        CIUDADES.filter(([, nombre]) => !t || nombre.toLowerCase().includes(t)).map(([id, nombre, paisNombre]) => ({
          id,
          nombre,
          paisNombre,
        })),
      );
    },
    async buscarHoteles({ q, ciudadId }) {
      await esperar(250);
      const t = q?.trim().toLowerCase();
      return ok(
        HOTELES.filter(([, nombre, ciudad]) => (t ? nombre.toLowerCase().includes(t) : !ciudadId || ciudad === ciudadId)).map(
          ([id, nombre, , ciudadNombre, categoria, color]) => ({
            id,
            nombre,
            ciudadNombre,
            categoria,
            fotos: [fotoSvg(color), fotoSvg("#6D8B74"), fotoSvg("#9C8770")],
          }),
        ),
      );
    },
    async listarMedios({ tipo, q, cursor, take = 36 }) {
      await esperar(300);
      const t = q?.trim().toLowerCase();
      const todos = Array.from(store.values())
        .filter((m) => (!tipo || m.tipo === tipo) && (!t || m.alt.toLowerCase().includes(t)))
        .map(dtoDe);
      const desde = cursor ? todos.findIndex((m) => m.id === cursor) + 1 : 0;
      const items = todos.slice(desde, desde + take);
      return ok({ items, nextCursor: desde + take < todos.length ? items[items.length - 1].id : null });
    },
    async obtenerMediosVista(ids) {
      await esperar(150);
      return ok(ids.map((id) => store.get(id)).filter((x): x is MedioVista => !!x));
    },
    async actualizarMedio(id, input) {
      await esperar(250);
      const m = store.get(id);
      if (!m) return { ok: false as const, error: "No encontramos ese medio." };
      const recortes = { ...(m.recortes ?? {}) };
      for (const [a, r] of Object.entries(input.recortes ?? {}) as [Aspecto, Recorte | null][]) {
        if (r) recortes[a] = a === "1.91:1" ? { ...r, url: m.url } : r;
        else delete recortes[a];
      }
      const nuevo = { ...m, recortes };
      store.set(id, nuevo);
      return ok(dtoDe(nuevo, 0));
    },
    async prepararSubidaMedio(input) {
      await esperar(150);
      const key = `collection/originales/mock-${++n}-${input.nombre}`;
      return ok({ url: "mock://subida", key, publicUrl: "" });
    },
    async subirArchivo(_url, _blob, onProgreso) {
      for (let p = 10; p <= 100; p += 15) {
        await esperar(90);
        onProgreso?.(Math.min(100, p));
      }
    },
    async registrarMedio(input) {
      await esperar(500);
      const colores = ["#5D7F8C", "#A3876A", "#6E7F62", "#8F6F5A", "#3F6D7A"];
      const m = medioColor(`m-subida-${n}-${Date.now()}`, colores[n % colores.length], 1600, 1067, input.nombre.replace(/\.[^.]+$/, ""));
      store.set(m.id, m);
      return ok(dtoDe(m, 0));
    },
    async crearDestino({ nombre }) {
      await esperar(350);
      const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return ok({ id: `d-${Date.now()}`, slug });
    },
    async crearEspecialista() {
      await esperar(350);
      return ok({ id: `e-${Date.now()}` });
    },
    async listarProveedores() {
      return ok([]);
    },
  };
}

export const PROVEEDORES_DEMO = [
  { id: "p-1", nombre: "Asia Luxury DMC" },
  { id: "p-2", nombre: "Philippine Island Journeys" },
  { id: "p-3", nombre: "Kuoni Tumlare" },
];
