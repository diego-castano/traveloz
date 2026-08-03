"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Los botones flotantes (CTA "¡Cotizá a medida acá!" y WhatsApp) son
// `position: fixed` con z-index 111 en el stacking context raíz. Cualquier
// popover de formulario (calendario, pasajeros, select) vive adentro de una
// tarjeta que ya creó su propio stacking context - por ejemplo
// `.sidebar-form.sticky`, que es `position: sticky; z-index: 10` - así que
// ningún z-index desde adentro puede ganarle al CTA: la tarjeta entera pintó
// en la capa 10 y el CTA en la 111. Subir el z-index de la tarjeta tampoco
// sirve, porque taparía el CTA de forma permanente.
//
// La solución general: mientras haya un popover abierto, marcamos el <body> y
// los flotantes se apartan (ver `body[data-popover-open]` en globals.css). Un
// contador evita que cerrar un popover reactive los flotantes si todavía queda
// otro abierto.
// ---------------------------------------------------------------------------

let openPopovers = 0;

/**
 * Aparta los CTAs flotantes mientras `open` sea true. Se usa desde cualquier
 * componente con panel desplegable de los formularios públicos.
 */
export function useFloatingCtaSuppress(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openPopovers += 1;
    document.body.dataset.popoverOpen = "true";
    return () => {
      openPopovers = Math.max(0, openPopovers - 1);
      if (openPopovers === 0) delete document.body.dataset.popoverOpen;
    };
  }, [open]);
}
