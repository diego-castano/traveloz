// ---------------------------------------------------------------------------
// Forma de `contenido`: la cotización entera que el editor guarda como JSON.
//
// El criterio es tolerante a propósito. El editor del cotizador se mueve rápido
// y agrega campos casi todas las semanas; si el esquema fuera estricto, una
// cotización guardada con la versión de mañana rebotaría al leerla con la de
// hoy. Entonces:
//   • los objetos son "loose": lo que no conocemos pasa de largo y se guarda;
//   • lo que SÍ se valida en serio es la estructura que alimenta las columnas
//     derivadas y el precio — opciones → habitaciones → tarifas.
//
// La aritmética del precio vive en derivados.ts y es la misma de
// _mockup/data.js: venta = venta pisada a mano ?? round(neto / factor).
// ---------------------------------------------------------------------------

import { z } from "zod";

/** Factor de markup por defecto: venta = neto ÷ factor. */
export const FACTOR_DEFAULT = 0.88;

/** Vigencia por defecto del link, en horas. */
export const VIGENCIA_DEFAULT = 96; // horas hábiles (decisión de Gero, 26/08)

/** Vigencia mínima y máxima del link, en horas (30 días de tope). */
export const VIGENCIA_MIN = 1;
export const VIGENCIA_MAX = 720;

/**
 * Tope de un neto o de una venta. Con 99.999.999 el monto derivado entra
 * cómodo en el Int de la columna `montoPrincipal` y ningún viaje real lo roza.
 */
export const MONTO_MAX = 99_999_999;

/**
 * Tope del HTML de las notas del pasajero. Las imágenes ya no viajan en
 * base64 (se suben a /api/upload y queda la URL), así que 200 KB de markup es
 * holgadísimo y a la vez deja el body de la server action bien por debajo del
 * límite.
 */
export const NOTAS_MAX = 200_000;

/** Código que la action devuelve tal cual cuando las notas se pasan de largo. */
export const ERROR_NOTAS_LARGAS = "NOTAS_MUY_LARGAS";

/** Deja `n` adentro de [min, max]. */
function acotar(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

// ---------------------------------------------------------------------------
// Coerciones seguras
//
// El editor manda strings para casi todo (los inputs son de texto). "" y null
// significan "sin cargar", no cero: por eso number() nullable en vez de un
// coerce que convierta "" en 0.
// ---------------------------------------------------------------------------

/** Número que puede llegar como string; "" / null / basura → null. */
const numeroFlojo = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

/** Igual que numeroFlojo pero con piso 0 y default 0 (netos, noches). */
const numeroCero = numeroFlojo.transform((n) => (n === null ? 0 : n));

/**
 * Plata: piso 0 y techo MONTO_MAX. Se acota en vez de rechazar a propósito —
 * un cero de más tipeado en un neto no puede tumbarle el autosave al vendedor,
 * y el monto derivado tiene que entrar sí o sí en el Int de la columna.
 */
const montoAcotado = numeroCero.transform((n) => acotar(n, 0, MONTO_MAX));

/** Igual, pero conservando el null (la venta pisada a mano puede no existir). */
const montoAcotadoNulo = numeroFlojo.transform((n) =>
  n === null ? null : acotar(n, 0, MONTO_MAX),
);

/**
 * Factor de markup: solo vale (0, 1]. Fuera de rango vuelve null y el cálculo
 * cae a FACTOR_DEFAULT, que es lo mismo que hace una tarifa sin factor.
 */
const factorAcotado = numeroFlojo.transform((n) =>
  n === null || !(n > 0) || n > 1 ? null : n,
);

/** Entero 0-11 para el mes; cualquier otra cosa → null. */
const mesFlojo = numeroFlojo.transform((n) =>
  n === null ? null : n >= 0 && n <= 11 ? Math.trunc(n) : null,
);

/** Texto que puede venir null/undefined; siempre sale string. */
const textoFlojo = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? "" : String(v)));

/** Texto opcional que conserva el null (ciudad/modalidad de un servicio). */
const textoNulo = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? null : String(v)));

const boolFlojo = z
  .union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => v === true || v === "true" || v === 1);

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

