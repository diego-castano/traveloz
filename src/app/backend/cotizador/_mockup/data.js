import { Send, Eye, CheckCheck, PenLine, Clock3 } from "lucide-react";
import { horasHabilesEntre, textoVencimiento } from "@/lib/presupuesto/habiles";

/* ═══════════════════════════════════════════════════════════════════════════
   VOCABULARIO Y HELPERS DEL COTIZADOR

   Acá quedan las listas cerradas que el cliente definió (regímenes, cabinas,
   tipos de tarifa) y la aritmética del precio. Los datos —paquetes, hoteles,
   ciudades, aeropuertos, aerolíneas, cotizaciones, plantillas, clientes— salen
   de la base: catálogo por `useCatalogoCotizador()`, el resto por las server
   actions de presupuesto.
   ═══════════════════════════════════════════════════════════════════════════ */

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MES_AB = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
/* El año con el que arranca toda cotización nueva: el que corre. */
const ANIO_ACTUAL = new Date().getFullYear();

/* Fotos: se generan por semilla para que cualquier "original" quede en la
   misma relación de aspecto — es exactamente lo que pidió Santi. */
const PALETAS = [
  ["#F4A261","#E76F51","#2A3D66"], ["#48CAE4","#0077B6","#03045E"],
  ["#F7B267","#F25C54","#5A189A"], ["#95D5B2","#2D6A4F","#1B4332"],
  ["#FFC8DD","#BDB2FF","#4361EE"], ["#FFD166","#EF476F","#073B4C"],
  ["#A8DADC","#457B9D","#1D3557"], ["#FFCB77","#FE6D73","#17C3B2"],
];
function fotoBg(seed = 0) {
  const p = PALETAS[Math.abs(seed) % PALETAS.length];
  return `radial-gradient(120% 90% at 22% 12%, ${p[0]} 0%, transparent 55%),
          radial-gradient(110% 80% at 82% 30%, ${p[1]} 0%, transparent 60%),
          linear-gradient(168deg, ${p[1]} 0%, ${p[2]} 100%)`;
}

/* Los hoteles ya no viven acá: salen del catálogo real (alojamientos del
   panel) por `useCatalogoCotizador()` en ./catalogo.js. */

/* Orden y redacción exactos que pidió el cliente en la reunión */
const REGIMENES = ["Solo alojamiento (sin comidas incluidas)","Desayuno incluido","Media pensión (sin bebidas)","Pensión completa (sin bebidas)","All Inclusive"];
const CABINAS = ["Cabina Turista","Cabina Premium Economy","Cabina Ejecutiva","Primera Clase"];
const EQUIPAJES = [
  "Artículo personal",
  "Artículo personal + Carry-On",
  "Artículo personal + Carry-On + Equipaje de bodega",
];
/* Hasta 15: el cliente también vende apartamentos */
const OCUPACIONES = ["Single","Doble", ...Array.from({ length:13 }, (_, i) => `${i + 3} personas`)];
/* "los tres casilleros sí o sí": adulto, menor e infante — más la familiar */
const TARIFA_TIPOS = ["Por adulto","Por menor","Por infante","Por familia","Otro"];

/* Servicios habituales precargados por categoría */
const SUG = {
  aereo: ["Aéreo ida y vuelta con equipaje de mano","Aéreo ida y vuelta con valija en bodega 23kg","Equipaje de mano 10kg incluido","Tasas e impuestos incluidos"],
  traslado: ["Traslado de llegada","Traslado de salida","Traslado llegada y salida","Traslado llegada, salida e interhotel"],
  alojamiento: ["Alojamiento en base doble","Impuestos hoteleros incluidos","Early check-in sujeto a disponibilidad"],
  vehiculo: ["Alquiler de auto categoría económica","Alquiler de auto categoría SUV","Seguro de cobertura total del vehículo"],
  seguro: ["Seguro de Asistencia al Viajero"],
  opcionales: ["Excursión Cristo Redentor y Pan de Azúcar","City tour de medio día","Paseo en catamarán","Entradas a parques temáticos","Cena show típica"],
};
const MODALIDADES = ["Regular","Privado"];
const SUG_ALL = Object.entries(SUG).flatMap(([cat, arr]) => arr.map((texto) => ({ cat, texto })));

