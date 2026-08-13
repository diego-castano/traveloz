import { Send, Eye, CheckCheck, PenLine, Clock3 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DATOS SIMULADOS  (en producción salen del catálogo del backend)
   ═══════════════════════════════════════════════════════════════════════════ */

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MES_AB = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const ANIO_BASE = 2026;

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

const HOTELES = [
  { id:"h1",  nombre:"Windsor Excelsior",         ciudad:"Río de Janeiro", cat:4, seed:1 },
  { id:"h2",  nombre:"Miramar by Windsor",        ciudad:"Río de Janeiro", cat:5, seed:2 },
  { id:"h3",  nombre:"Arena Copacabana",          ciudad:"Río de Janeiro", cat:4, seed:3 },
  { id:"h4",  nombre:"Fairmont Rio Copacabana",   ciudad:"Río de Janeiro", cat:5, seed:4 },
  { id:"h5",  nombre:"Pousada Vila da Santa",     ciudad:"Búzios",         cat:4, seed:5 },
  { id:"h6",  nombre:"Casas Brancas Boutique",    ciudad:"Búzios",         cat:5, seed:6 },
  { id:"h7",  nombre:"Insólito Boutique",         ciudad:"Búzios",         cat:5, seed:7 },
  { id:"h8",  nombre:"Bahia Principe Grand",      ciudad:"Punta Cana",     cat:5, seed:8 },
  { id:"h9",  nombre:"Riu Palace Macao",          ciudad:"Punta Cana",     cat:5, seed:9 },
  { id:"h10", nombre:"Occidental Caribe",         ciudad:"Punta Cana",     cat:4, seed:10 },
  { id:"h11", nombre:"Hotel Praia Centro",        ciudad:"Florianópolis",  cat:4, seed:11 },
  { id:"h12", nombre:"Costão do Santinho",        ciudad:"Florianópolis",  cat:5, seed:12 },
  { id:"h13", nombre:"NH Collection Eurobuilding",ciudad:"Madrid",         cat:5, seed:13 },
  { id:"h14", nombre:"Catalonia Plaza Catalunya", ciudad:"Barcelona",      cat:4, seed:14 },
  { id:"h15", nombre:"Hotel Mundial",             ciudad:"Lisboa",         cat:4, seed:15 },
  { id:"h16", nombre:"Meliá Buenos Aires",        ciudad:"Buenos Aires",   cat:5, seed:16 },
];

const REGIMENES = ["Desayuno","Media pensión","Pensión completa","All inclusive","Solo alojamiento"];
/* Modelo viejo de habitación: lo siguen usando los PAQUETES del catálogo */
const HABITACIONES = ["Doble estándar","Doble superior","Doble vista al mar","Triple estándar","Suite junior","Bungalow"];

const CABINAS = ["Cabina Turista","Cabina Premium Economy","Cabina Ejecutiva","Primera Clase"];
const EQUIPAJES = [
  "Artículo personal",
  "Artículo personal + Carry-On",
  "Artículo personal + Carry-On + Equipaje de bodega",
];
/* Hasta 15: el cliente también vende apartamentos */
const OCUPACIONES = ["Single","Doble", ...Array.from({ length:13 }, (_, i) => `${i + 3} personas`)];
const TARIFA_TIPOS = ["Por adulto","Por menor","Por familia","Otro"];

/* Servicios habituales precargados por categoría */
const SUG = {
  aereo: ["Aéreo ida y vuelta con equipaje de mano","Aéreo ida y vuelta con valija en bodega 23kg","Equipaje de mano 10kg incluido","Tasas e impuestos incluidos"],
  traslado: ["Traslado de llegada","Traslado de salida","Traslado llegada y salida","Traslado llegada, salida e interhotel"],
  alojamiento: ["Alojamiento en base doble","Impuestos hoteleros incluidos","Early check-in sujeto a disponibilidad"],
  vehiculo: ["Alquiler de auto categoría económica","Alquiler de auto categoría SUV","Seguro de cobertura total del vehículo"],
  seguro: ["Asistencia al viajero cobertura básica","Asistencia al viajero cobertura premium","Cobertura por cancelación"],
  opcionales: ["Excursión Cristo Redentor y Pan de Azúcar","City tour de medio día","Paseo en catamarán","Entradas a parques temáticos","Cena show típica"],
};
const MODALIDADES = ["Regular","Privado"];
const SUG_ALL = Object.entries(SUG).flatMap(([cat, arr]) => arr.map((texto) => ({ cat, texto })));

const CIUDADES = ["Río de Janeiro","Búzios","Punta Cana","Florianópolis","Madrid","Barcelona","Lisboa","Buenos Aires","París","Roma","Cancún","Santiago de Chile","Miami","Orlando","Nueva York","Cartagena","Porto Seguro","San Pablo","Bariloche","Punta del Este"];

const AEROLINEAS = { LA:"LATAM", AR:"Aerolíneas Argentinas", G3:"GOL", AD:"Azul", CM:"Copa Airlines", AV:"Avianca", IB:"Iberia", AF:"Air France", UX:"Air Europa", TP:"TAP Air Portugal", H2:"Sky Airline", JJ:"LATAM Brasil" };
const AEROPUERTOS = { MVD:"Montevideo", GRU:"São Paulo · Guarulhos", GIG:"Río de Janeiro", CGH:"São Paulo · Congonhas", EZE:"Buenos Aires · Ezeiza", AEP:"Buenos Aires · Aeroparque", PUJ:"Punta Cana", MAD:"Madrid", BCN:"Barcelona", LIS:"Lisboa", CDG:"París · CDG", FCO:"Roma · Fiumicino", CUN:"Cancún", SCL:"Santiago de Chile", FLN:"Florianópolis", PTY:"Panamá", MIA:"Miami", BPS:"Porto Seguro" };

const PNR_DEMO = `RP/MVDUY2100/MVDUY2100  AA/GS  28JUL26/1432Z
  1.PEREZ/MARIA MRS  2.PEREZ/JUAN MR
  3  LA1339 K 15OCT 4 MVDGRU HK2  0755 0940
  4  LA3226 K 15OCT 4 GRUGIG HK2  1215 1330
  5  LA3247 K 22OCT 4 GIGGRU HK2  1425 1545
  6  LA1338 K 22OCT 4 GRUMVD HK2  1830 2015`;

/* Paquetes ya cargados en el backend — origen de la precarga */
const PAQUETES = [
  {
    id:"pq1", nombre:"Río de Janeiro y Búzios", mes:9, anio:2026, seed:0,
    resumen:"7 noches · 2 destinos · salidas de octubre",
    destinos:[ {ciudad:"Río de Janeiro", noches:4}, {ciudad:"Búzios", noches:3} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Río de Janeiro", modalidad:"Regular"},
      {cat:"traslado",    texto:"Traslado interhotel Río – Búzios", ciudad:"Búzios", modalidad:"Privado"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura básica"},
      {cat:"opcionales",  texto:"Excursión Cristo Redentor y Pan de Azúcar"},
    ],
    opciones:[
      { nombre:"Opción 1 · Turista",  hoteles:["h1","h5"], regimen:"Desayuno",     habitacion:"Doble estándar",     neto:1120, factor:0.88 },
      { nombre:"Opción 2 · Superior", hoteles:["h3","h6"], regimen:"Desayuno",     habitacion:"Doble superior",     neto:1465, factor:0.86 },
      { nombre:"Opción 3 · Premium",  hoteles:["h4","h7"], regimen:"Media pensión",habitacion:"Doble vista al mar", neto:2050, factor:0.84 },
    ],
  },
  {
    id:"pq2", nombre:"Punta Cana All Inclusive", mes:10, anio:2026, seed:1,
    resumen:"7 noches · all inclusive · salidas de noviembre",
    destinos:[ {ciudad:"Punta Cana", noches:7} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Punta Cana", modalidad:"Regular"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura premium"},
    ],
    opciones:[
      { nombre:"Opción 1 · Occidental", hoteles:["h10"], regimen:"All inclusive", habitacion:"Doble estándar", neto:1390, factor:0.88 },
      { nombre:"Opción 2 · Bahia Principe", hoteles:["h8"], regimen:"All inclusive", habitacion:"Doble superior", neto:1720, factor:0.86 },
      { nombre:"Opción 3 · Riu Palace", hoteles:["h9"], regimen:"All inclusive", habitacion:"Doble vista al mar", neto:2180, factor:0.84 },
    ],
  },
  {
    id:"pq3", nombre:"Madrid, Barcelona y Lisboa", mes:2, anio:2027, seed:5,
    resumen:"10 noches · 3 destinos · salidas de marzo",
    destinos:[ {ciudad:"Madrid", noches:3}, {ciudad:"Barcelona", noches:4}, {ciudad:"Lisboa", noches:3} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg"},
      {cat:"traslado",    texto:"Traslado de llegada", ciudad:"Madrid", modalidad:"Privado"},
      {cat:"traslado",    texto:"Traslado de salida", ciudad:"Lisboa", modalidad:"Privado"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"opcionales",  texto:"Tren de alta velocidad Madrid – Barcelona"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura premium"},
    ],
    opciones:[
      { nombre:"Opción 1 · Céntrica", hoteles:["h13","h14","h15"], regimen:"Desayuno", habitacion:"Doble estándar", neto:2340, factor:0.86 },
    ],
  },
  {
    id:"pq4", nombre:"Florianópolis en familia", mes:0, anio:2027, seed:6,
    resumen:"5 noches · media pensión · salidas de enero",
    destinos:[ {ciudad:"Florianópolis", noches:5} ],
    servicios:[
      {cat:"aereo",       texto:"Aéreo ida y vuelta con equipaje de mano"},
      {cat:"traslado",    texto:"Traslado llegada y salida", ciudad:"Florianópolis", modalidad:"Regular"},
      {cat:"alojamiento", texto:"Alojamiento en base doble"},
      {cat:"seguro",      texto:"Asistencia al viajero cobertura básica"},
    ],
    opciones:[
      { nombre:"Opción 1 · Praia Centro", hoteles:["h11"], regimen:"Desayuno",      habitacion:"Doble estándar", neto:780,  factor:0.88 },
      { nombre:"Opción 2 · Costão",       hoteles:["h12"], regimen:"Media pensión", habitacion:"Doble superior", neto:1180, factor:0.85 },
    ],
  },
];

const PAQUETES_EXTRA = [
  { id:"pq5", nombre:"Cancún y Riviera Maya", mes:11, anio:2026, seed:7, resumen:"7 noches · all inclusive · salidas de diciembre",
    destinos:[{ciudad:"Cancún", noches:7}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Cancún",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura premium"}],
    opciones:[{ nombre:"Opción 1 · Riviera", hoteles:["h8"], regimen:"All inclusive", habitacion:"Doble estándar", neto:1610, factor:0.87 }] },
  { id:"pq6", nombre:"Buenos Aires escapada", mes:8, anio:2026, seed:2, resumen:"3 noches · city break · salidas de septiembre",
    destinos:[{ciudad:"Buenos Aires", noches:3}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con equipaje de mano"},{cat:"alojamiento",texto:"Alojamiento en base doble"}],
    opciones:[{ nombre:"Opción 1 · Recoleta", hoteles:["h16"], regimen:"Desayuno", habitacion:"Doble superior", neto:420, factor:0.88 }] },
  { id:"pq7", nombre:"París y Roma", mes:3, anio:2027, seed:4, resumen:"9 noches · 2 capitales · salidas de abril",
    destinos:[{ciudad:"París", noches:5},{ciudad:"Roma", noches:4}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado de llegada",ciudad:"París",modalidad:"Privado"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura premium"}],
    opciones:[{ nombre:"Opción 1 · Céntrica", hoteles:["h13","h14"], regimen:"Desayuno", habitacion:"Doble estándar", neto:2680, factor:0.85 }] },
  { id:"pq8", nombre:"Miami y Orlando", mes:6, anio:2027, seed:9, resumen:"8 noches · parques + playa · salidas de julio",
    destinos:[{ciudad:"Miami", noches:3},{ciudad:"Orlando", noches:5}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"vehiculo",texto:"Alquiler de auto categoría SUV"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"opcionales",texto:"Entradas a parques temáticos"}],
    opciones:[{ nombre:"Opción 1 · Familiar", hoteles:["h10","h9"], regimen:"Desayuno", habitacion:"Triple estándar", neto:2140, factor:0.86 }] },
  { id:"pq9", nombre:"Bariloche invierno", mes:6, anio:2026, seed:10, resumen:"5 noches · nieve · salidas de julio",
    destinos:[{ciudad:"Bariloche", noches:5}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Bariloche",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"}],
    opciones:[{ nombre:"Opción 1 · Centro", hoteles:["h11"], regimen:"Media pensión", habitacion:"Doble estándar", neto:940, factor:0.88 }] },
  { id:"pq10", nombre:"Cartagena caribe colombiano", mes:9, anio:2026, seed:11, resumen:"6 noches · ciudad amurallada · salidas de octubre",
    destinos:[{ciudad:"Cartagena", noches:6}],
    servicios:[{cat:"aereo",texto:"Aéreo ida y vuelta con valija en bodega 23kg"},{cat:"traslado",texto:"Traslado llegada y salida",ciudad:"Cartagena",modalidad:"Regular"},{cat:"alojamiento",texto:"Alojamiento en base doble"},{cat:"seguro",texto:"Asistencia al viajero cobertura básica"}],
    opciones:[{ nombre:"Opción 1 · Ciudad vieja", hoteles:["h15"], regimen:"Desayuno", habitacion:"Doble superior", neto:1120, factor:0.87 }] },
];
PAQUETES.push(...PAQUETES_EXTRA);

