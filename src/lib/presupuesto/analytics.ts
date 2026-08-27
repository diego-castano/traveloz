// ---------------------------------------------------------------------------
// Agregación pura del tab Analytics del cotizador.
//
// Vive fuera de la action a propósito: es una función sin Prisma, sin auth y
// sin fechas relativas escondidas, así se puede probar con filas sintéticas
// (scratchpad) y, el día que haga falta, reusar desde un cron o un export.
//
// Reglas:
//   • Una sola pasada por las filas. Nada de recorrer el array por vendedor:
//     con 5.000 cotizaciones y 12 vendedores eso son 60.000 vueltas al pedo.
//   • Todo en UTC. Las semanas ISO y los cortes de rango se calculan con
//     getUTC*: el panel se mira desde Montevideo pero la DB guarda UTC y una
//     semana que se corre tres horas mueve filas de un balde al otro.
//   • Las tasas devuelven null cuando el divisor es cero. Un 0% inventado
//     sobre cero enviadas es una mentira que después alguien lee en una
//     reunión.
//   • Fechas de salida como ISO string: cruzan el borde de la server action
//     sin depender de cómo serialice Next los Date.
// ---------------------------------------------------------------------------

import { SECCIONES, indiceSeccion } from "./secciones";
import { destinoFinal } from "./destino";

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;
const SEMANA_MS = 604_800_000;

/**
 * Tope duro de semanas en el gráfico.
 *
 * Antes eran 26 y el recorte era mudo: pedir "todo 2025" devolvía media línea
 * sin decirlo. Ahora viajan todas las del rango hasta este tope —más de un año
 * de historia— y si algo se cortó sale `porSemanaRecortada:true`, que el tab
 * escribe abajo del gráfico.
 */
const SEMANAS_MAX = 60;
/** Destinos en el ranking. */
const DESTINOS_MAX = 8;

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/** Las columnas de Presupuesto que mira la agregación. Nada de `contenido`. */
export interface FilaAnalytics {
  id: string;
  vendedorId: string;
  estado: string;
  estadoManual: string | null;
  montoPrincipal: number | null;
  destino: string | null;
  createdAt: Date;
  enviadaAt: Date | null;
  expiraAt: Date | null;
  confirmadaAt: Date | null;
  aperturas: number;
  primeraAperturaAt: Date | null;
  ultimaAperturaAt: Date | null;
  tiempoArmadoSeg: number | null;
}

/** Una apertura del pasajero. `linkId` alcanza: nada acá vuelve al presupuesto. */
export interface AperturaAnalytics {
  linkId: string;
  abiertaAt: Date;
  dispositivo: string | null;
  seccionMax: string | null;
  segundos: number | null;
}

export interface UsuarioAnalytics {
  id: string;
  name: string | null;
}

export interface OpcionesAnalytics {
  /** Inicio del rango. Si falta, se toma la fila más vieja. */
  desde?: Date;
  /** Fin del rango. Si falta, se toma la fila más nueva (o ahora). */
  hasta?: Date;
  /** true cuando la query pegó contra el tope de filas. */
  truncado?: boolean;
}

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

export interface ResumenAnalytics {
  creadas: number;
  enviadas: number;
  abiertas: number;
  confirmadas: number;
  vencidas: number;
  /** Fracción 0..1, null si no hubo enviadas. */
  tasaApertura: number | null;
  /** Fracción 0..1, null si no hubo enviadas. */
  tasaConfirmacion: number | null;
  montoConfirmado: number;
  /**
   * Monto promedio de las confirmadas QUE TIENEN monto, o null si ninguna lo
   * tiene. El divisor no son todas las confirmadas: una confirmada sin
   * `montoPrincipal` (las que se cerraron a mano, sin opción con precio) sumaba
   * cero arriba y uno abajo, y hundía el ticket de todo el equipo.
   */
  ticketPromedio: number | null;
  medianaHorasHastaApertura: number | null;
  medianaHorasHastaConfirmacion: number | null;
  promedioSegundosLectura: number | null;
  tiempoArmadoMedianoSeg: number | null;
}

export interface VendedorAnalytics {
  vendedorId: string;
  nombre: string;
  creadas: number;
  enviadas: number;
  abiertas: number;
  confirmadas: number;
  tasaApertura: number | null;
  tasaConfirmacion: number | null;
  montoConfirmado: number;
  medianaHorasHastaApertura: number | null;
  /** ISO. Lo más reciente entre creada, enviada, confirmada y última apertura. */
  ultimaActividadAt: string | null;
}

export interface SemanaAnalytics {
  /** "2026-W34" */
  semana: string;
  /** Lunes de esa semana, ISO en UTC. */
  desde: string;
  creadas: number;
  enviadas: number;
  confirmadas: number;
}