/* Las ciudades también salen del catálogo real (Pais → Ciudad). */

/* Los aeropuertos y las aerolíneas salen de las tablas IATA de la base
   (modelos Aeropuerto y Aerolinea). Entran por el contexto: `useAeropuertos()`
   y `useAerolineas()` en ./contexto.js. */

/* Código Amadeus real que mandó Gero (Copa, MVD–PUJ vía Panamá).
   Las líneas de ruido —DUPLICATE, ETKT, SEE RTSVC— van tal cual: el parser las saltea. */
const PNR_DEMO = `RP/MVDUY2182/
  1  CM 284 Y 01OCT 4*MVDPTY DK1  0043 0608  01OCT  E  0 7M9 M
     DUPLICATE LEG-UA7120
     ETKT ELIGIBLE
     SEE RTSVC
  2  CM 177 Y 01OCT 4*PTYPUJ DK1  0704 1048  01OCT  E  0 7M8 M
     /PASSENGER CHECK IN /CM TERMINAL 2
     ETKT ELIGIBLE
     SEE RTSVC
  3  CM 426 Y 08OCT 4*PUJPTY DK1  1255 1434  08OCT  E  0 7M8 M
     ETKT ELIGIBLE
     SEE RTSVC
  4  CM 283 Y 08OCT 4*PTYMVD DK1  1551 0107  09OCT  E  0 7M9 M
     DUPLICATE`;

/* Los paquetes salen del catálogo real: `useCatalogoCotizador().paquetes`
   arma la misma forma con lo que ya tiene en memoria PackageProvider. */

/* Las plantillas viven en PlantillaPresupuesto y los clientes salen del
   historial de cotizaciones (`buscarEnHistorial`). Nada de listas fijas acá. */

/* Los vendedores entran por props y bajan por el contexto (./contexto.js).
   Este registro existe solo para lo que necesita este módulo, que no es un
   componente y no puede leer el contexto: descartar el nombre del vendedor
   cuando se parsea un pegado de WhatsApp ("Hola Agustina!"). */
let VENDEDORES_REG = [];

function vendedoresRegistrados() { return VENDEDORES_REG; }

/** La llama el cotizador al montar, con la lista real del panel. */
function registrarVendedores(lista) {
  VENDEDORES_REG = Array.isArray(lista) ? lista : [];
}

/* Horas HÁBILES que le quedan de vida al link. Negativo = ya venció. null =
   nunca se envió, así que el reloj todavía no arrancó.

   Hábiles, no de reloj: el vencimiento lo calculó el server salteando sábados
   y domingos (src/lib/presupuesto/habiles.ts) y la cuenta regresiva tiene que
   contar igual. Si acá se restaran horas corridas, un link emitido el viernes
   mostraría "quedan 9 h" el sábado a la mañana y seguiría abriendo el martes.
 */
function horasDeVigencia(r) {
  if (!r?.expiraAt) return null;
  const t = new Date(r.expiraAt).getTime();
  if (!Number.isFinite(t)) return null;
  const ahora = Date.now();
  const habiles = horasHabilesEntre(ahora, t);
  /* El SIGNO lo decide el reloj real, que es lo que mira el server cuando el
     pasajero abre el link; lo hábil es cuánto queda. Sin esto, un link viejo
     —emitido antes de esta regla, con vencimiento un domingo— aparecía como
     vencido el sábado y sin embargo seguía abriendo. */
  if (t > ahora) return Math.max(habiles, Number.EPSILON);
  if (t < ahora) return Math.min(habiles, -Number.EPSILON);
  return 0;
}

/* Horas hábiles desde que salió. Sirve para el "+24 h sin abrir": un envío del
   viernes a las 18:00 no está "hace 40 h" el domingo, está hace 6 h hábiles. */
