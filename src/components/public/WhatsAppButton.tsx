// ---------------------------------------------------------------------------
// Floating WhatsApp button -- ports <a class="footer-whatsapp"> from the HTML.
// TODO Fase 6: hook up real wa.me/<number> URL + branding.
// ---------------------------------------------------------------------------

export function WhatsAppButton() {
  return (
    <a
      className="footer-whatsapp"
      href="https://wa.me/59899000000"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
    >
      <img src="/site/img/whatsapp.webp" alt="WhatsApp" />
    </a>
  );
}