export const tarifaSchema = z.looseObject({
  id: textoFlojo,
  tipo: textoFlojo,
  tipoLibre: textoFlojo.optional(),
  neto: montoAcotado,
  // null → el precio se calcula (neto ÷ factor). Un número → pisado a mano.
  venta: montoAcotadoNulo.nullable(),
  factor: factorAcotado.nullable(),
});

export const habitacionSchema = z.looseObject({
  id: textoFlojo,
  ocupacion: textoFlojo,
  tipo: textoFlojo,
  tarifas: z.array(tarifaSchema).default([]),
});

export const hotelDeOpcionSchema = z.looseObject({
  hotelId: textoNulo,
  // Hotel escrito a mano por el vendedor (no está en el catálogo).
  libre: textoFlojo.optional(),
  cat: numeroFlojo.nullable().optional(),
  regimen: textoFlojo.optional(),
});

export const opcionSchema = z.looseObject({
  id: textoFlojo,
  nombre: textoFlojo,
  hoteles: z.array(hotelDeOpcionSchema).default([]),
  // Modelo viejo (paquetes del catálogo): un neto y un factor por opción.
  // Se mantiene como respaldo del cálculo cuando no hay habitaciones.
  regimen: textoFlojo.optional(),
  factor: numeroFlojo.nullable().optional(),
  neto: numeroFlojo.nullable().optional(),
  habitaciones: z.array(habitacionSchema).default([]),
});

export const vueloSchema = z.looseObject({
  id: textoFlojo,
  cia: textoFlojo,
  nro: textoFlojo,
  aerolinea: textoFlojo,
  dia: numeroFlojo.nullable(),
  mes: mesFlojo,
  origen: textoFlojo,
  destino: textoFlojo,
  salida: textoFlojo,
  llegada: textoFlojo,
});

export const destinoSchema = z.looseObject({
  id: textoFlojo,
  ciudad: textoFlojo,
  noches: numeroCero,
  regimen: textoFlojo.optional(),
  checkinManual: textoNulo.optional(),
});

export const servicioSchema = z.looseObject({
  id: textoFlojo,
  categoria: textoFlojo,
  texto: textoFlojo,
  ciudad: textoNulo.optional(),
  modalidad: textoNulo.optional(),
  // Sigue a las noches / cabina hasta que el vendedor lo edita a mano.
  auto: textoNulo.optional(),
  // Solo en las filas de alojamiento: el destino del itinerario que las genera.
  tramo: textoNulo.optional(),
});

/** Costo fijo interno: no lo ve el pasajero. */
export const notaSchema = z.looseObject({
  id: textoFlojo,
  concepto: textoFlojo,
  neto: numeroCero,
});

export const clienteSchema = z.looseObject({
  nombre: textoFlojo,
  apellido: textoFlojo,
  email: textoFlojo,
  telefono: textoFlojo,
});

export const tituloSchema = z.looseObject({
  destino: textoFlojo,
  mes: mesFlojo,
  // Un año fuera de 2000-2100 es un dedazo, no un viaje: se acota antes de que
  // llegue a la columna `anio` y ensucie los filtros del listado.
  anio: numeroFlojo
    .nullable()
    .transform((n) => (n === null ? null : acotar(Math.trunc(n), 2000, 2100))),
});

export const precioVueloSchema = z.looseObject({
  adulto: textoFlojo,
  menor: textoFlojo,
  infante: textoFlojo,
});

// ---------------------------------------------------------------------------
// El objeto entero
// ---------------------------------------------------------------------------