function horasHabilesDesdeEnvio(r) {
  if (r?.hEnvioHabil != null) return r.hEnvioHabil;
  if (!r?.enviadaAt) return r?.hEnvio ?? null;
  const t = new Date(r.enviadaAt).getTime();
  if (!Number.isFinite(t)) return r?.hEnvio ?? null;
  return horasHabilesEntre(t, Date.now());
}

/* "vence el martes 26 de agosto a las 15:00" para la fila que ya tiene link. */
function textoDeVencimiento(r) {
  return r?.expiraAt ? textoVencimiento(r.expiraAt) : "";
}

/* Semáforo de seguimiento: cuánto hace que se envió, si el pasajero la abrió y
   cuánto le queda de vigencia al link. */
function semaforo(r) {
  if (r.estado === "vencida")    return { c:"#F43E55", l:"Vencida",
    d: r.aperturas > 0
      ? `La abrió ${r.aperturas === 1 ? "una vez" : r.aperturas + " veces"} pero el link ya venció: si vuelve a entrar se encuentra con la pantalla de vencida. Extendé la vigencia o reactivala.`
      : "El link venció sin apertura. Reactivalo con un recordatorio o marcá el estado a mano si el seguimiento sigue por otro canal." };
  if (r.estado === "borrador")   return { c:"#B0B4CD", l:"Borrador",
    d:"Todavía no se envió al pasajero. El semáforo arranca a correr cuando la compartas." };
  if (r.estado === "confirmada") return { c:"#2A9E8E", l:"Confirmada",
    d:"Cotización confirmada. Lista para pasar al flujo de reserva." };
  if (r.aperturas > 0)           return { c:"#2A9E8E", l:"Abierta",
    d:`El pasajero la abrió ${r.aperturas === 1 ? "una vez" : r.aperturas + " veces"}. Buen momento para el seguimiento.` };
  if (r.hEnvio == null)          return { c:"#B0B4CD", l:"—", d:"Sin datos de envío." };
  const restan = horasDeVigencia(r);
  if (restan != null && restan <= 0) return { c:"#F43E55", l:"Link vencido",
    d:"La vigencia se cumplió y nadie la abrió. Reactivalo y reenviá, o llamá al pasajero." };
  const desdeEnvio = horasHabilesDesdeEnvio(r);
  if (desdeEnvio != null && desdeEnvio < 24) return { c:"#45D4C0", l:"En ventana",
    d:"Enviada hace menos de 24 h hábiles y todavía sin abrir. Normal — la mayoría se abre el mismo día." };
  return { c:"#E8A13C", l:"Sin abrir +24 h",
    d:"Pasaron más de 24 h hábiles sin apertura (el fin de semana no cuenta). Conviene un recordatorio corto por WhatsApp." };
}
/* En qué chip del resumen cae una fila. Mismo reparto que `resumenSemaforo()`
   en presupuesto.actions.ts — si esto y aquello se separan, el badge del shell
   dice un número y la pantalla muestra otro.

     roja      vencida y el pasajero nunca la abrió
     amarilla  enviada, sin abrir, +24 h HÁBILES
     verde     confirmada, o abierta con el link todavía vivo
     borrador  nunca salió

   Devuelve null para lo que no pide nada hoy: la enviada de hace tres horas y
   la vencida que el pasajero sí llegó a abrir. */
function bucketSemaforo(r) {
  const est = estadoEfectivo(r);
  if (est === "borrador")   return "borrador";
  if (est === "confirmada") return "verde";
  if (est === "vencida")    return r.aperturas > 0 ? null : "roja";
  if (r.aperturas > 0)      return "verde";
  const desde = horasHabilesDesdeEnvio(r);
  return desde != null && desde >= 24 ? "amarilla" : null;
}

