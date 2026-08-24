/* ═══════════════════════════════════════════════════════════════════════════
   TRAMOS DEL ITINERARIO — helper puro

   La ficha del pasajero (`SalidaPasajero`) recibe los tramos ya masticados:
   ciudad, noches, check-in y check-out. El cálculo es siempre el mismo —
   arranca en `fechaSalida` y va acumulando noches destino por destino, salvo
   que el vendedor haya pisado un check-in a mano.

   Vivía suelto en tres lugares (el editor, la vista previa del drawer y ahora
   la página pública `/c/<token>`) y las tres copias tenían que dar idéntico:
   si el editor dice "check-out el 12" y el link del pasajero dice "el 11", la
   cotización queda desmentida por sí misma. Acá hay una sola copia.

   Sin dependencias a propósito: lo importa un componente cliente y también el
   server component de la página pública, así que no puede arrastrar nada de
   lucide-react ni de React.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Fechas en hora local, mismo criterio que data.js: los ISO del cotizador son
   "YYYY-MM-DD" pelados y nunca llevan huso. */
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso, n) {
  const d = parseISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() + (Number(n) || 0));
  return toISO(d);
}

/**
 * Tramos del itinerario a partir del contenido de la cotización.
 *
 * `manual` marca los check-in que el vendedor fijó a mano y que ya no siguen a
 * la fecha de salida: el editor lo usa para ofrecer "repropagar". En la vista
 * del pasajero no se muestra, pero el campo viaja igual para que las tres
 * pantallas reciban exactamente la misma forma.
 */
function calcularTramos(q) {
  const destinos = q?.destinos || [];
  const salida = q?.fechaSalida || "";
  let acum = 0;
  return destinos.map((d) => {
    const auto = salida ? addDays(salida, acum) : "";
    const checkin = d.checkinManual || auto;
    const noches = Number(d.noches) || 0;
    const fila = {
      id: d.id,
      ciudad: d.ciudad,
      noches,
      checkin,
      checkout: checkin ? addDays(checkin, noches) : "",
      manual: !!d.checkinManual && d.checkinManual !== auto,
    };
    acum += noches;
    return fila;
  });
}

export { calcularTramos };
