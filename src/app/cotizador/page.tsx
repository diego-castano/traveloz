import { permanentRedirect } from "next/navigation";

// El cotizador vivía acá cuando era un mockup público, sin login. Ahora es un
// módulo del panel. Dejamos el 301 porque el link ya circuló por WhatsApp y por
// mail durante la validación con el cliente.
export default function CotizadorLegacyPage() {
  permanentRedirect("/backend/cotizador");
}
