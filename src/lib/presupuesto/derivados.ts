// ---------------------------------------------------------------------------
// Helpers puros que van del JSON de la cotización a las columnas indexadas.
//
// La aritmética es CALCADA de _mockup/data.js. Si acá y allá dan distinto, el
// vendedor ve un precio en la lista y otro en el editor, así que no se toca sin
// tocar los dos lados:
//   venta(neto, factor) = neto / factor          (factor fuera de (0,1] → neto)
//   ventaTarifa(t)      = t.venta pisado a mano ?? venta(t.neto, t.factor ?? 0.88)
//   precioOpcion(o)     = primera tarifa de la primera habitación,
//                         y si no hay habitaciones, el neto/factor de la opción
//   monto de la fila    = Math.round(precioOpcion(opciones[0]))
// ---------------------------------------------------------------------------

import { FACTOR_DEFAULT, type ContenidoPresupuesto } from "./schema";

/** Techo de la columna `montoPrincipal`: es un Int de Postgres. */
const INT_MAX = 2_147_483_647;

type TarifaLike = {
  neto?: unknown;
  venta?: unknown;
  factor?: unknown;
} | null | undefined;

type OpcionLike = {
  neto?: unknown;
  venta?: unknown;
  factor?: unknown;
  habitaciones?: Array<{ tarifas?: TarifaLike[] } | null | undefined>;
} | null | undefined;

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Modelo de markup del sistema: precio de venta = neto ÷ factor.
 *
 * Un factor fuera de (0, 1] no es un descuento: es un dato roto. Devolver 0
 * regalaba el viaje, así que se cae al neto — mismo criterio que
 * calcularVenta() en src/lib/utils.ts y que venta() en _mockup/data.js.
 */
export function venta(neto: unknown, factor: unknown): number {
  const f = num(factor);
  if (!(f > 0) || f > 1) return num(neto);
  return num(neto) / f;
}

/**
 * Precio de una tarifa. `venta` distinta de null/"" gana siempre: es el valor
 * que el vendedor escribió a mano y no se recalcula.
 */
export function ventaTarifa(t: TarifaLike, factorFallback?: unknown): number {
  if (t == null) return 0;
  if (t.venta !== null && t.venta !== "" && t.venta !== undefined) return num(t.venta);
  const factor = t.factor ?? factorFallback ?? FACTOR_DEFAULT;
  return venta(t.neto, factor);
}

/** Precio principal de una opción: primera tarifa de la primera habitación. */
export function precioOpcion(o: OpcionLike): number {
  const t = o?.habitaciones?.[0]?.tarifas?.[0];
  if (t) return ventaTarifa(t, o?.factor);
  // Opción ya resuelta (la que arma contenidoPublico para el pasajero): no
  // tiene neto ni factor, el precio viene calculado. Mismo orden que data.js.
  if (o?.venta !== null && o?.venta !== undefined && o?.venta !== "") return num(o.venta);
  // Sin habitaciones cae al modelo viejo (opciones importadas de un paquete).
  return venta(o?.neto, o?.factor);
}

/**
 * Monto que se muestra en la lista. Una cotización de solo vuelos no tiene
 * opciones hoteleras: ahí manda el precio del adulto.
 */
export function montoPrincipal(contenido: ContenidoPresupuesto): number | null {
  if (contenido.soloVuelos) {
    const adulto = num(contenido.precioVuelo?.adulto);
    return adulto > 0 ? aInt(adulto) : null;
  }
  const primera = contenido.opciones?.[0];
  if (!primera) return null;
  const precio = precioOpcion(primera as OpcionLike);
  return precio > 0 ? aInt(precio) : null;
}

/**
 * Redondea y corta en el techo del Int. El esquema ya acota netos y ventas,
 * pero acá se cierra la puerta igual: un montoPrincipal desbordado no lo
 * rechaza Zod, lo rechaza Postgres a mitad del autosave.
 */
function aInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.round(n), INT_MAX);
}

/**
 * Dígitos comparables de un teléfono. "+598 99 123 456", "099123456" y
 * "99123456" tienen que dar lo mismo, así el buscador del historial encuentra
 * al cliente escriba el vendedor como escriba. Misma regla que telDigitos()
 * en data.js: se saca el código de país y los ceros de adelante.
 */
export function soloDigitos(tel: unknown): string {
  return String(tel ?? "")
    .replace(/\D/g, "")
    .replace(/^0*598/, "")
    .replace(/^0+/, "");
}

/**
 * ISO "YYYY-MM-DD" → Date en UTC a medianoche. La columna es @db.Date, así que
 * construirla en UTC evita que un servidor en otro huso se coma un día.
 */
export function fechaDesdeISO(iso: unknown): Date | null {
  const s = String(iso ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (Number.isNaN(d.getTime())) return null;
  // Date.UTC desborda en silencio: "2026-13-45" da enero de 2027. Si la fecha
  // que salió no es la que entró, el string no era una fecha.
  if (
    d.getUTCFullYear() !== anio ||
    d.getUTCMonth() !== mes - 1 ||
    d.getUTCDate() !== dia
  ) {
    return null;
  }
  return d;
}

export interface ColumnasPresupuesto {
  clienteNombre: string | null;
  clienteApellido: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  clienteTelefonoDigitos: string | null;
  destino: string | null;
  mes: number | null;
  anio: number | null;
  fechaSalida: Date | null;
  soloVuelos: boolean;
  montoPrincipal: number | null;
}

/** "" → null: en la columna un vacío no dice nada y ensucia los filtros. */
function limpio(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/**
 * Espejo del JSON en columnas. Se recalcula en cada guardado: el JSON es la
 * fuente de verdad y las columnas nunca se editan sueltas.
 */
export function columnasDesdeContenido(
  contenido: ContenidoPresupuesto,
): ColumnasPresupuesto {
  const telefono = limpio(contenido.cliente?.telefono);
  const digitos = telefono ? soloDigitos(telefono) : "";
  // El destino del encabezado manda; si está vacío, el primer destino cargado.
  const destino =
    limpio(contenido.titulo?.destino) ?? limpio(contenido.destinos?.[0]?.ciudad);
  const fechaSalida = fechaDesdeISO(contenido.fechaSalida);

  // Con fecha de salida cargada, mes y año salen de ahí (es lo que hace
  // atarTitulo() en el editor); si no, del encabezado.
  const mes = fechaSalida ? fechaSalida.getUTCMonth() : contenido.titulo?.mes ?? null;
  const anioTitulo = contenido.titulo?.anio;
  const anio = fechaSalida
    ? fechaSalida.getUTCFullYear()
    : anioTitulo === null || anioTitulo === undefined
      ? null
      : Math.trunc(anioTitulo);

  return {
    clienteNombre: limpio(contenido.cliente?.nombre),
    clienteApellido: limpio(contenido.cliente?.apellido),
    clienteEmail: limpio(contenido.cliente?.email)?.toLowerCase() ?? null,
    clienteTelefono: telefono,
    clienteTelefonoDigitos: digitos === "" ? null : digitos,
    destino,
    mes,
    anio,
    fechaSalida,
    soloVuelos: contenido.soloVuelos === true,
    montoPrincipal: montoPrincipal(contenido),
  };
}