function fmtHace(h) { if (h == null) return "—"; if (h <= 0) return "recién";
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`; }


/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const uid = (() => { let n = 0; return (p = "id") => `${p}_${++n}_${Math.random().toString(36).slice(2, 6)}`; })();
/* Los hoteles escritos a mano, los favoritos y la búsqueda por id se mudaron a
   `useCatalogoCotizador()` (./catalogo.js): dependen del catálogo real, no de
   una constante de módulo. Se leen del contexto con `useCatalogo()`. */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function parseISO(s) { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(iso, n) { const d = parseISO(iso); if (!d) return ""; d.setDate(d.getDate() + n); return toISO(d); }
function fmtCorto(iso) { const d = parseISO(iso); return d ? `${d.getDate()} ${MES_AB[d.getMonth()]}` : "—"; }
function fmtLargo(iso) { const d = parseISO(iso); return d ? `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}` : "—"; }
function money(n) { const v = Number(n); return "USD " + (Number.isFinite(v) ? Math.round(v) : 0).toLocaleString("es-UY"); }
/* Piso del markup si el máster todavía no cargó su factor. Mismo número que
   FACTOR_DEFAULT en src/lib/presupuesto/schema.ts: si se separan, el precio de
   la lista deja de coincidir con el del editor. */
const FACTOR_DEFAULT = 0.88;
/* Modelo de markup del sistema: Precio Venta = Neto ÷ Factor.
   Un factor fuera de (0, 1] es un dato roto, no un descuento: se cae al neto,
   igual que calcularVenta() en src/lib/utils.ts y venta() en derivados.ts.
   Devolver 0 mostraba el viaje regalado en la lista y en el editor. */
function venta(neto, factor) {
  const f = Number(factor);
  const n = Number(neto);
  if (!Number.isFinite(n)) return 0;
  if (!(f > 0) || f > 1) return n;
  return n / f;
}
function margenPct(factor) { return Math.round((1 - Number(factor)) * 1000) / 10; }

/* ── Servicios con los que arranca toda cotización nueva ─────────────────
   Los que llevan `auto` siguen a lo que se carga arriba (noches y cabina/
   equipaje) hasta que el vendedor los edita a mano. */
function serviciosDefault(noches = 7) {
  return [
    { id:uid("srv"), categoria:"aereo",       texto:"Aéreo ida y vuelta con artículo personal y equipaje de mano", ciudad:null, modalidad:null, auto:"aereo" },
    { id:uid("srv"), categoria:"traslado",    texto:"Traslados de llegada y salida",           ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"alojamiento", texto:`${String(noches).padStart(2, "0")} noches de alojamiento`, ciudad:null, modalidad:null, auto:"noches" },
    { id:uid("srv"), categoria:"seguro",      texto:"Seguro de Asistencia al Viajero",         ciudad:null, modalidad:null },
  ];
}

/* ── Opción hotelera: habitaciones, y dentro de cada una sus tarifas ───── */
/* El factor por defecto lo fija el máster en los ajustes del cotizador; quien
   llama pasa `ajustes.factorDefault`. El 0,88 es el piso histórico por si la
   fila del setting no está. */
function tarifaNueva(tipo = "Por adulto", factor = FACTOR_DEFAULT) {
  /* venta null → se calcula sola (neto ÷ factor); un número → pisada a mano */
  return { id:uid("tf"), tipo, tipoLibre:"", neto:0, venta:null, factor: Number(factor) || FACTOR_DEFAULT };
}
function habitacionNueva(ocupacion = "Doble", factor = FACTOR_DEFAULT) {
  return { id:uid("hab"), ocupacion, tipo:"Estándar", tarifas:[tarifaNueva("Por adulto", factor)] };
}
/* cada tarifa lleva su propio factor; el de la opción quedó solo de respaldo
   para las tarifas viejas que todavía no lo tienen */
function ventaTarifa(t, factorFallback) {
  if (t == null) return 0;
  if (t.venta !== null && t.venta !== "" && t.venta !== undefined) return Number(t.venta) || 0;
  return venta(t.neto, t.factor ?? factorFallback ?? FACTOR_DEFAULT);
}
function etiquetaTarifa(t) { return t.tipo === "Otro" ? (t.tipoLibre?.trim() || "Otro") : t.tipo; }
/* precio principal de una opción: primera tarifa de la primera habitación */
function precioOpcion(o) {
  const t = o?.habitaciones?.[0]?.tarifas?.[0];
  if (t) return ventaTarifa(t, o.factor);
  /* La ficha del pasajero recibe el contenido recortado por contenidoPublico():
     ahí no hay neto ni factor, el precio de la opción ya viene resuelto. En el
     editor esta rama no corre nunca porque `venta` no existe en las opciones. */
  if (o?.venta !== null && o?.venta !== undefined && o?.venta !== "") return Number(o.venta) || 0;
  return venta(o?.neto, o?.factor);   // fallback al modelo viejo
}

/* Normaliza cualquier pegado a texto plano — mata el problema de tipografías */
function limpiarPegado(txt) {
  return String(txt)
    .replace(/\r/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/* Parser de PNR. Si no reconoce nada devuelve [] y la UI conserva lo pegado.
   Tolera las dos formas que llegan del GDS:
     LA1339 K 15OCT 4 MVDGRU HK2  0755 0940   (día de semana suelto)
     CM 284 Y 01OCT 4*MVDPTY DK1  0043 0608   (asterisco pegado al día, estado DK) */
function parsePNR(raw, aerolineas = {}) {
  const out = [];
  const lineas = String(raw).split("\n");
  const re = /([A-Z0-9]{2})\s*(\d{2,4})\s+([A-Z])?\s*(\d{2})([A-Z]{3})\s+\d?\*?\s*([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}(\d+)?\s+(\d{4})\s+(\d{4})/;
  const MES3 = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11,
                 ENE:0, ABR:3, AGO:7, DIC:11 };
  for (const l of lineas) {
    const m = l.toUpperCase().match(re);
    if (!m) continue;
    const [, cia, nro, , dd, mmm, org, dst, , hs, hl] = m;
    if (!(mmm in MES3)) continue;
    out.push({
      id: uid("vl"),
      cia, nro,
      aerolinea: aerolineas[cia] || cia,
      dia: Number(dd), mes: MES3[mmm],
      origen: org, destino: dst,
      salida: `${hs.slice(0, 2)}:${hs.slice(2)}`,
      llegada: `${hl.slice(0, 2)}:${hl.slice(2)}`,
    });
  }
  return out;
}

/* ── adaptador del lector con IA ─────────────────────────────────────────
   `POST /api/cotizador/leer-itinerario` devuelve los vuelos ya planos (los
   arma `trayectosAVuelos` en src/lib/presupuesto/itinerario.ts) con un campo
   de más: `fecha` en ISO, que el regex de `parsePNR` no puede sacar porque el
   GDS escribe "01OCT" sin año. Estas dos funciones son el puente. */

const ES_ISO = /^\d{4}-\d{2}-\d{2}$/;

/* Fecha de un vuelo: la ISO si la trae, y si no la próxima ocurrencia futura
   del día/mes, que es lo que asumía el editor cuando solo existía el parser. */
function fechaDeVuelo(v) {
  if (!v) return "";
  const f = String(v.fecha || "");
  if (ES_ISO.test(f)) return f;
  const dia = Number(v.dia), mes = Number(v.mes);
  if (!Number.isFinite(dia) || !Number.isFinite(mes)) return "";
  const anio = mes >= new Date().getMonth() ? ANIO_ACTUAL : ANIO_ACTUAL + 1;
  return toISO(new Date(anio, mes, dia));
}

/* ¿La lectura de la IA le gana a la del parser local? Gana si encontró más
   tramos, o los mismos pero con la fecha completa. Empate = se queda lo que ya
   está aplicado, así el itinerario no parpadea delante del vendedor. */
function itinerarioMasCompleto(local, ia) {
  if (!Array.isArray(ia) || !ia.length) return false;
  if (!Array.isArray(local) || !local.length) return true;
  if (ia.length !== local.length) return ia.length > local.length;
  const conFecha = (l) => l.filter((v) => ES_ISO.test(String(v?.fecha || ""))).length;
  return conFecha(ia) > conFecha(local);
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2 · LECTURA DE CONSULTAS DE WHATSAPP
   Todo acá es JavaScript común: no hay ningún servicio detrás. Alcanza para la
   demo porque el vendedor pega textos cortos y siempre parecidos.
   ═══════════════════════════════════════════════════════════════════════════ */

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STOP_IA = new Set(["de","la","el","los","las","del","y","en","a","al","con"]);
const NUM_PAL = { un:1, una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10 };
const numPal = (x) => (NUM_PAL[x] != null ? NUM_PAL[x] : Number(x)) || 0;

/* palabra suelta, no pedazo de otra palabra */
function palabraEn(t, w) {
  const e = String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${e}([^a-z0-9]|$)`).test(t);
}

