import { MESES } from "./data";
import { destinoFinal } from "@/lib/presupuesto/destino";
import { SECCIONES, indiceSeccion, labelSeccion } from "@/lib/presupuesto/secciones";
import { horasHabilesEntre } from "@/lib/presupuesto/habiles";

/* ═══════════════════════════════════════════════════════════════════════════
   ADAPTADORES — de la fila que devuelve el server a la forma que dibuja la UI

   El listado, la cola del día y el drawer nacieron leyendo `HISTORIAL`, un
   array falso con campos ya masticados (cliente en una línea, "destino, Mes
   Año", horas desde el envío). `listarPresupuestos` devuelve columnas crudas.
   Este módulo es el único lugar donde se traduce: si mañana cambia la forma
   del server, se toca acá y nada más.

   El tracking del pasajero (aperturas por dispositivo, tiempo de lectura,
   hasta qué sección llegó) sale de `PresupuestoApertura`, que cuelga del link
   público. Cuando la cotización nunca se compartió no hay aperturas y el
   drawer sigue diciendo "Sin datos todavía": null es una respuesta honesta.
   ═══════════════════════════════════════════════════════════════════════════ */

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;

/** Horas transcurridas desde una fecha. null si no hay fecha. */
function horasDesde(fecha) {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / HORA_MS));
}

/**
 * Horas HÁBILES desde una fecha: las que cuentan para el semáforo. El sábado y
 * el domingo no suman, igual que en la vigencia del link.
 */
function horasHabilesDesde(fecha) {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor(horasHabilesEntre(t, Date.now())));
}

/** Días transcurridos desde una fecha (0 = hoy). */
function diasDesde(fecha) {
  if (!fecha) return 0;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / DIA_MS));
}

/** Horas que faltan para una fecha. Negativo = ya pasó. null si no hay fecha. */
function horasHasta(fecha) {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return null;
  return (t - Date.now()) / HORA_MS;
}

/** "María Pérez" con lo que haya; sin nombre ni apellido, "Sin cliente". */
function nombreCliente(fila) {
  const partes = [fila.clienteNombre, fila.clienteApellido].filter(Boolean);
  return partes.join(" ").trim() || "Sin cliente";
}

/** "Punta Cana, Noviembre 2026" — el formato que ya parsean los filtros.
    `destinoFinal` acá cubre las filas guardadas antes del 26/08, que traen el
    camino entero ("Brasil › Brasil › Salvador de Bahía") en la columna: la
    fila, el filtro "Todos los destinos" y el buscador leen todos de acá. */
function textoDestino(fila) {
  const destino = destinoFinal(fila.destino);
  const mes = fila.mes != null && MESES[fila.mes] ? MESES[fila.mes] : "";
  const anio = fila.anio ? String(fila.anio) : "";
  const cuando = [mes, anio].filter(Boolean).join(" ");
  if (destino && cuando) return `${destino}, ${cuando}`;
  return destino || cuando || "Sin destino";
}

