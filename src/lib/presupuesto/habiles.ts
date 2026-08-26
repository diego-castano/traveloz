// ---------------------------------------------------------------------------
// Horas hábiles del cotizador.
//
// La vigencia de un link se cuenta en horas hábiles: los sábados y los
// domingos NO corren. Una cotización mandada el viernes a las 15:00 con 48 h
// vence el martes a las 15:00, no el domingo a la tarde cuando nadie de la
// agencia puede contestar.
//
// El día de la semana se resuelve SIEMPRE en hora de Montevideo con
// `Intl.DateTimeFormat`: el server corre en UTC (Railway) y el navegador del
// vendedor en la zona que tenga la máquina. Si esto mirara `getDay()`, un
// envío del viernes 22:00 uruguayo caería en sábado para el server y la cuenta
// arrancaría un día tarde.
//
// Este archivo NO importa nada. Lo levanta el server (actions, email) y
// también el bundle público del pasajero, así que cualquier dependencia acá
// viaja al navegador de todo el mundo.
// ---------------------------------------------------------------------------

/** La agencia trabaja en Montevideo; el reloj del negocio es este. */
export const ZONA_NEGOCIO = "America/Montevideo";

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;

const RELOJ = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_NEGOCIO,
  hourCycle: "h23",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DIAS: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Día de la semana (0 = domingo) y milisegundos corridos del día, en Montevideo. */
function reloj(t: number): { dia: number; ms: number } {
  const partes = RELOJ.formatToParts(new Date(t));
  let dia = 1;
  let h = 0;
  let m = 0;
  let s = 0;
  for (const p of partes) {
    if (p.type === "weekday") dia = DIAS[p.value] ?? 1;
    else if (p.type === "hour") h = Number(p.value) % 24;
    else if (p.type === "minute") m = Number(p.value);
    else if (p.type === "second") s = Number(p.value);
  }
  // Los milisegundos no salen del formateador, pero ninguna zona horaria tiene
  // offsets con fracción de segundo: los del instante sirven tal cual.
  const frac = ((t % 1000) + 1000) % 1000;
  return { dia, ms: h * HORA_MS + m * 60_000 + s * 1000 + frac };
}

function esFinDeSemana(dia: number): boolean {
  return dia === 0 || dia === 6;
}

/**
 * La medianoche siguiente en Montevideo.
 *
 * Sumar `24 h - lo corrido` alcanza mientras el huso no se mueva. Uruguay hoy
 * no cambia la hora, pero cuando la cambiaba lo hacía en octubre y en marzo, y
 * el día del cambio dura 23 o 25 horas: la corrección de abajo acomoda el tiro
 * en vez de dejar el vencimiento una hora corrido para siempre.
 */
function medianocheSiguiente(t: number): number {
  let x = t + (DIA_MS - reloj(t).ms);
  for (let i = 0; i < 3; i++) {
    const { ms } = reloj(x);
    if (ms === 0) break;
    x += ms > DIA_MS / 2 ? DIA_MS - ms : -ms;
  }
  return x;
}

/**
 * Corre al lunes 00:00 cualquier instante que caiga en fin de semana.
 *
 * El caso que importa es la frontera exacta: 48 h hábiles desde el miércoles
 * 00:00 terminan justo en el viernes 24:00, que es el sábado 00:00 y se lee
 * "vence el sábado" — el día que la regla de horas hábiles existe para evitar.
 * Un vencimiento en el minuto muerto entre el viernes y el sábado no le sirve
 * a nadie: lo que corresponde es el lunes que abre la agencia. Vale igual para
 * cualquier instante que quede adentro del fin de semana por redondeo.
 */
function corridoAlLunes(t: number): number {
  let x = t;
  // Sábado → domingo → lunes. Dos vueltas alcanzan; la tercera es la red.
  for (let i = 0; i < 3 && esFinDeSemana(reloj(x).dia); i++) x = medianocheSiguiente(x);
  return x;
}

function aMs(v: Date | number | string): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return new Date(v).getTime();
}

/**
 * `desde` + `horas` hábiles.
 *
 * El sábado y el domingo no consumen nada: el reloj se detiene el sábado a las
 * 00:00 y arranca de vuelta el lunes a las 00:00. Arrancar un fin de semana es
 * legal — la cuenta empieza el lunes (sábado 12:00 + 24 h = martes 00:00).
 */
export function sumarHorasHabiles(desde: Date | number | string, horas: number): Date {
  const inicio = aMs(desde);
  if (!Number.isFinite(inicio)) return new Date(NaN);

  let restante = Number(horas) * HORA_MS;
  if (!Number.isFinite(restante) || restante <= 0) return new Date(inicio);

  let t = inicio;
  // 5000 tramos = más de trece años de sábados; la vigencia tope son 30 días.
  for (let guardia = 0; restante > 0 && guardia < 5000; guardia++) {
    const finDelDia = medianocheSiguiente(t);
    if (esFinDeSemana(reloj(t).dia)) {
      t = finDelDia;
      continue;
    }
    const tramo = finDelDia - t;
    // El `>=` deja que el resultado caiga exactamente en el viernes 24:00, que
    // es el sábado 00:00: de ahí el corrimiento al lunes.
    if (tramo >= restante) return new Date(corridoAlLunes(t + restante));
    restante -= tramo;
    t = finDelDia;
  }
  return new Date(corridoAlLunes(t));
}

