// ---------------------------------------------------------------------------
// CTA flotante de cotización. Se apoya arriba del botón de WhatsApp (esquina
// inferior derecha) y lleva a /cotizar. Client component para ocultarse en la
// propia página /cotizar, donde sería redundante.
//
// El texto está hardcodeado por ahora (pedido: probar el copy). Si más adelante
// se quiere editar desde el admin, mover a SiteSettings group="general".
// ---------------------------------------------------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./CotizarCTA.css";

const CTA_TEXT = "¡Cotizá a medida acá!";

export function CotizarCTA() {
  const pathname = usePathname();
  // Redundante dentro del flujo de cotización.
  if (pathname?.startsWith("/cotizar")) return null;

  return (
    <Link href="/cotizar" className="cotizar-cta" aria-label="Cotizá tu viaje a medida">
      <span className="cotizar-cta__text">{CTA_TEXT}</span>
    </Link>
  );
}