/** "18 min", "3 h 20 min", "2 d". null cuando no hay con qué calcular. */
function fmtDuracion(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const restoMin = min % 60;
  if (h < 24) return restoMin ? `${h} h ${restoMin} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const restoH = h % 24;
  return restoH ? `${d} d ${restoH} h` : `${d} d`;
}

/** "45 s", "2 m 40 s". null si nunca llegó a medirse. */
function fmtLectura(segundos) {
  const s = Number(segundos);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const resto = s % 60;
  return resto ? `${m} m ${resto} s` : `${m} m`;
}

/**
 * Las métricas de lectura de una fila.
 *
 * `hasta` mide desde que salió hasta que la abrió por primera vez — es el dato
 * que le dice al vendedor si el pasajero estaba esperando la cotización o si
 * la vio tres días después. Se descarta si da negativo: pasa cuando un
 * recordatorio corrió el envío después de la apertura.
 */
function lecturaDe(fila) {
  const aperturas = [...(fila.aperturasDet || [])].reverse();  /* del server vienen al revés */

  const enviada = fila.enviadaAt ? new Date(fila.enviadaAt).getTime() : null;
  const primera = fila.primeraAperturaAt ? new Date(fila.primeraAperturaAt).getTime() : null;
  const deltaMs = enviada != null && primera != null ? primera - enviada : null;

  const segundos = aperturas.reduce((m, a) => Math.max(m, Number(a.segundos) || 0), 0);

  /* la sección más avanzada de TODAS las aperturas: si la abrió tres veces y
     en la tercera llegó a la firma, llegó a la firma */
  let idx = -1;
  for (const a of aperturas) idx = Math.max(idx, indiceSeccion(a.seccionMax));

  return {
    /* los crudos también viajan: el tablero saca medianas de acá */
    hastaMs: deltaMs != null && deltaMs >= 0 ? deltaMs : null,
    lecturaSeg: segundos > 0 ? segundos : null,
    hasta: deltaMs != null && deltaMs >= 0 ? fmtDuracion(deltaMs) : null,
    lectura: fmtLectura(segundos),
    hastaSec: idx >= 0 ? labelSeccion(SECCIONES[idx].clave) : null,
    hastaSecIdx: idx,
    apDet: aperturas.map((a) => ({
      hace: fmtHaceCorto(a.abiertaAt),
      disp: a.dispositivo || "—",
      /* geolocalización por IP: no la hacemos todavía */
      lugar: "—",
      seccion: labelSeccion(a.seccionMax) || "—",
    })),
  };
}

/** "recién" / "hace 3 h" / "hace 2 d" para la línea de tiempo del drawer. */
function fmtHaceCorto(fecha) {
  const ms = fecha ? Date.now() - new Date(fecha).getTime() : null;
  const txt = fmtDuracion(ms);
  if (!txt) return "—";
  return txt === "menos de 1 min" ? "recién" : `hace ${txt}`;
}

/**
 * Fila del server → fila de la grilla.
 *
 * `estado` es el EFECTIVO que ya resolvió el server (manual pisa, y una
 * enviada con la vigencia cumplida es vencida). El cliente lo vuelve a pasar
 * por `estadoEfectivo()` para que las pisadas locales del listado sigan
 * funcionando; con el estado ya resuelto esa segunda vuelta no cambia nada.
 */
export function filaDesdePresupuesto(fila) {
  const lect = lecturaDe(fila);
  return {
    id: fila.id,
    num: fila.numero,
    cliente: nombreCliente(fila),
    destino: textoDestino(fila),
    vendedor: fila.vendedorId,
    estado: String(fila.estadoEfectivo || fila.estado || "borrador").toLowerCase(),
    estadoManual: fila.estadoManual ? String(fila.estadoManual).toLowerCase() : null,
    monto: fila.montoPrincipal ?? 0,
    dias: diasDesde(fila.createdAt),
    hEnvio: horasDesde(fila.enviadaAt),
    /* la misma antigüedad contada en hábiles: es la que mira el semáforo */
    hEnvioHabil: horasHabilesDesde(fila.enviadaAt),
    enviadaAt: fila.enviadaAt ?? null,
    expiraAt: fila.expiraAt ?? null,
    vigencia: fila.vigenciaHoras ?? 48,
    aperturas: fila.aperturas ?? 0,
    /* link público vivo: lo usan "Copiar link" y la vista previa de escritorio */
    linkUrl: fila.link?.url ?? null,
    linkToken: fila.link?.token ?? null,
    linkCanal: fila.link?.canal ?? null,
    linkExpiraAt: fila.link?.expiraAt ?? null,
    linkVencido: fila.link?.vencido ?? false,
    /* lectura del pasajero */
    hastaMs: lect.hastaMs,
    lecturaSeg: lect.lecturaSeg,
    dispositivo: lect.apDet[0]?.disp ?? null,
    hasta: lect.hasta,
    lectura: lect.lectura,
    hastaSec: lect.hastaSec,
    hastaSecIdx: lect.hastaSecIdx,
    apDet: lect.apDet,
    bitacora: fila.notasInternas ?? "",
    confOpcion: fila.confirmadaOpcion ?? null,
    confVia: fila.confirmadaVia ?? null,
    hist: [],
    createdAt: fila.createdAt ?? null,
    updatedAt: fila.updatedAt ?? null,
    /* datos crudos que el editor necesita para precargar el bloque Cliente */
    email: fila.clienteEmail ?? "",
    telefono: fila.clienteTelefono ?? "",
  };
}

export { horasDesde, horasHabilesDesde, horasHasta, diasDesde, nombreCliente, textoDestino, fmtDuracion, fmtLectura };
