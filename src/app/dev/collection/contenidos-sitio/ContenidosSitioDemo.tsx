"use client";

// Arma el contexto del shell con adaptadores en memoria para ver Aliados,
// Testimonios y Preguntas sin base de datos. Nada de esto toca el servidor.

import { useState } from "react";
import type { AliadoItem } from "@/actions/collection/aliados.actions";
import type { TestimonioItem } from "@/actions/collection/testimonios.actions";
import type { PreguntaItem } from "@/actions/collection/preguntas.actions";
import { ApiProvider } from "@/components/collection/constructor/api";
import { crearApiMock, datosDemo } from "@/components/collection/constructor/api-mock";
import { medio } from "@/components/collection/sitio/demo";
import { Aliados } from "@/components/collection/aliados/Aliados";
import { Testimonios } from "@/components/collection/testimonios/Testimonios";
import { Preguntas } from "@/components/collection/preguntas/Preguntas";
import { DevShell } from "../DevShell";

export type VistaDemo = "aliados" | "testimonios" | "preguntas";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = <T,>(data: T) => ({ ok: true as const, data });

/** Api en memoria: crea con id nuevo y todo lo demás responde bien. */
function apiDemo(prefijo: string) {
  return {
    async crear() {
      await esperar(300);
      return ok({ id: `${prefijo}-${Date.now()}` });
    },
    async actualizar() {
      await esperar(400);
      return ok(null);
    },
    async reordenar() {
      await esperar(200);
      return ok(null);
    },
    async eliminar() {
      await esperar(300);
      return ok(null);
    },
  };
}

/** Logo de muestra: el nombre en un SVG con su color, como data URL. */
function logo(id: string, texto: string, color: string, serif = false) {
  const fuente = serif ? "Georgia, serif" : "Helvetica, Arial, sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96"><text x="160" y="60" text-anchor="middle" font-family="${fuente}" font-size="34" font-weight="${serif ? 400 : 700}" letter-spacing="${serif ? 1 : 3}" fill="${color}">${texto}</text></svg>`;
  return medio(id, "#FFFFFF", 320, 96, texto, "", "", { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` });
}

function aliado(
  id: string,
  nombre: string,
  tipo: string,
  descripcion: string,
  logoMedio: AliadoItem["logo"],
  publicado = true,
  url = "",
): AliadoItem {
  return { id, nombre, tipo, descripcion, url, logo: logoMedio, publicado, orden: 0, proveedorId: null };
}

const ALIADOS: AliadoItem[] = [
  aliado("a-1", "Cala Blanca Hotels", "Hotel", "Hoteles boutique en el Mediterráneo, con pocas habitaciones y vista al mar.", logo("l-1", "CALA BLANCA", "#1F5E7A"), true, "https://calablanca.example"),
  aliado("a-2", "Ryokan Hanaya", "Hotel", "Posadas tradicionales en Hakone y Kioto, con baños termales privados.", logo("l-2", "Hanaya", "#9B2C2C", true)),
  aliado("a-3", "Andes Wilderness", "Operador", "Expediciones en la Patagonia con guías baqueanos y refugios propios.", logo("l-3", "ANDES·W", "#2F5D3A")),
  aliado("a-4", "Ponant", "Naviera", "Cruceros de expedición a la Antártida y los fiordos chilenos.", logo("l-4", "PONANT", "#0E2A47")),
  aliado("a-5", "Kiri Safaris", "Operador", "Campamentos móviles en el Serengeti que siguen la migración.", null),
  aliado("a-6", "Qatar Airways", "Aerolínea", "Conexiones a Asia y África vía Doha.", logo("l-6", "QATAR", "#5C0632")),
  aliado("a-7", "Bangka Blue", "Navegación", "Embarcaciones privadas entre las islas de Palawan.", logo("l-7", "bangka blue", "#2B7A9B", true), false),
  aliado("a-8", "Bodegas del Cuyo", "Otro", "Visitas de cosecha y almuerzos en viñedos del Valle de Uco.", null, false),
  aliado("a-9", "Silversea", "Naviera", "Barcos chicos, todo incluido, puertos que los grandes no tocan.", logo("l-9", "SILVERSEA", "#3A3F44")),
];

const PROVEEDORES = [
  { id: "pr-1", nombre: "Cala Blanca Hotels S.L." },
  { id: "pr-2", nombre: "Ponant Cruises" },
  { id: "pr-3", nombre: "Kiri Safaris Ltd." },
];

