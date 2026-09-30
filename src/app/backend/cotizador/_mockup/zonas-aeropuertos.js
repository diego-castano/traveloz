/* Zona horaria de cada aeropuerto, para la duración de cada vuelo.

   El PNR trae horas locales: MVD 00:43 → PTY 06:08 no son 5 h 25 m sino
   7 h 25 m, porque Panamá está dos horas atrás. Sin la zona de los dos
   aeropuertos la resta miente, así que la columna "Duración" de la tabla
   (TablaVuelos, en telefono.jsx) sale solo cuando las dos están acá.

   Generado el 30/09/2026 desde el dataset abierto de OpenFlights
   (github.com/jpatokal/openflights, data/airports.dat, columna "Tz"), para
   los aeropuertos del catálogo y los que ya usaban las cotizaciones. IST y
   DOH se cargaron a mano: son posteriores al dataset.

   Un aeropuerto que se sume al catálogo y no esté acá no rompe nada: ese
   vuelo sale sin duración. Para sumarlo, agregar la línea con su zona IANA. */
export const ZONAS = {
  ADZ:"America/Bogota", AEP:"America/Buenos_Aires", AKL:"Pacific/Auckland", ALC:"Europe/Madrid",
  AMS:"Europe/Amsterdam", ARN:"Europe/Stockholm", ASU:"America/Asuncion", ATH:"Europe/Athens",
  ATL:"America/New_York", AUA:"America/Aruba", AUH:"Asia/Dubai", BCN:"Europe/Madrid",
  BKK:"Asia/Bangkok", BOG:"America/Bogota", BOM:"Asia/Calcutta", BPS:"America/Fortaleza",
  BRC:"America/Argentina/Salta", BRU:"Europe/Brussels", BSB:"America/Sao_Paulo", BUD:"Europe/Budapest",
  CAI:"Africa/Cairo", CDG:"Europe/Paris", CGH:"America/Sao_Paulo", CJC:"America/Santiago",
  CNF:"America/Sao_Paulo", COR:"America/Cordoba", CPH:"Europe/Copenhagen", CPT:"Africa/Johannesburg",
  CTG:"America/Bogota", CUN:"America/Cancun", CUR:"America/Curacao", CUZ:"America/Lima",
  CWB:"America/Sao_Paulo", DEL:"Asia/Calcutta", DFW:"America/Chicago", DOH:"Asia/Qatar",
  DPS:"Asia/Makassar", DUB:"Europe/Dublin", DXB:"Asia/Dubai", EWR:"America/New_York",
  EZE:"America/Buenos_Aires", FCO:"Europe/Rome", FEN:"America/Fortaleza", FLL:"America/New_York",
  FLN:"America/Sao_Paulo", FOR:"America/Fortaleza", FRA:"Europe/Berlin", FTE:"America/Argentina/Rio_Gallegos",
  GIG:"America/Sao_Paulo", GRU:"America/Sao_Paulo", GYE:"America/Guayaquil", HAV:"America/Havana",
  HEL:"Europe/Helsinki", HKG:"Asia/Hong_Kong", HND:"Asia/Tokyo", IAH:"America/Chicago",
  ICN:"Asia/Seoul", IGR:"America/Cordoba", IST:"Europe/Istanbul", JFK:"America/New_York",
  JNB:"Africa/Johannesburg", JPA:"America/Fortaleza", JRO:"Africa/Dar_es_Salaam", KIN:"America/Jamaica",
  KUL:"Asia/Kuala_Lumpur", LAS:"America/Los_Angeles", LAX:"America/Los_Angeles", LGW:"Europe/London",
  LHR:"Europe/London", LIM:"America/Lima", LIR:"America/Costa_Rica", LIS:"Europe/Lisbon",
  MAD:"Europe/Madrid", MAR:"America/Caracas", MBJ:"America/Jamaica", MCO:"America/New_York",
  MCZ:"America/Fortaleza", MDE:"America/Bogota", MDZ:"America/Mendoza", MEL:"Australia/Hobart",
  MEX:"America/Mexico_City", MIA:"America/New_York", MUC:"Europe/Berlin", MVD:"America/Montevideo",
  MXP:"Europe/Rome", NAP:"Europe/Rome", NAS:"America/Nassau", NAT:"America/Fortaleza",
  NRT:"Asia/Tokyo", OPO:"Europe/Lisbon", ORD:"America/Chicago", ORY:"Europe/Paris",
  OSL:"Europe/Oslo", PMV:"America/Caracas", POA:"America/Sao_Paulo", POP:"America/Santo_Domingo",
  PRG:"Europe/Prague", PTY:"America/Panama", PUJ:"America/Santo_Domingo", PVR:"America/Mexico_City",
  REC:"America/Fortaleza", SCL:"America/Santiago", SDQ:"America/Santo_Domingo", SDU:"America/Sao_Paulo",
  SFO:"America/Los_Angeles", SIN:"Asia/Singapore", SJD:"America/Mazatlan", SJO:"America/Costa_Rica",
  SJU:"America/Puerto_Rico", SSA:"America/Fortaleza", STI:"America/Santo_Domingo", SXM:"America/Curacao",
  SYD:"Australia/Sydney", TLV:"Asia/Jerusalem", UIO:"America/Guayaquil", USH:"America/Argentina/Ushuaia",
  VCE:"Europe/Rome", VIE:"Europe/Vienna", VLC:"Europe/Madrid", VRA:"America/Havana",
  VVI:"America/La_Paz", WAW:"Europe/Warsaw", ZNZ:"Africa/Dar_es_Salaam", ZRH:"Europe/Zurich",
};

