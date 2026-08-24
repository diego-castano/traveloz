/**
 * Cliente mínimo de Gemini para el lector de itinerarios.
 *
 * Sin SDK: una sola llamada REST a `generateContent` con `responseSchema`, que
 * es lo que valida la POC `scripts/poc-lector-itinerarios.mjs`. Ese archivo es
 * la fuente del PROMPT y del SCHEMA; si tocás uno, tocá el otro. No los pude
 * importar porque la POC es un `.mjs` suelto que corre con `node` sin build.
 *
 * Lo usa `POST /api/cotizador/leer-itinerario`. No lo llames desde el cliente:
 * la API key vive solo en el server.
 */

import { z } from "zod";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;
const REINTENTOS = 1; // un solo reintento, ante 5xx/429

export function modeloGemini(): string {
  return process.env.GEMINI_MODELO || "gemini-3.1-flash-lite";
}

/* ── errores tipados ──────────────────────────────────────────────────── */

export type CodigoErrorGemini =
  | "SIN_API_KEY"        // falta GEMINI_API_KEY en el entorno
  | "TIMEOUT"            // la API no contestó en 20 s
  | "RESPUESTA_INVALIDA" // contestó, pero no es el JSON del contrato
  | "CUOTA"              // 429: nos pasamos del límite del proyecto
  | "FALLA_API";         // cualquier otro error HTTP o de red

export class ErrorGemini extends Error {
  readonly codigo: CodigoErrorGemini;
  constructor(codigo: CodigoErrorGemini, mensaje: string) {
    super(mensaje);
    this.name = "ErrorGemini";
    this.codigo = codigo;
  }
}

/* ── contrato con el cotizador ────────────────────────────────────────── */

/** Schema que se le manda a Gemini. Copiado de la POC. */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    trayectos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          etiqueta: { type: "STRING", description: "Ida, Vuelta o Tramo N" },
          fecha: { type: "STRING", description: "Fecha de salida del trayecto, YYYY-MM-DD" },
          segmentos: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                aerolinea: { type: "STRING", description: "Código IATA de 2 caracteres, ej. CM" },
                vuelo: { type: "STRING", description: "Número de vuelo sin la aerolínea, ej. 284" },
                origen: { type: "STRING", description: "Código IATA del aeropuerto de salida" },
                destino: { type: "STRING", description: "Código IATA del aeropuerto de llegada" },
                fecha: { type: "STRING", description: "Fecha de salida del segmento, YYYY-MM-DD" },
                salida: { type: "STRING", description: "Hora local de salida, HH:MM" },
                llegada: { type: "STRING", description: "Hora local de llegada, HH:MM" },
                llegaDiaSiguiente: { type: "BOOLEAN", description: "true si aterriza al día siguiente de su salida" },
              },
              required: ["aerolinea", "vuelo", "origen", "destino", "fecha", "salida", "llegada", "llegaDiaSiguiente"],
            },
          },
        },
        required: ["etiqueta", "fecha", "segmentos"],
      },
    },
  },
  required: ["trayectos"],
} as const;

/** Prompt del lector. Copiado de la POC; el `hoy` se calcula por request. */
function prompt(): string {
  return `Sos el lector de itinerarios de una agencia de viajes uruguaya.
Te llega un itinerario de vuelos en cualquiera de estos formatos: código crudo de un GDS
(Amadeus, Sabre), captura de pantalla de una herramienta NDC de aerolínea, o texto pegado
de una web de vuelos. Extraé TODOS los segmentos de vuelo y devolvé SOLO el JSON pedido.

Reglas:
- Ignorá líneas de ruido del GDS: DUPLICATE, ETKT ELIGIBLE, SEE RTSVC, RP/…, comentarios.
- Agrupá los segmentos en trayectos: un trayecto nuevo arranca cuando se corta la cadena
  de aeropuertos (el origen no es el destino anterior) o cuando pasa más de un día entre
  segmentos. El primero se etiqueta "Ida", el segundo "Vuelta", los siguientes "Tramo N".
- El año: si el itinerario no lo trae, asumí la próxima ocurrencia futura de esa fecha
  (hoy es ${new Date().toISOString().slice(0, 10)}).
- llegaDiaSiguiente: true cuando la hora de llegada es menor que la de salida o el texto
  marca el día siguiente (ej. "09OCT" en un vuelo del 08OCT, o "+1").
- Horarios SIEMPRE en formato HH:MM de 24 horas (0043 → "00:43").
- Si algo no se puede leer con certeza, omití el segmento antes que inventarlo.`;
}

/* ── validación de la respuesta ───────────────────────────────────────── */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{1,2}:\d{2}$/;

const segmentoSchema = z.object({
  aerolinea: z.string(),
  vuelo: z.string(),
  origen: z.string(),
  destino: z.string(),
  fecha: z.string(),
  salida: z.string(),
  llegada: z.string(),
  llegaDiaSiguiente: z.boolean().optional().default(false),
});