const TESTIMONIOS: TestimonioItem[] = [
  {
    id: "t-1",
    nombre: "Carolina y Martín",
    lugar: "Montevideo",
    viaje: "Filipinas, enero 2026",
    cita: "Volvimos de El Nido con la sensación de haber tenido el mar para nosotros solos. Cada día tenía algo preparado, y nunca se sintió armado.",
    foto: medio("t-nido", "#2F6E73", 1600, 2000, "Bangka entre lagunas en El Nido"),
    publicado: true,
    orden: 0,
    experienciaId: "x-1",
    fecha: "2026-02-03T00:00:00.000Z",
  },
  {
    id: "t-2",
    nombre: "Familia Olivera",
    lugar: "Punta del Este",
    viaje: "Tanzania, agosto 2025",
    cita: "Los chicos todavía hablan del campamento. Tomás pensó en todo, hasta en la hora de la siesta.",
    foto: medio("t-safari", "#A8834F", 1600, 2000, "Campamento de carpas en el Serengeti"),
    publicado: true,
    orden: 1,
    experienciaId: "x-2",
    fecha: "2025-09-12T00:00:00.000Z",
  },
  {
    id: "t-3",
    nombre: "Andrés Laborde",
    lugar: "Colonia",
    viaje: "Japón, noviembre 2025",
    cita: "Llegamos a Kioto en la semana justa de los arces. No fue suerte: Lucía lo tenía calculado.",
    foto: medio("t-japon", "#8B5E4A", 1600, 2000, "Puente rojo entre arces en Nikko"),
    publicado: true,
    orden: 2,
    experienciaId: null,
    fecha: null,
  },
  {
    id: "t-4",
    nombre: "Valentina Sosa",
    lugar: "Salto",
    viaje: "Grecia, junio 2025",
    cita: "",
    foto: null,
    publicado: false,
    orden: 3,
    experienciaId: null,
    fecha: null,
  },
];

const EXPERIENCIAS = [
  { id: "x-1", titulo: "Filipinas en bangka" },
  { id: "x-2", titulo: "Safari en el Serengeti" },
  { id: "x-3", titulo: "Japón en otoño" },
];

const PREGUNTAS: PreguntaItem[] = [
  ["¿Cuánto tiempo antes conviene empezar a planear?", "<p>Entre seis y nueve meses para viajes largos o en temporada alta. Para escapadas cortas alcanza con dos o tres meses.</p>", "General", true],
  ["¿Puedo cambiar un itinerario publicado?", "<p>Sí. Cada experiencia es un punto de partida: tu especialista ajusta noches, hoteles y ritmo a tu medida.</p>", "General", true],
  ["¿Los precios incluyen los vuelos internacionales?", "<p>No, salvo que la propuesta lo diga. Los vuelos internos y los traslados sí están incluidos.</p>", "General", true],
  ["¿Viajan con grupos?", "<p>No. Cada viaje es privado: solo vos y quienes elijas.</p>", "General", false],
  ["¿Qué pasa si tengo que cancelar?", "<p>Depende de cuándo avises. Las condiciones están en los <a href=\"/terminos\">términos y condiciones</a>.</p>", "Reservas", true],
  ["¿Cuánto hay que pagar para reservar?", "<p>Una seña del 30 % confirma hoteles y vuelos internos. El resto, 45 días antes de salir.</p>", "Pagos", true],
  ["¿Puedo pagar en cuotas?", "<p>Sí, con tarjetas de crédito uruguayas, hasta en 12 cuotas.</p>", "Pagos", false],
].map(([pregunta, respuesta, categoria, publicada], i) => ({
  id: `q-${i + 1}`,
  pregunta: pregunta as string,
  respuesta: respuesta as string,
  categoria: categoria as string,
  publicada: publicada as boolean,
  orden: i,
}));

export function ContenidosSitioDemo({ vista, abrir, lectura }: { vista: VistaDemo; abrir: string | null; lectura: boolean }) {
  const [api] = useState(() => {
    const d = datosDemo();
    return crearApiMock(d.biblioteca, d.detalle.revision);
  });
  return (
    <DevShell lectura={lectura} ruta={`/backend/collection/${vista}`}>
      <ApiProvider value={api}>
        {vista === "aliados" ? (
          <Aliados inicial={ALIADOS} proveedores={PROVEEDORES} api={apiDemo("a")} abrirId={abrir} />
        ) : vista === "testimonios" ? (
          <Testimonios inicial={TESTIMONIOS} experiencias={EXPERIENCIAS} api={apiDemo("t")} abrirId={abrir} />
        ) : (
          <Preguntas inicial={PREGUNTAS} categorias={["General"]} api={apiDemo("q")} abrirId={abrir} />
        )}
      </ApiProvider>
    </DevShell>
  );
}