function detectarMes(t) {
  for (let i = 0; i < MESES.length; i++) if (palabraEn(t, norm(MESES[i]))) return i;
  for (let i = 0; i < MES_AB.length; i++) if (MES_AB[i] !== "mar" && palabraEn(t, MES_AB[i])) return i;
  return null;
}

function detectarPax(t) {
  let adultos = null, menores = 0;
  const ad = t.match(/(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s+(adultos?|personas?|pasajeros?|pax)\b/);
  if (ad) adultos = numPal(ad[1]);
  if (adultos == null) { const s = t.match(/somos\s+(\d+|dos|tres|cuatro|cinco|seis|siete|ocho)\b/); if (s) adultos = numPal(s[1]); }
  if (adultos == null && /(mi (senora|esposa|esposo|marido|mujer|novia|novio|pareja))|en pareja|los dos/.test(t)) adultos = 2;
  const re = /(\d+|un|una|dos|tres|cuatro)\s+(nenes?|nenas?|ninos?|ninas?|menores?|chicos?|chicas?|hijos?|bebes?)\b/g;
  let m; while ((m = re.exec(t))) menores += numPal(m[1]);
  return { adultos, menores };
}

function detectarNoches(t) {
  const n = t.match(/(\d+)\s*noches?\b/);            if (n) return Number(n[1]);
  const s = t.match(/(\d+|una|dos|tres)\s*semanas?\b/); if (s) return numPal(s[1]) * 7;
  const d = t.match(/(\d+)\s*dias?\b/);              if (d) return Math.max(1, Number(d[1]) - 1);
  return null;
}

/* v2E · destinos amplios: "Brasil" o "el Caribe" no eligen un paquete solo —
   suman puntaje a todos los suyos y el vendedor elige desde cuál armar. Los
   alias y sus ciudades salen de la geografía real (Región → País → Ciudad):
   los arma `useCatalogoCotizador().regionesIA`. */

/* puntaje: ciudad completa vale más que una palabra suelta; la región suma a
   todos sus paquetes; el mes que coincide desempata. Devuelve TODOS los que
   encajan, ordenados de mejor a peor. */
function detectarPaquetes(catalogo, t, mes) {
  const paquetes = catalogo?.paquetes || [];
  const regiones = (catalogo?.regionesIA || []).filter((r) =>
    r.alias.some((a) => (a.includes(" ") ? t.includes(a) : palabraEn(t, a))));
  const enRegion = new Set(regiones.flatMap((r) => r.ciudades).map(norm));
  const lista = [];
  for (const p of paquetes) {
    let sc = 0;
    for (const d of p.destinos) {
      const c = norm(d.ciudad);
      if (t.includes(c)) { sc += 3; continue; }
      const toks = c.split(/\s+/).filter((w) => w.length >= 3 && !STOP_IA.has(w));
      const hits = toks.filter((w) => palabraEn(t, w)).length;
      if (hits) sc += hits === toks.length ? 3 : 1.5;
    }
    if (p.destinos.some((d) => enRegion.has(norm(d.ciudad)))) sc += 2;
    if (sc > 0) {
      const pal = norm(p.nombre).split(/\s+/).filter((w) => w.length >= 5 && !STOP_IA.has(w));
      sc += pal.filter((w) => palabraEn(t, w)).length * 0.5;
      if (mes != null && p.mes === mes) sc += 1.5;
    }
    if (sc >= 1.5) lista.push({ p, sc });
  }
  return lista.sort((a, b) => b.sc - a.sc);
}

/* un teléfono adentro de la consulta identifica al cliente (≥8 dígitos,
   así un "2026" suelto no se confunde con un número) */
function detectarTelefono(crudo) {
  const m = crudo.match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  return m.map((x) => x.trim()).find((x) => x.replace(/\D/g, "").length >= 8) || "";
}

function detectarDestino(catalogo, t, crudo) {
  const pool = [...new Set([
    ...(catalogo?.ciudades || []),
    ...(catalogo?.paquetes || []).flatMap((p) => p.destinos.map((d) => d.ciudad)),
  ])].filter(Boolean);
  for (const c of pool) if (t.includes(norm(c))) return c;
  for (const c of pool) {
    const toks = norm(c).split(/\s+/).filter((w) => w.length >= 3 && !STOP_IA.has(w));
    if (toks.length && toks.some((w) => palabraEn(t, w))) return c;
  }
  const m = crudo.match(/(?:ir a|viajar a|vamos a|escaparnos a|viaje a|conocer)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?)/);
  return m ? m[1] : "";
}

