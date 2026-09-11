// ---------------------------------------------------------------------------
// ¿Los links de cotización vencen?
//
// Gero (11/09): un pasajero entró a una cotización y se encontró con "Esta
// cotización venció". Pidió sacar los vencimientos: la cotización es una
// conversación entre el pasajero y su asesor, y el sistema no tiene que
// cortarla. Con `LINKS_VENCEN` en false:
//
//   · el link público abre siempre (también los ya vencidos: el token no se
//     tocó, solo dejó de mirarse la fecha),
//   · el estado "Vencida" no se calcula más (el manual sigue valiendo),
//   · la ficha, el email, el modal de compartir y el seguimiento dejan de
//     hablar de vigencia.
//
// `expiraAt` se sigue guardando al emitir el link, como siempre: no hay
// migración, y volver a prender el vencimiento es cambiar esta constante.
// Sin dependencias a propósito: lo importan server actions, rutas y
// componentes cliente.
// ---------------------------------------------------------------------------

export const LINKS_VENCEN = false;

/** `true` solo si los links vencen Y este ya pasó su fecha. */
export function linkVencido(
  expiraAt: Date | string | number | null | undefined,
  ahora: number = Date.now(),
): boolean {
  if (!LINKS_VENCEN || !expiraAt) return false;
  const t = new Date(expiraAt).getTime();
  return Number.isFinite(t) && t < ahora;
}
