/**
 * Sanitiza el HTML de un embed de mapa antes de inyectarlo con
 * `dangerouslySetInnerHTML`. Solo el admin edita `contacto_mapa_embed`, pero
 * esto es defensa en profundidad (S8): si esa key llegara a contener un
 * `<script>` o un `<iframe>` apuntando a un dominio arbitrario, igual no se
 * renderiza.
 *
 * Estrategia (allow-list, no blocklist): extraemos el primer `<iframe>`, lo
 * descartamos salvo que su `src` apunte a un proveedor de mapas conocido, y
 * reconstruimos un iframe limpio con un set fijo de atributos seguros. Todo lo
 * demás (scripts, otros tags, atributos `on*`) se tira.
 */

// Solo Google Maps: coincide con `frame-src` de la CSP en next.config.mjs.
// Permitir otros proveedores acá sería inútil porque la CSP igual bloquearía
// el frame.
const ALLOWED_EMBED_HOSTS = ["www.google.com", "google.com", "maps.google.com"];

function isAllowedEmbedSrc(src: string): boolean {
  try {
    const url = new URL(src, "https://www.google.com");
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_EMBED_HOSTS.includes(host)) return false;
    // Solo el endpoint de embed de mapas, no cualquier URL de google.com.
    if (!url.pathname.startsWith("/maps/embed")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve un `<iframe>` limpio si el embed es válido, o `""` si no hay un
 * iframe de un proveedor permitido. El resultado es seguro para
 * `dangerouslySetInnerHTML`.
 */
export function sanitizeMapEmbed(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";

  // Primer src de un iframe en el markup pegado por el operador.
  const srcMatch = raw.match(/<iframe[^>]*\bsrc=["']([^"']+)["']/i);
  if (!srcMatch) return "";

  const src = srcMatch[1].trim();
  if (!isAllowedEmbedSrc(src)) return "";

  // Reconstrucción con atributos fijos: ignoramos cualquier on*/style/srcdoc
  // que viniera en el original.
  const safeSrc = src.replace(/"/g, "&quot;");
  return (
    `<iframe src="${safeSrc}" width="100%" height="320" style="border:0" ` +
    `loading="lazy" referrerpolicy="no-referrer-when-downgrade" ` +
    `allowfullscreen></iframe>`
  );
}