/* el "Hola Agustina!" del arranque es el vendedor, no el pasajero: se descarta */
function detectarCliente(crudo) {
  const m = crudo.match(/(?:soy|me llamo|mi nombre es|te habla|habla)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/);
  if (!m) return "";
  const n = m[1];
  if (vendedoresRegistrados().some((v) => norm(v.nombre).split(" ")[0] === norm(n))) return "";
  return n;
}

function etiquetaPax(adultos, menores) {
  const p = [];
  if (adultos) p.push(`${adultos} ${adultos === 1 ? "adulto" : "adultos"}`);
  if (menores) p.push(`${menores} ${menores === 1 ? "menor" : "menores"}`);
  return p.join(" + ");
}

function detectarConsulta(texto, catalogo) {
  const crudo = limpiarPegado(texto);
  const t = norm(crudo);
  const mes = detectarMes(t);
  const hoy = new Date();
  const explicito = crudo.match(/\b(20\d{2})\b/);
  const base = hoy.getFullYear();
  let anio = explicito ? Number(explicito[1])
    : mes != null && mes < hoy.getMonth() ? base + 1 : base;
  if (anio !== base && anio !== base + 1) anio = base;

  const rank = detectarPaquetes(catalogo, t, mes);
  const candidatos = rank.map((x) => x.p);
  /* un solo claro ganador precarga directo; empate o destino amplio → elige el vendedor */
  const paquete =
    rank.length === 1 || (rank.length > 1 && rank[0].sc >= rank[1].sc + 2) ? rank[0].p : null;
  const destino = paquete ? (paquete.destinos[0]?.ciudad || paquete.destino || "")
    : detectarDestino(catalogo, t, crudo);
  const { adultos, menores } = detectarPax(t);
  const noches = detectarNoches(t);
  const cliente = detectarCliente(crudo);
  const telefono = detectarTelefono(crudo);

  const chips = [];
  if (destino) chips.push(destino);
  else if (candidatos.length > 1) chips.push(`${candidatos.length} paquetes posibles`);
  if (mes != null) chips.push(`${MESES[mes]} ${anio}`);
  const pax = etiquetaPax(adultos, menores);
  if (pax) chips.push(pax);
  if (noches) chips.push(`${noches} noches`);
  if (telefono) chips.push(telefono);

  return { texto:crudo, paquete, candidatos, destino, mes, anio, adultos, menores, noches,
    cliente, telefono, paxTxt:pax, chips };
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2B · MEMORIA DEL VENDEDOR
   Teléfonos que matchean aunque el formato cambie, la última cotización de cada
   cliente, los servicios que más se repiten y los hoteles ya cotizados por ciudad.
   ═══════════════════════════════════════════════════════════════════════════ */

/* "+598 99 123 456", "099123456" y "99123456" son el mismo teléfono */
function telDigitos(s) {
  return String(s || "").replace(/\D/g, "").replace(/^0*598/, "").replace(/^0+/, "");
}
/* ¿lo que pegaron parece un teléfono? dígitos, +, espacios, guiones y paréntesis */
function pareceTel(s) {
  const t = String(s || "").trim();
  return !!t && /^[+\d][\d\s().+-]*$/.test(t) && t.replace(/\D/g, "").length >= 3;
}
/* el cliente escribe cualquier formato; comparamos solo los dígitos que importan */
function matchTel(guardado, buscado) {
  const b = telDigitos(buscado); if (b.length < 3) return false;
  return telDigitos(guardado).includes(b);
}

/* Las cotizaciones anteriores de un cliente las busca `buscarEnHistorial` en
   el server (matchea el teléfono por dígitos, igual que telDigitos de acá).
   "Cotizados antes en X" lo resuelve `useCatalogoCotizador().hotelesCotizadosEn`.
   El texto del mensaje automático sale de los ajustes del máster
   (`ajustes.plantillaMensaje`), no de una constante. */

/* {nombre} y {link} se completan al mostrar; si no hay nombre, "Hola ," queda "Hola,".
   Si el vendedor no tiene link de datos (sin slug, o apagado en Perfiles) se va
   la línea entera: nunca imprimimos "{link}" crudo al pasajero. */
function renderPlantilla(tpl, nombre, link) {
  const conNombre = String(tpl || "").replace(/\{nombre\}/g, String(nombre || "").trim());
  const conLink = link
    ? conNombre.replace(/\{link\}/g, String(link))
    : conNombre.split("\n").filter((l) => !l.includes("{link}")).join("\n")
        .replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "");
  return conLink.replace(/Hola\s+,/, "Hola,");
}