export interface PasoEmbudo {
  clave: string;
  label: string;
  /** Aperturas que llegaron a esta sección o más abajo. */
  aperturas: number;
  /** Fracción 0..1 sobre el total de aperturas con sección conocida. */
  pct: number | null;
}

export interface DestinoAnalytics {
  destino: string;
  creadas: number;
  confirmadas: number;
}

export interface DispositivoAnalytics {
  dispositivo: string;
  aperturas: number;
}

export interface AnalyticsCotizador {
  desde: string;
  hasta: string;
  /** true cuando se cortó por tope: los números son un piso, no el total. */
  truncado: boolean;
  resumen: ResumenAnalytics;
  porVendedor: VendedorAnalytics[];
  /** Semanas continuas del rango, hasta 60. Las últimas si hubo que cortar. */
  porSemana: SemanaAnalytics[];
  /** true cuando el rango tenía más de 60 semanas y el gráfico muestra el final. */
  porSemanaRecortada: boolean;
  embudo: {
    totalAperturas: number;
    /** Aperturas con `seccionMax` reconocible: el divisor real del embudo. */
    conSeccion: number;
    pasos: PasoEmbudo[];
  };
  topDestinos: DestinoAnalytics[];
  dispositivos: DispositivoAnalytics[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mediana y no promedio: una cotización que alguien dejó abierta toda la noche
 * corre el promedio media hora y deja de describir a nadie.
 */
export function mediana(nums: number[]): number | null {
  const l = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!l.length) return null;
  const m = Math.floor(l.length / 2);
  return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2;
}

/** Tasa que no miente: null cuando no hay de qué dividir. */
function tasa(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

function redondear(n: number | null, decimales = 2): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

/**
 * Mismo criterio que `estadoEfectivoDe()` en presupuesto.actions.ts. Está
 * duplicado porque aquel archivo es "use server" y no puede exportar helpers
 * sincrónicos; si cambia la regla del vencimiento hay que tocar los dos.
 */
export function estadoEfectivoAnalytics(f: {
  estado: string;
  estadoManual: string | null;
  expiraAt: Date | null;
  confirmadaAt: Date | null;
}, ahora: number): string {
  if (f.estadoManual) return f.estadoManual;
  if (f.estado === "CONFIRMADA" || f.confirmadaAt) return f.estado;
  if (f.estado !== "ENVIADA" && f.estado !== "ABIERTA") return f.estado;
  if (f.expiraAt && f.expiraAt.getTime() < ahora) return "VENCIDA";
  return f.estado;
}

/** Semana ISO en UTC: clave "2026-W35" y el lunes que la abre. */
export function semanaISO(d: Date): { clave: string; lunes: Date } {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7; // lunes = 0
  const lunes = new Date(t - dow * DIA_MS);
  const jueves = new Date(lunes.getTime() + 3 * DIA_MS);
  const anio = jueves.getUTCFullYear();
  const semana = Math.floor((jueves.getTime() - Date.UTC(anio, 0, 1)) / SEMANA_MS) + 1;
  return { clave: `${anio}-W${String(semana).padStart(2, "0")}`, lunes };
}

/**
 * "Punta Cana, Noviembre 2026" → "Punta Cana". El espejo `destino` guarda
 * destino + período pegados; agrupar por el string entero partiría el mismo
 * destino en un balde por mes.
 *
 * `destinoFinal` encima: las filas anteriores al 26/08 guardaron el camino
 * entero ("Caribe › Jamaica") y las nuevas solo "Jamaica". Sin el recorte, el
 * mismo destino salía en dos baldes del ranking.
 */
function destinoBase(s: string | null): string {
  return destinoFinal(String(s ?? "").split(",")[0]);
}

function nombreDe(usuarios: Map<string, string>, id: string): string {
  return usuarios.get(id) || "Sin vendedor";
}

function masReciente(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

// ---------------------------------------------------------------------------
// Agregación
// ---------------------------------------------------------------------------

interface AcumVendedor {
  vendedorId: string;
  creadas: number;
  enviadas: number;
  abiertas: number;
  confirmadas: number;
  montoConfirmado: number;
  horasHastaApertura: number[];
  ultimaActividadAt: Date | null;
}

interface AcumSemana {
  creadas: number;
  enviadas: number;
  confirmadas: number;
}

/**
 * Una pasada por `filas`, una por `aperturas`. Todo lo demás sale de mapas.
 *
 * @param filas     cotizaciones del rango (ya filtradas y acotadas por la action)
 * @param aperturas aperturas del pasajero de esas cotizaciones
 * @param usuarios  vendedores involucrados, para poner nombre a los ids
 */
export function agregarAnalytics(
  filas: FilaAnalytics[],
  aperturas: AperturaAnalytics[],
  usuarios: UsuarioAnalytics[],
  opciones: OpcionesAnalytics = {},
): AnalyticsCotizador {
  const ahora = Date.now();
  const nombres = new Map<string, string>();
  for (const u of usuarios) if (u.name) nombres.set(u.id, u.name);

  let creadas = 0;
  let enviadas = 0;
  let abiertas = 0;
  let confirmadas = 0;
  let vencidas = 0;
  let montoConfirmado = 0;
  /** Divisor del ticket: confirmadas con `montoPrincipal` cargado. */
  let confirmadasConMonto = 0;

  const horasApertura: number[] = [];
  const horasConfirmacion: number[] = [];
  const armadoSeg: number[] = [];

  const porVendedorMap = new Map<string, AcumVendedor>();
  const porSemanaMap = new Map<string, AcumSemana>();
  const destinosMap = new Map<string, DestinoAnalytics>();

  let masViejaMs: number | null = null;
  let masNuevaMs: number | null = null;

  for (const f of filas) {
    creadas += 1;
    const creadaMs = f.createdAt.getTime();
    if (masViejaMs === null || creadaMs < masViejaMs) masViejaMs = creadaMs;
    if (masNuevaMs === null || creadaMs > masNuevaMs) masNuevaMs = creadaMs;

    const efectivo = estadoEfectivoAnalytics(f, ahora);
    const fueEnviada = f.enviadaAt != null;
    const fueAbierta = (f.aperturas ?? 0) > 0;
    const fueConfirmada = efectivo === "CONFIRMADA";
    const fueVencida = efectivo === "VENCIDA";

    if (fueEnviada) enviadas += 1;
    if (fueAbierta) abiertas += 1;
    if (fueVencida) vencidas += 1;

    let horasAp: number | null = null;
    if (f.enviadaAt && f.primeraAperturaAt) {
      const h = (f.primeraAperturaAt.getTime() - f.enviadaAt.getTime()) / HORA_MS;
      // Negativo = reloj torcido o link emitido antes del sello de envío. No suma.
      if (h >= 0) {
        horasAp = h;
        horasApertura.push(h);
      }
    }
    if (f.enviadaAt && f.confirmadaAt) {
      const h = (f.confirmadaAt.getTime() - f.enviadaAt.getTime()) / HORA_MS;
      if (h >= 0) horasConfirmacion.push(h);
    }
    if (f.tiempoArmadoSeg != null && f.tiempoArmadoSeg > 0) armadoSeg.push(f.tiempoArmadoSeg);

    const monto = fueConfirmada ? f.montoPrincipal ?? 0 : 0;
    if (fueConfirmada) {
      confirmadas += 1;
      montoConfirmado += monto;
      if (monto > 0) confirmadasConMonto += 1;
    }

    // ── por vendedor ──
    let v = porVendedorMap.get(f.vendedorId);
    if (!v) {
      v = {
        vendedorId: f.vendedorId,
        creadas: 0, enviadas: 0, abiertas: 0, confirmadas: 0,
        montoConfirmado: 0, horasHastaApertura: [], ultimaActividadAt: null,
      };
      porVendedorMap.set(f.vendedorId, v);
    }
    v.creadas += 1;
    if (fueEnviada) v.enviadas += 1;
    if (fueAbierta) v.abiertas += 1;
    if (fueConfirmada) { v.confirmadas += 1; v.montoConfirmado += monto; }
    if (horasAp != null) v.horasHastaApertura.push(horasAp);
    v.ultimaActividadAt = masReciente(
      v.ultimaActividadAt,
      masReciente(
        masReciente(f.createdAt, f.enviadaAt),
        masReciente(f.confirmadaAt, f.ultimaAperturaAt),
      ),
    );

    // ── por semana ──
    const { clave } = semanaISO(f.createdAt);
    const s = porSemanaMap.get(clave) || { creadas: 0, enviadas: 0, confirmadas: 0 };
    s.creadas += 1;
    if (fueEnviada) s.enviadas += 1;
    if (fueConfirmada) s.confirmadas += 1;
    porSemanaMap.set(clave, s);

    // ── destinos ──
    const dest = destinoBase(f.destino);
    if (dest) {
      const d = destinosMap.get(dest) || { destino: dest, creadas: 0, confirmadas: 0 };
      d.creadas += 1;
      if (fueConfirmada) d.confirmadas += 1;
      destinosMap.set(dest, d);
    }
  }

  // ── aperturas: embudo, dispositivos y lectura ──
  const alcanzadas = new Array<number>(SECCIONES.length).fill(0);
  const dispositivosMap = new Map<string, number>();
  const segundosPorLink = new Map<string, number>();
  let conSeccion = 0;

  for (const a of aperturas) {
    const idx = indiceSeccion(a.seccionMax);
    if (idx >= 0) {
      conSeccion += 1;
      // Llegó hasta idx ⇒ pasó por todas las anteriores.
      for (let i = 0; i <= idx; i += 1) alcanzadas[i] += 1;
    }
    const disp = String(a.dispositivo ?? "").trim();
    if (disp) dispositivosMap.set(disp, (dispositivosMap.get(disp) || 0) + 1);
    if (a.segundos != null && a.segundos > 0) {
      // Máximo por link: el beacon manda acumulado, no incrementos.
      const prev = segundosPorLink.get(a.linkId) || 0;
      if (a.segundos > prev) segundosPorLink.set(a.linkId, a.segundos);
    }
  }

  const armadoMediano = mediana(armadoSeg);
  const lecturas = Array.from(segundosPorLink.values());
  const promedioSegundosLectura = lecturas.length
    ? lecturas.reduce((acc, n) => acc + n, 0) / lecturas.length
    : null;

  // ── rango efectivo ──
  const desde = opciones.desde ?? new Date(masViejaMs ?? ahora);
  const hasta = opciones.hasta ?? new Date(masNuevaMs ?? ahora);

  // ── semanas continuas: sin huecos el gráfico de línea no miente ──
  const porSemana: SemanaAnalytics[] = [];
  const cursor = semanaISO(desde).lunes;
  const finSemana = semanaISO(hasta).lunes.getTime();
  for (let t = cursor.getTime(); t <= finSemana; t += SEMANA_MS) {
    const lunes = new Date(t);
    const { clave } = semanaISO(lunes);
    const s = porSemanaMap.get(clave) || { creadas: 0, enviadas: 0, confirmadas: 0 };
    porSemana.push({ semana: clave, desde: lunes.toISOString(), ...s });
  }

  const porVendedor: VendedorAnalytics[] = Array.from(porVendedorMap.values())
    .map((v) => ({
      vendedorId: v.vendedorId,
      nombre: nombreDe(nombres, v.vendedorId),
      creadas: v.creadas,
      enviadas: v.enviadas,
      abiertas: v.abiertas,
      confirmadas: v.confirmadas,
      tasaApertura: redondear(tasa(v.abiertas, v.enviadas), 4),
      tasaConfirmacion: redondear(tasa(v.confirmadas, v.enviadas), 4),
      montoConfirmado: v.montoConfirmado,
      medianaHorasHastaApertura: redondear(mediana(v.horasHastaApertura)),
      ultimaActividadAt: v.ultimaActividadAt ? v.ultimaActividadAt.toISOString() : null,
    }))
    .sort((a, b) =>
      b.confirmadas - a.confirmadas ||
      b.montoConfirmado - a.montoConfirmado ||
      a.nombre.localeCompare(b.nombre, "es"));

  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    truncado: Boolean(opciones.truncado),
    resumen: {
      creadas, enviadas, abiertas, confirmadas, vencidas,
      tasaApertura: redondear(tasa(abiertas, enviadas), 4),
      tasaConfirmacion: redondear(tasa(confirmadas, enviadas), 4),
      montoConfirmado,
      ticketPromedio: confirmadasConMonto
        ? Math.round(montoConfirmado / confirmadasConMonto)
        : null,
      medianaHorasHastaApertura: redondear(mediana(horasApertura)),
      medianaHorasHastaConfirmacion: redondear(mediana(horasConfirmacion)),
      promedioSegundosLectura: promedioSegundosLectura == null
        ? null
        : Math.round(promedioSegundosLectura),
      tiempoArmadoMedianoSeg: armadoMediano == null ? null : Math.round(armadoMediano),
    },
    porVendedor,
    // Las últimas si el rango pasa del tope: lo viejo se resume en la fila de
    // arriba, lo reciente es lo que alguien mira en el gráfico.
    porSemana: porSemana.slice(-SEMANAS_MAX),
    porSemanaRecortada: porSemana.length > SEMANAS_MAX,
    embudo: {
      totalAperturas: aperturas.length,
      conSeccion,
      pasos: SECCIONES.map((s, i) => ({
        clave: s.clave,
        label: s.label,
        aperturas: alcanzadas[i],
        pct: redondear(tasa(alcanzadas[i], conSeccion), 4),
      })),
    },
    topDestinos: Array.from(destinosMap.values())
      .sort((a, b) => b.creadas - a.creadas || b.confirmadas - a.confirmadas)
      .slice(0, DESTINOS_MAX),
    dispositivos: Array.from(dispositivosMap.entries())
      .map(([dispositivo, n]) => ({ dispositivo, aperturas: n }))
      .sort((a, b) => b.aperturas - a.aperturas),
  };
}