const PLANTILLAS = [
  { id:"t1", nombre:"Caribe all inclusive", destino:"Punta Cana", detalle:"Aéreo + traslados + seguro premium · base doble", usos:23, ultimo:"hace 2 d" },
  { id:"t2", nombre:"Brasil playa",         destino:"Río de Janeiro", detalle:"Aéreo + traslados regulares + excursión clásica", usos:31, ultimo:"hace 5 h" },
  { id:"t3", nombre:"Europa clásica",       destino:"Madrid", detalle:"Aéreo + traslados privados + trenes entre ciudades", usos:9, ultimo:"hace 6 d" },
];

/* `ultima` apunta a una cotización del HISTORIAL: es la historia previa del cliente */
const CLIENTES = [
  { nombre:"María", apellido:"Pérez", email:"maria.perez@gmail.com", telefono:"+598 99 123 456" },
  { nombre:"Juan", apellido:"Rodríguez", email:"juanrod@hotmail.com", telefono:"+598 98 654 321" },
  { nombre:"Lucía", apellido:"Fernández", email:"lucia.f@gmail.com", telefono:"+598 91 555 010", ultima:"COT-2026-0146" },
  { nombre:"Martín", apellido:"Olivera", email:"molivera@outlook.com", telefono:"+598 94 777 220", ultima:"COT-2026-0145" },
  { nombre:"Sofía", apellido:"Methol", email:"sofimethol@gmail.com", telefono:"+598 92 303 404", ultima:"COT-2026-0144" },
];

