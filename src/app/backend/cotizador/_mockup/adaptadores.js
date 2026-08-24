import { MESES } from "./data";

/* ═══════════════════════════════════════════════════════════════════════════
   ADAPTADORES — de la fila que devuelve el server a la forma que dibuja la UI

   El listado, la cola del día y el drawer nacieron leyendo `HISTORIAL`, un
   array falso con campos ya masticados (cliente en una línea, "destino, Mes
   Año", horas desde el envío). `listarPresupuestos` devuelve columnas crudas.
   Este módulo es el único lugar donde se traduce: si mañana cambia la forma
   del server, se toca acá y nada más.

   Lo que todavía no existe queda explícitamente en null / vacío. El tracking
   del pasajero (aperturas por dispositivo, tiempo de lectura, hasta qué
   sección llegó) llega con los links públicos en la próxima ola; hasta
   entonces el drawer muestra "Sin datos todavía" en vez de inventar números.
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

/** "Punta Cana, Noviembre 2026" — el formato que ya parsean los filtros. */
function textoDestino(fila) {
  const destino = (fila.destino || "").trim();
  const mes = fila.mes != null && MESES[fila.mes] ? MESES[fila.mes] : "";
  const anio = fila.anio ? String(fila.anio) : "";
  const cuando = [mes, anio].filter(Boolean).join(" ");
  if (destino && cuando) return `${destino}, ${cuando}`;
  return destino || cuando || "Sin destino";
}

/**
 * Fila del server → fila de la grilla.
 *
 * `hasta`, `lectura`, `hastaSec` y `apDet` van en null/vacío a propósito: son
 * las métricas de lectura del pasajero, que dependen del link público.
 */
export function filaDesdePresupuesto(fila) {
  return {
    id: fila.id,
    num: fila.numero,
    cliente: nombreCliente(fila),
    destino: textoDestino(fila),
    vendedor: fila.vendedorId,
    estado: String(fila.estado || "borrador").toLowerCase(),
    estadoManual: fila.estadoManual ? String(fila.estadoManual).toLowerCase() : null,
    monto: fila.montoPrincipal ?? 0,
    dias: diasDesde(fila.createdAt),
    hEnvio: horasDesde(fila.enviadaAt),
    expiraAt: fila.expiraAt ?? null,
    vigencia: fila.vigenciaHoras ?? 48,
    aperturas: fila.aperturas ?? 0,
    /* pendiente: tracking del pasajero (próxima ola, con los links públicos) */
    hasta: null,
    lectura: null,
    hastaSec: null,
    apDet: [],
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

export { horasDesde, horasHasta, diasDesde, nombreCliente, textoDestino };