/**
 * Horas hábiles entre dos instantes. Negativo si `b` quedó atrás de `a`, que
 * es como el listado dice "venció hace 6 h".
 *
 * Devuelve `NaN` cuando alguna fecha es inválida y también cuando la distancia
 * supera la guardia de vueltas (20.000 días ≈ 54 años, o sea una fecha rota en
 * la base). Un número parcial sería peor: el semáforo lo compararía contra 24
 * y sacaría conclusiones de una cuenta que quedó por la mitad. `NaN` no pasa
 * ninguna comparación, así que la fila simplemente no entra en ningún chip.
 */
export function horasHabilesEntre(a: Date | number | string, b: Date | number | string): number {
  const ta = aMs(a);
  const tb = aMs(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return NaN;
  if (tb === ta) return 0;
  if (tb < ta) return -horasHabilesEntre(b, a);

  let t = ta;
  let habil = 0;
  for (let guardia = 0; t < tb && guardia < 20000; guardia++) {
    const corte = Math.min(medianocheSiguiente(t), tb);
    if (!esFinDeSemana(reloj(t).dia)) habil += corte - t;
    t = corte;
  }
  // Se agotó la guardia sin llegar a `tb`: la cuenta quedó incompleta y no hay
  // número honesto que devolver.
  if (t < tb) return NaN;
  return habil / HORA_MS;
}

// ---------------------------------------------------------------------------
// Cómo se cuenta en texto
// ---------------------------------------------------------------------------

const FECHA_LARGA = new Intl.DateTimeFormat("es-UY", {
  timeZone: ZONA_NEGOCIO,
  hourCycle: "h23",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "martes 26 de agosto a las 15:00" — la fecha concreta del vencimiento, en
 * hora de Montevideo. Es lo que va al email y a la ficha del pasajero: "48
 * horas" obliga a hacer la cuenta y encima la cuenta ahora salta el fin de
 * semana.
 */
export function textoVencimiento(fecha: Date | number | string): string {
  const t = aMs(fecha);
  if (!Number.isFinite(t)) return "";
  const p = FECHA_LARGA.formatToParts(new Date(t));
  const dato = (tipo: string) => p.find((x) => x.type === tipo)?.value ?? "";
  const dia = dato("weekday");
  const num = dato("day");
  const mes = dato("month");
  const hora = `${dato("hour")}:${dato("minute")}`;
  if (!dia || !num || !mes) return "";
  return `${dia} ${num} de ${mes} a las ${hora}`;
}

/** "martes 25" — el día en que salió, para el recordatorio. */
export function textoDiaCorto(fecha: Date | number | string): string {
  const t = aMs(fecha);
  if (!Number.isFinite(t)) return "";
  const p = FECHA_LARGA.formatToParts(new Date(t));
  const dato = (tipo: string) => p.find((x) => x.type === tipo)?.value ?? "";
  const dia = dato("weekday");
  const num = dato("day");
  return dia && num ? `${dia} ${num}` : "";
}

/** "48 horas hábiles" — la unidad, sin la explicación. */
export function textoHorasHabiles(horas: number): string {
  const n = Math.round(Number(horas));
  if (!Number.isFinite(n) || n <= 0) return "0 horas hábiles";
  return `${n} ${n === 1 ? "hora hábil" : "horas hábiles"}`;
}

/** La regla en una línea, para donde haya lugar de explicarla. */
export const REGLA_HABILES = "no corren sábados ni domingos";

/**
 * Las condiciones del pie las escribe el máster con `{vigencia}` adentro y el
 * marcador lo resuelve la ficha del pasajero (telefono.jsx) con el número de
 * horas. Acá la línea se reescribe ANTES para que ese reemplazo termine
 * diciendo "48 horas hábiles (no corren sábados ni domingos)" sin que el
 * máster tenga que editar nada ni la ficha sepa de esta regla.
 */
export function condicionesConHabiles(lineas: readonly string[] | null | undefined): string[] {
  return (lineas ?? []).map((cruda) => {
    const linea = String(cruda);
    if (!linea.includes("{vigencia}")) return linea;
    if (/hábil/i.test(linea)) return linea;
    if (/\{vigencia\}\s*horas?\b/i.test(linea)) {
      return linea.replace(
        /\{vigencia\}\s*horas?\b/i,
        `{vigencia} horas hábiles (${REGLA_HABILES})`,
      );
    }
    return `${linea} (horas hábiles: ${REGLA_HABILES})`;
  });
}