const ESTADOS = {
  borrador:   { l:"Borrador",   tone:"n",      Icon:PenLine },
  enviada:    { l:"Enviada",    tone:"violet", Icon:Send },
  abierta:    { l:"Abierta",    tone:"teal",   Icon:Eye },
  vencida:    { l:"Vencida",    tone:"coral",  Icon:Clock3 },
  confirmada: { l:"Confirmada", tone:"teal",   Icon:CheckCheck },
};
/* Vencida automática: enviada o abierta con la vigencia cumplida — salvo que
   el vendedor haya pisado el estado a mano. No se persiste: se calcula contra
   `expiraAt`, que es lo que guarda el server al emitir el link.

   Una ABIERTA también vence: desde que existe el link público, "abierta" quiere
   decir que el pasajero entró, no que el link siga sirviendo. Si la vigencia se
   cumplió, la próxima vez que toque el link se va a encontrar con la pantalla
   de vencida, y el seguimiento tiene que decir lo mismo que ve el pasajero.
   Misma regla que `estadoEfectivoDe` en presupuesto.actions.ts. */
function estadoEfectivo(r) {
  if (r.estadoManual) return r.estadoManual;
  if (r.estado === "enviada" || r.estado === "abierta") {
    const restan = horasDeVigencia(r);
    if (restan != null && restan <= 0) return "vencida";
  }
  return r.estado;
}