const VENDEDORES = [
  { id:"v1", nombre:"Agustina Vera",   inicial:"AV", cargo:"Ejecutiva de ventas", tel:"+598 99 412 330" },
  { id:"v2", nombre:"Gerónimo Silva",  inicial:"GS", cargo:"Líder técnico",       tel:"+598 99 118 204" },
  { id:"v3", nombre:"Amparo Núñez",    inicial:"AN", cargo:"Ejecutiva de ventas", tel:"+598 99 663 871" },
  { id:"v4", nombre:"Federico Vila",   inicial:"FV", cargo:"Ejecutivo de ventas", tel:"+598 99 205 449" },
];

const HISTORIAL = [
  { num:"COT-2026-0147", cliente:"Familia Rodríguez", destino:"Punta Cana, Noviembre 2026", vendedor:"v3", estado:"abierta",
    monto:1955, dias:1, hEnvio:26, aperturas:3, hasta:"4 h 10 m", lectura:"2 m 40 s", hastaSec:"Formas de pago",
    apDet:[{ hace:"hace 22 h", disp:"iPhone · WhatsApp", lugar:"Montevideo, UY" },
           { hace:"hace 20 h", disp:"iPhone · Safari",   lugar:"Montevideo, UY" },
           { hace:"hace 3 h",  disp:"Android · WhatsApp", lugar:"Canelones, UY" }] },
  { num:"COT-2026-0146", cliente:"Lucía Fernández", destino:"Madrid, Marzo 2027", vendedor:"v1", estado:"enviada",
    monto:2720, dias:2, hEnvio:52, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  { num:"COT-2026-0145", cliente:"Martín Olivera", destino:"Florianópolis, Enero 2027", vendedor:"v4", estado:"confirmada",
    monto:1388, dias:4, hEnvio:96, aperturas:6, hasta:"1 h 05 m", lectura:"4 m 12 s", hastaSec:"Confirmó desde el link",
    apDet:[{ hace:"hace 4 d", disp:"iPhone · WhatsApp", lugar:"Montevideo, UY" },
           { hace:"hace 3 d", disp:"Notebook · Chrome", lugar:"Montevideo, UY" },
           { hace:"hace 2 d", disp:"iPhone · WhatsApp", lugar:"Punta del Este, UY" }] },
  { num:"COT-2026-0144", cliente:"Sofía Methol", destino:"Río de Janeiro, Octubre 2026", vendedor:"v1", estado:"enviada",
    monto:1704, dias:5, hEnvio:120, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  { num:"COT-2026-0143", cliente:"Diego Castaño", destino:"Barcelona, Abril 2027", vendedor:"v2", estado:"borrador",
    monto:0, dias:6, hEnvio:null, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  /* v2: caso ámbar (+24 h sin abrir) — es el que dispara "Mandar recordatorio" en la cola de hoy */
  { num:"COT-2026-0142", cliente:"Valentina Souza", destino:"Florianópolis, Enero 2027", vendedor:"v3", estado:"enviada",
    monto:1290, dias:7, hEnvio:30, aperturas:0, hasta:null, lectura:null, hastaSec:null, apDet:[] },
  /* v2D: la abrió pero la dejó por la mitad — es el caso que muestra el funnel de lectura incompleto */
  { num:"COT-2026-0141", cliente:"Ramiro Pintos", destino:"Cancún, Diciembre 2026", vendedor:"v2", estado:"abierta",
    monto:1850, dias:8, hEnvio:40, aperturas:2, hasta:"6 h 20 m", lectura:"48 s", hastaSec:"Hoteles",
    apDet:[{ hace:"hace 34 h", disp:"Android · WhatsApp", lugar:"Montevideo, UY" },
           { hace:"hace 5 h",  disp:"Android · Chrome",   lugar:"Montevideo, UY" }] },
];

/* Semáforo de seguimiento: cuánto hace que se envió y si el pasajero la abrió */
function semaforo(r) {
  if (r.estado === "vencida")    return { c:"#F43E55", l:"Vencida",
    d:"El link venció sin apertura. Reactivalo con un recordatorio o marcá el estado a mano si el seguimiento sigue por otro canal." };
  if (r.estado === "borrador")   return { c:"#B0B4CD", l:"Borrador",
    d:"Todavía no se envió al pasajero. El semáforo arranca a correr cuando la compartas." };
  if (r.estado === "confirmada") return { c:"#2A9E8E", l:"Confirmada",
    d:"Cotización confirmada. Lista para pasar al flujo de reserva." };
  if (r.aperturas > 0)           return { c:"#2A9E8E", l:"Abierta",
    d:`El pasajero la abrió ${r.aperturas === 1 ? "una vez" : r.aperturas + " veces"}. Buen momento para el seguimiento.` };
  if (r.hEnvio == null)          return { c:"#B0B4CD", l:"—", d:"Sin datos de envío." };
  if (r.hEnvio < 24)             return { c:"#45D4C0", l:"En ventana",
    d:"Enviada hace menos de 24 h y todavía sin abrir. Normal — la mayoría se abre el mismo día." };
  if (r.hEnvio < 48)             return { c:"#E8A13C", l:"Sin abrir +24 h",
    d:"Pasaron más de 24 h sin apertura. Conviene un recordatorio corto por WhatsApp." };
  return { c:"#F43E55", l:"Sin abrir +48 h",
    d:"Más de 48 h sin abrir: el link ya venció. Reactivalo y reenviá, o llamá al pasajero." };
}
function fmtHace(h) { if (h == null) return "—"; if (h <= 0) return "recién";
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`; }


/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const uid = (() => { let n = 0; return (p = "id") => `${p}_${++n}_${Math.random().toString(36).slice(2, 6)}`; })();
const hotelById = (id) => HOTELES.find((h) => h.id === id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function parseISO(s) { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(iso, n) { const d = parseISO(iso); if (!d) return ""; d.setDate(d.getDate() + n); return toISO(d); }
function fmtCorto(iso) { const d = parseISO(iso); return d ? `${d.getDate()} ${MES_AB[d.getMonth()]}` : "—"; }
function fmtLargo(iso) { const d = parseISO(iso); return d ? `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}` : "—"; }
function money(n) { const v = Number(n); return "USD " + (Number.isFinite(v) ? Math.round(v) : 0).toLocaleString("es-UY"); }
/* Modelo de markup del sistema: Precio Venta = Neto ÷ Factor */
function venta(neto, factor) { const f = Number(factor); if (!f || f <= 0) return 0; return Number(neto) / f; }
function margenPct(factor) { return Math.round((1 - Number(factor)) * 1000) / 10; }

/* ── Servicios con los que arranca toda cotización nueva ─────────────────
   Los que llevan `auto` siguen a lo que se carga arriba (noches y cabina/
   equipaje) hasta que el vendedor los edita a mano. */
function serviciosDefault(noches = 7) {
  return [
    { id:uid("srv"), categoria:"aereo",       texto:"Aéreo ida y vuelta con equipaje de mano", ciudad:null, modalidad:null, auto:"aereo" },
    { id:uid("srv"), categoria:"traslado",    texto:"Traslados de llegada y salida",           ciudad:null, modalidad:null },
    { id:uid("srv"), categoria:"alojamiento", texto:`${String(noches).padStart(2, "0")} noches de alojamiento`, ciudad:null, modalidad:null, auto:"noches" },
    { id:uid("srv"), categoria:"seguro",      texto:"Seguro de Asistencia al Viajero",         ciudad:null, modalidad:null },
  ];
}

/* ── Opción hotelera: habitaciones, y dentro de cada una sus tarifas ───── */
function tarifaNueva(tipo = "Por adulto") {
  /* venta null → se calcula sola (neto ÷ factor); un número → pisada a mano */
  return { id:uid("tf"), tipo, tipoLibre:"", neto:0, venta:null };
}
function habitacionNueva(ocupacion = "Doble") {
  return { id:uid("hab"), ocupacion, tipo:"", tarifas:[tarifaNueva()] };
}
function ventaTarifa(t, factor) {
  if (t == null) return 0;
  if (t.venta !== null && t.venta !== "" && t.venta !== undefined) return Number(t.venta) || 0;
  return venta(t.neto, factor);
}
function etiquetaTarifa(t) { return t.tipo === "Otro" ? (t.tipoLibre?.trim() || "Otro") : t.tipo; }
/* precio principal de una opción: primera tarifa de la primera habitación */
function precioOpcion(o) {
  const t = o?.habitaciones?.[0]?.tarifas?.[0];
  return t ? ventaTarifa(t, o.factor) : venta(o?.neto, o?.factor);   // fallback al modelo viejo
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

/* Parser de PNR. Si no reconoce nada devuelve [] y la UI conserva lo pegado. */
function parsePNR(raw) {
  const out = [];
  const lineas = String(raw).split("\n");
  const re = /([A-Z0-9]{2})\s*(\d{2,4})\s+([A-Z])?\s*(\d{2})([A-Z]{3})\s+\d?\s*([A-Z]{3})([A-Z]{3})\s+[A-Z]{2}(\d+)?\s+(\d{4})\s+(\d{4})/;
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
      aerolinea: AEROLINEAS[cia] || cia,
      dia: Number(dd), mes: MES3[mmm],
      origen: org, destino: dst,
      salida: `${hs.slice(0, 2)}:${hs.slice(2)}`,
      llegada: `${hl.slice(0, 2)}:${hl.slice(2)}`,
    });
  }
  return out;
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
   suman puntaje a todos los suyos y el vendedor elige desde cuál armar */
const REGIONES_IA = [
  { alias:["brasil"],                                ciudades:["Río de Janeiro","Búzios","Florianópolis"] },
  { alias:["caribe"],                                ciudades:["Punta Cana","Cancún","Cartagena"] },
  { alias:["europa"],                                ciudades:["Madrid","Barcelona","Lisboa","París","Roma"] },
  { alias:["argentina"],                             ciudades:["Buenos Aires","Bariloche"] },
  { alias:["estados unidos","eeuu","usa","disney"],  ciudades:["Miami","Orlando"] },
];

/* puntaje: ciudad completa vale más que una palabra suelta; la región suma a
   todos sus paquetes; el mes que coincide desempata. Devuelve TODOS los que
   encajan, ordenados de mejor a peor. */
function detectarPaquetes(t, mes) {
  const regiones = REGIONES_IA.filter((r) =>
    r.alias.some((a) => (a.includes(" ") ? t.includes(a) : palabraEn(t, a))));
  const enRegion = new Set(regiones.flatMap((r) => r.ciudades).map(norm));
  const lista = [];
  for (const p of PAQUETES) {
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

function detectarDestino(t, crudo) {
  const pool = [...new Set([...CIUDADES, ...PAQUETES.flatMap((p) => p.destinos.map((d) => d.ciudad))])];
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
  if (VENDEDORES.some((v) => norm(v.nombre).split(" ")[0] === norm(n))) return "";
  return n;
}

function etiquetaPax(adultos, menores) {
  const p = [];
  if (adultos) p.push(`${adultos} ${adultos === 1 ? "adulto" : "adultos"}`);
  if (menores) p.push(`${menores} ${menores === 1 ? "menor" : "menores"}`);
  return p.join(" + ");
}

function detectarConsulta(texto) {
  const crudo = limpiarPegado(texto);
  const t = norm(crudo);
  const mes = detectarMes(t);
  const hoy = new Date();
  const explicito = crudo.match(/\b(20\d{2})\b/);
  let anio = explicito ? Number(explicito[1])
    : mes != null && mes < hoy.getMonth() ? ANIO_BASE + 1 : ANIO_BASE;
  if (anio !== ANIO_BASE && anio !== ANIO_BASE + 1) anio = ANIO_BASE;

  const rank = detectarPaquetes(t, mes);
  const candidatos = rank.map((x) => x.p);
  /* un solo claro ganador precarga directo; empate o destino amplio → elige el vendedor */
  const paquete =
    rank.length === 1 || (rank.length > 1 && rank[0].sc >= rank[1].sc + 2) ? rank[0].p : null;
  const destino = paquete ? paquete.destinos[0].ciudad : detectarDestino(t, crudo);
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

const filaPorNum = (num) => HISTORIAL.find((r) => r.num === num) || null;
/* la última cotización de un cliente del catálogo, lista para mostrar */
const ultimaDe = (c) => (c && c.ultima ? filaPorNum(c.ultima) : null);

/* Los cinco servicios que el vendedor pone en casi todas las cotizaciones */
const FRECUENTES = [
  { cat:"aereo",       texto:"Aéreo ida y vuelta con valija en bodega 23kg" },
  { cat:"traslado",    texto:"Traslado llegada y salida" },
  { cat:"alojamiento", texto:"Alojamiento en base doble" },
  { cat:"seguro",      texto:"Asistencia al viajero cobertura premium" },
  { cat:"aereo",       texto:"Tasas e impuestos incluidos" },
];

/* Hoteles que ya se cotizaron en esa ciudad — salen de los paquetes publicados */
function hotelesCotizadosEn(ciudad, max = 3) {
  const c = norm(ciudad || ""); if (!c) return [];
  const ids = [];
  for (const p of PAQUETES) {
    if (!p.destinos.some((d) => norm(d.ciudad) === c)) continue;
    for (const o of p.opciones) for (const id of o.hoteles) if (!ids.includes(id)) ids.push(id);
  }
  return ids.map(hotelById).filter((h) => h && norm(h.ciudad) === c).slice(0, max);
}

/* Textos listos para pegar al final del mensaje */
function snippetMensaje(tipo, q) {
  const nom = (q?.cliente?.nombre || "").trim();
  const hs = Number(q?.vigencia) || 48;
  if (tipo === "saludo")
    return `${nom ? `¡Hola ${nom}!` : "¡Hola!"} Gracias por escribirnos. Te paso la propuesta que armamos con todo lo que hablamos.`;
  if (tipo === "urgencia")
    return `Los precios y los lugares se confirman recién al reservar, así que esta propuesta queda en pie por ${hs} horas. Si te sirve, la dejamos señada hoy mismo y te aseguramos la tarifa.`;
  return "Para reservar se abona una seña del 30% y el saldo hasta 30 días antes de la salida. Podés pagar por transferencia, débito o tarjeta en cuotas.";
}

/* ── el "Escribir por mí": arma el mensaje con lo que ya hay cargado ────── */
function encabezadoTono(tono, nom) {
  if (tono === "formal") {
    if (!nom) return "Estimados:";
    return `${/a$/i.test(nom) ? "Estimada" : "Estimado"} ${nom}:`;
  }
  return nom ? `Hola ${nom}!` : "¡Hola!";
}
function redactarMensaje(q, tono = "cercano") {
  const nom = (q.cliente?.nombre || "").trim();
  const destino = (q.titulo?.destino || q.destinos?.[0]?.ciudad || "").trim();
  const mes = q.titulo?.mes != null ? MESES[q.titulo.mes].toLowerCase() : "";
  const ciudades = (q.destinos || []).map((d) => d.ciudad).filter(Boolean);
  const noches = (q.destinos || []).reduce((a, d) => a + (Number(d.noches) || 0), 0);
  const entre = ciudades.length > 1
    ? ` entre ${ciudades.slice(0, -1).join(", ")} y ${ciudades[ciudades.length - 1]}`
    : ciudades.length === 1 ? ` en ${ciudades[0]}` : "";
  const tramo = noches ? ` — ${noches} ${noches === 1 ? "noche" : "noches"}${entre}` : "";
  const viaje = destino ? `para ${destino}${mes ? ` en ${mes}` : ""}` : "para el viaje que estás pensando";
  const ops = (q.opciones || []).length;

  if (tono === "formal") {
    const l1 = `${encabezadoTono("formal", nom)}`;
    const l2 = `Le enviamos la cotización ${viaje}${tramo}.`;
    const l3 = ops > 1
      ? `En el detalle encontrará ${ops} opciones de alojamiento con el precio por persona en base doble.`
      : "En el detalle encontrará el alojamiento propuesto con el precio por persona en base doble.";
    return `${l1}\n\n${l2} ${l3}\n\nQuedamos a disposición por cualquier consulta.`;
  }
  const l1 = `${encabezadoTono("cercano", nom)} Como lo hablamos, te paso la cotización ${viaje}${tramo}.`;
  const l2 = ops > 1
    ? `Adentro vas a ver ${ops} opciones de hotel con el precio por persona en base doble.`
    : "Adentro vas a ver el hotel y el precio por persona en base doble.";
  return `${l1}\n\n${l2}\n\nCualquier duda me escribís 😊`;
}

const ESTADOS = {
  borrador:   { l:"Borrador",   tone:"n",      Icon:PenLine },
  enviada:    { l:"Enviada",    tone:"violet", Icon:Send },
  abierta:    { l:"Abierta",    tone:"teal",   Icon:Eye },
  vencida:    { l:"Vencida",    tone:"coral",  Icon:Clock3 },
  confirmada: { l:"Confirmada", tone:"teal",   Icon:CheckCheck },
};
/* vencida automática: enviada, sin abrir, pasada la vigencia — salvo que el vendedor la haya pisado a mano */
function estadoEfectivo(r) {
  if (r.estadoManual) return r.estadoManual;
  if (r.estado === "enviada" && r.aperturas === 0 && r.hEnvio != null && r.hEnvio >= 48) return "vencida";
  return r.estado;
}

export {
  MESES, MES_AB, ANIO_BASE, PALETAS, fotoBg, HOTELES, REGIMENES, HABITACIONES, SUG, MODALIDADES,
  CABINAS, EQUIPAJES, OCUPACIONES, TARIFA_TIPOS,
  serviciosDefault, habitacionNueva, tarifaNueva, ventaTarifa, etiquetaTarifa, precioOpcion,
  SUG_ALL, CIUDADES, AEROLINEAS, AEROPUERTOS, PNR_DEMO, PAQUETES, PAQUETES_EXTRA, PLANTILLAS,
  CLIENTES, VENDEDORES, HISTORIAL, semaforo, fmtHace, uid, hotelById, clamp, parseISO, toISO,
  addDays, fmtCorto, fmtLargo, money, venta, margenPct, limpiarPegado, parsePNR, norm, STOP_IA,
  NUM_PAL, numPal, palabraEn, detectarMes, detectarPax, detectarNoches, detectarPaquetes, detectarTelefono,
  detectarDestino, detectarCliente, etiquetaPax, detectarConsulta, ESTADOS, estadoEfectivo,
  /* v2B */
  telDigitos, pareceTel, matchTel, filaPorNum, ultimaDe, FRECUENTES, hotelesCotizadosEn,
  snippetMensaje, encabezadoTono, redactarMensaje,
};