const respuestaSchema = z.object({
  trayectos: z
    .array(
      z.object({
        etiqueta: z.string().optional().default(""),
        fecha: z.string().optional().default(""),
        segmentos: z.array(segmentoSchema).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

export type SegmentoIA = {
  aerolinea: string;
  vuelo: string;
  origen: string;
  destino: string;
  fecha: string;
  salida: string;
  llegada: string;
  llegaDiaSiguiente: boolean;
};

export type TrayectoIA = {
  etiqueta: string;
  fecha: string;
  segmentos: SegmentoIA[];
};

function hhmm(v: string): string | null {
  const t = v.trim();
  if (!HORA.test(t)) return null;
  const [h, m] = t.split(":");
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Limpia lo que devolvió el modelo. Un segmento con fecha u hora ilegible se
 * descarta en vez de romper todo el itinerario: mejor cargar tres tramos de
 * cuatro que perder la lectura entera.
 */
function normalizar(crudo: z.infer<typeof respuestaSchema>): TrayectoIA[] {
  const out: TrayectoIA[] = [];
  for (const t of crudo.trayectos) {
    const segmentos: SegmentoIA[] = [];
    for (const s of t.segmentos) {
      const fecha = s.fecha.trim();
      const salida = hhmm(s.salida);
      const llegada = hhmm(s.llegada);
      const origen = s.origen.trim().toUpperCase();
      const destino = s.destino.trim().toUpperCase();
      if (!ISO.test(fecha) || !salida || !llegada) continue;
      if (origen.length !== 3 || destino.length !== 3) continue;
      segmentos.push({
        aerolinea: s.aerolinea.trim().toUpperCase().slice(0, 3),
        vuelo: s.vuelo.trim().replace(/^0+(?=\d)/, ""),
        origen,
        destino,
        fecha,
        salida,
        llegada,
        llegaDiaSiguiente: Boolean(s.llegaDiaSiguiente),
      });
    }
    if (!segmentos.length) continue;
    const fechaTrayecto = ISO.test(t.fecha.trim()) ? t.fecha.trim() : segmentos[0]!.fecha;
    out.push({
      etiqueta: t.etiqueta.trim() || `Tramo ${out.length + 1}`,
      fecha: fechaTrayecto,
      segmentos,
    });
  }
  return out;
}

/* ── la llamada ───────────────────────────────────────────────────────── */

export interface EntradaLector {
  texto?: string;
  imagen?: { mimeType: string; base64: string };
}

export interface ResultadoLector {
  trayectos: TrayectoIA[];
  modelo: string;
  ms: number;
  tokensEntrada: number | null;
  tokensSalida: number | null;
}

interface RespuestaApi {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string };
}

async function pedir(modelo: string, key: string, body: string): Promise<Response> {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ENDPOINT}/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: ctrl.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Lee un itinerario (texto GDS y/o captura) y lo devuelve en trayectos.
 * Al menos uno de `texto` o `imagen` tiene que venir.
 */
export async function leerItinerarioConGemini(
  entrada: EntradaLector,
): Promise<ResultadoLector> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ErrorGemini("SIN_API_KEY", "Falta GEMINI_API_KEY en el entorno.");

  const texto = entrada.texto?.trim();
  const imagen = entrada.imagen;
  if (!texto && !imagen) {
    throw new ErrorGemini("RESPUESTA_INVALIDA", "No llegó ni texto ni imagen para leer.");
  }

  const modelo = modeloGemini();
  const parts: Array<Record<string, unknown>> = [{ text: prompt() }];
  if (texto) parts.push({ text: `\n\nItinerario a leer:\n${texto}` });
  if (imagen) {
    parts.push({ inline_data: { mime_type: imagen.mimeType, data: imagen.base64 } });
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0,
    },
  });

  const inicio = Date.now();
  let ultimo: ErrorGemini | null = null;

  for (let intento = 0; intento <= REINTENTOS; intento++) {
    let res: Response;
    try {
      res = await pedir(modelo, key, body);
    } catch (err) {
      // AbortError = se nos venció el reloj; el resto es red caída.
      const abortado = err instanceof Error && err.name === "AbortError";
      ultimo = abortado
        ? new ErrorGemini("TIMEOUT", "El lector tardó más de 20 segundos.")
        : new ErrorGemini("FALLA_API", "No se pudo contactar al lector.");
      // Un timeout no se reintenta: ya nos comimos 20 s.
      if (abortado) throw ultimo;
      continue;
    }

    if (!res.ok) {
      const detalle = (await res.json().catch(() => null)) as RespuestaApi | null;
      const mensaje = detalle?.error?.message || `HTTP ${res.status}`;
      if (res.status === 429) {
        ultimo = new ErrorGemini("CUOTA", "El lector llegó al límite de consultas.");
      } else if (res.status >= 500) {
        ultimo = new ErrorGemini("FALLA_API", `El lector devolvió un error (${res.status}).`);
      } else {
        // 4xx que no es cuota: reintentar no arregla nada.
        throw new ErrorGemini("FALLA_API", `El lector rechazó la consulta: ${mensaje}`);
      }
      continue; // 429 y 5xx sí se reintentan una vez
    }

    const data = (await res.json().catch(() => null)) as RespuestaApi | null;
    const salida =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

    let json: unknown;
    try {
      json = JSON.parse(salida);
    } catch {
      throw new ErrorGemini("RESPUESTA_INVALIDA", "El lector no devolvió un JSON válido.");
    }

    const parseado = respuestaSchema.safeParse(json);
    if (!parseado.success) {
      throw new ErrorGemini("RESPUESTA_INVALIDA", "El lector devolvió un formato inesperado.");
    }

    const trayectos = normalizar(parseado.data);
    if (!trayectos.length) {
      throw new ErrorGemini("RESPUESTA_INVALIDA", "No se reconoció ningún vuelo en lo que mandaste.");
    }

    return {
      trayectos,
      modelo,
      ms: Date.now() - inicio,
      tokensEntrada: data?.usageMetadata?.promptTokenCount ?? null,
      tokensSalida: data?.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  throw ultimo ?? new ErrorGemini("FALLA_API", "El lector no respondió.");
}