const formatos = new Map();

/* Minutos que la zona está adelantada respecto de UTC en ese instante. */
function desfase(zona, t) {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zona, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    formatos.set(zona, f);
  }
  const p = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - t) / 60000;
}

/* La hora de reloj de un aeropuerto, pasada a instante UTC. Dos pasadas por
   si el cambio de horario de verano cae justo entre medio. */
function instante(anio, mes, dia, hh, mm, zona) {
  const reloj = Date.UTC(anio, mes, dia, hh, mm);
  let t = reloj - desfase(zona, reloj) * 60000;
  t = reloj - desfase(zona, t) * 60000;
  return t;
}

const HORA = /^(\d{1,2}):(\d{2})$/;

/* Duración y día de llegada de un tramo ya pasado por conFechas (necesita
   fechaReal): { min, dias }, o null si falta algún dato. Con masDias
   desconocido se asume el mismo día y, si la cuenta da negativa, el
   siguiente. Nada de 24 h o más: eso es un dato mal leído, no un vuelo.

   `dias` sale de las zonas y no de comparar las horas: SCL 01:35 → SYD 06:50
   parece el mismo día y llega al siguiente, porque Sídney va catorce horas
   adelante. Un PNR que no imprime la fecha de llegada dejaba ese +1 afuera. */
export function tiempoDeVuelo(s) {
  const za = ZONAS[s?.origen];
  const zb = ZONAS[s?.destino];
  const f = s?.fechaReal;
  const hs = HORA.exec(String(s?.salida ?? "").trim());
  const hl = HORA.exec(String(s?.llegada ?? "").trim());
  if (!za || !zb || !(f instanceof Date) || Number.isNaN(f.getTime()) || !hs || !hl) return null;
  try {
    const y = f.getFullYear();
    const m = f.getMonth();
    const d = f.getDate();
    const conocido = Number.isFinite(s.masDias);
    const sale = instante(y, m, d, +hs[1], +hs[2], za);
    let llega = instante(y, m, d + (conocido ? s.masDias : 0), +hl[1], +hl[2], zb);
    if (!conocido && llega <= sale) llega += 86400000;
    const min = Math.round((llega - sale) / 60000);
    if (!(min > 0 && min < 24 * 60)) return null;
    const local = new Date(llega + desfase(zb, llega) * 60000);
    const dias = Math.round(
      (Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - Date.UTC(y, m, d)) / 86400000);
    return { min, dias };
  } catch {
    return null;
  }
}

/* 445 → "7h 25m"; 45 → "45m". */
export function textoDuracion(min) {
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