export {
  MESES, MES_AB, ANIO_ACTUAL, PALETAS, fotoBg, REGIMENES, SUG, MODALIDADES,
  CABINAS, EQUIPAJES, OCUPACIONES, TARIFA_TIPOS, FACTOR_DEFAULT,
  serviciosDefault, habitacionNueva, tarifaNueva, ventaTarifa, etiquetaTarifa, precioOpcion,
  SUG_ALL, PNR_DEMO,
  registrarVendedores, vendedoresRegistrados, semaforo, horasDeVigencia, fmtHace,
  horasHabilesDesdeEnvio, textoDeVencimiento, bucketSemaforo,
  uid, clamp, parseISO, toISO,
  addDays, fmtCorto, fmtLargo, money, venta, margenPct, limpiarPegado, parsePNR, norm, STOP_IA,
  fechaDeVuelo, itinerarioMasCompleto,
  NUM_PAL, numPal, palabraEn, detectarMes, detectarPax, detectarNoches, detectarPaquetes, detectarTelefono,
  detectarDestino, detectarCliente, etiquetaPax, detectarConsulta, ESTADOS, estadoEfectivo,
  /* v2B */
  telDigitos, pareceTel, matchTel,
  /* v4 · mensaje automático editable por cotización */
  renderPlantilla,
};