export const contenidoSchema = z.looseObject({
  numero: textoFlojo.optional(),
  estado: textoFlojo.optional(),
  origen: textoNulo.optional(),
  // Lo que el lector de consultas de WhatsApp interpretó. Estructura libre.
  ia: z.unknown().optional(),

  cliente: clienteSchema.default({ nombre: "", apellido: "", email: "", telefono: "" }),
  titulo: tituloSchema.default({ destino: "", mes: null, anio: null }),
  // ISO date "YYYY-MM-DD" o "" si todavía no hay fecha.
  fechaSalida: textoFlojo.default(""),

  mensaje: textoFlojo.default(""),
  mensajeHtml: textoFlojo.default(""),
  mensajeAuto: textoFlojo.default(""),

  soloVuelos: boolFlojo.default(false),
  precioVuelo: precioVueloSchema.default({ adulto: "", menor: "", infante: "" }),
  fotosHotel: boolFlojo.default(false),

  pnrRaw: textoFlojo.default(""),
  vuelos: z.array(vueloSchema).default([]),
  cabina: textoNulo.default(null),
  equipaje: textoNulo.default(null),

  destinos: z.array(destinoSchema).default([]),
  servicios: z.array(servicioSchema).default([]),

  // Internos: costos fijos y bloc de notas del vendedor.
  notas: z.array(notaSchema).default([]),
  notasLibres: textoFlojo.default(""),
  // HTML libre que sí ve el pasajero. Acá SÍ se rechaza en vez de recortar:
  // cortar HTML a la mitad deja etiquetas abiertas y rompe la cotización.
  notasCliente: textoFlojo
    .refine((s) => s.length <= NOTAS_MAX, { message: ERROR_NOTAS_LARGAS })
    .default(""),

  vigencia: numeroFlojo
    .nullable()
    .transform((n) =>
      n === null ? null : acotar(Math.round(n), VIGENCIA_MIN, VIGENCIA_MAX),
    )
    .default(VIGENCIA_DEFAULT),
  opciones: z.array(opcionSchema).default([]),
});

export type ContenidoPresupuesto = z.infer<typeof contenidoSchema>;
export type OpcionPresupuesto = z.infer<typeof opcionSchema>;
export type TarifaPresupuesto = z.infer<typeof tarifaSchema>;

/**
 * Valida sin tirar. Devuelve el contenido normalizado o el primer mensaje de
 * error de zod (v4: los errores viven en `issues`).
 */
export function parseContenido(
  raw: unknown,
): { ok: true; contenido: ContenidoPresupuesto } | { ok: false; error: string } {
  const parsed = contenidoSchema.safeParse(raw);
  if (!parsed.success) {
    // Las notas largas viajan con su código pelado: el editor lo reconoce y
    // muestra un mensaje que le dice al vendedor qué hacer.
    if (parsed.error.issues.some((i) => i.message === ERROR_NOTAS_LARGAS)) {
      return { ok: false, error: ERROR_NOTAS_LARGAS };
    }
    const issue = parsed.error.issues[0];
    const donde = issue?.path?.length ? ` (${issue.path.join(".")})` : "";
    return { ok: false, error: `Cotización inválida${donde}: ${issue?.message ?? "formato desconocido"}` };
  }
  return { ok: true, contenido: parsed.data };
}

// ---------------------------------------------------------------------------
// Estados: la UI habla en minúscula, la base en enum.
// ---------------------------------------------------------------------------

export const ESTADOS_UI = {
  borrador: "BORRADOR",
  enviada: "ENVIADA",
  abierta: "ABIERTA",
  vencida: "VENCIDA",
  confirmada: "CONFIRMADA",
} as const;

export type EstadoUi = keyof typeof ESTADOS_UI;
export type EstadoDb = (typeof ESTADOS_UI)[EstadoUi];

export const ESTADOS_DB: Record<EstadoDb, EstadoUi> = {
  BORRADOR: "borrador",
  ENVIADA: "enviada",
  ABIERTA: "abierta",
  VENCIDA: "vencida",
  CONFIRMADA: "confirmada",
};

/** "borrador" → "BORRADOR". Cualquier otra cosa → null. */
export function estadoUiADb(estado: string | null | undefined): EstadoDb | null {
  if (!estado) return null;
  const clave = String(estado).trim().toLowerCase();
  // hasOwn y no `??`: sin esto, "constructor" o "toString" devuelven algo del
  // prototipo de Object y se cuelan como estado válido.
  return Object.hasOwn(ESTADOS_UI, clave) ? ESTADOS_UI[clave as EstadoUi] : null;
}

/** "BORRADOR" → "borrador". */
export function estadoDbAUi(estado: EstadoDb | null | undefined): EstadoUi | null {
  if (!estado) return null;
  return Object.hasOwn(ESTADOS_DB, estado) ? ESTADOS_DB[estado] : null;
}
