// ---------------------------------------------------------------------------
// FormasDePago — payment methods grid styled with the `payment-box` markup
// from html_inicial/destinos-detalle.html. Renders two halves: credit cards
// + bank transfers. The reference uses two copies of this block (desktop
// alongside the content card, mobile below the sidebar form), so we expose
// a `variant` prop to toggle the responsive visibility classes.
//
// Logos + titles come from SiteSettings group="pagos" (passed down as `data`
// from the page server component). Falls back to the bundled assets when the
// settings are absent so the block never renders empty.
// ---------------------------------------------------------------------------

export interface PagoLogo {
  src: string;
  alt: string;
}

export interface FormasDePagoData {
  titulo: string;
  tarjetasTitulo: string;
  bancosTitulo: string;
  tarjetas: PagoLogo[];
  bancos: PagoLogo[];
}

const DEFAULT_DATA: FormasDePagoData = {
  titulo: "Formas de pago",
  tarjetasTitulo: "Tarjetas de crédito",
  bancosTitulo: "Transferencia bancaria",
  tarjetas: [
    { src: "/site/img/visa.png", alt: "Visa" },
    { src: "/site/img/dca.png", alt: "Diners Club" },
    { src: "/site/img/mastercard.png", alt: "Mastercard" },
    { src: "/site/img/ae.png", alt: "American Express" },
  ],
  bancos: [
    { src: "/site/img/santander.png", alt: "Santander" },
    { src: "/site/img/itau.png", alt: "Itaú" },
    { src: "/site/img/bbva.png", alt: "BBVA" },
    { src: "/site/img/banco.png", alt: "Banco República" },
  ],
};

export function FormasDePago({
  variant = "desktop",
  data,
}: {
  variant?: "desktop" | "mobile";
  data?: FormasDePagoData;
}) {
  const d = data ?? DEFAULT_DATA;
  const visibilityClass =
    variant === "desktop" ? "d-none d-md-block" : "d-md-none";

  return (
    <div className={`payment-box ${visibilityClass}`}>
      <div className="heading">
        <h2 className="h2">{d.titulo}</h2>
      </div>
      <div className="content">
        <div className="row g-lg-4 g-3">
          <div className="col-md-6">
            <span className="d-block title">{d.tarjetasTitulo}</span>
            <div className="row g-3">
              {d.tarjetas.map((t) => (
                <div className="col-lg-3 col-3" key={t.alt}>
                  <div className="payment-icon">
                    <img src={t.src} alt={t.alt} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <span className="d-block title">{d.bancosTitulo}</span>
            <div className="row g-3">
              {d.bancos.map((b) => (
                <div className="col-lg-3 col-3" key={b.alt}>
                  <div className="payment-icon">
                    <img src={b.src} alt={b.alt} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Build FormasDePagoData from a SiteSettings group="pagos" record. Used by the
 * page server component before passing into PackageDetailView. Tolerates
 * missing/invalid JSON by falling back to the bundled defaults per field.
 */
export function buildFormasDePagoData(
  settings: Record<string, string>,
): FormasDePagoData {
  const parseLogos = (json: string | undefined, fallback: PagoLogo[]): PagoLogo[] => {
    if (!json) return fallback;
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return fallback;
      const clean = parsed.filter(
        (x): x is PagoLogo =>
          x && typeof x.src === "string" && typeof x.alt === "string",
      );
      return clean.length > 0 ? clean : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    titulo: settings.pagos_titulo?.trim() || DEFAULT_DATA.titulo,
    tarjetasTitulo:
      settings.pagos_tarjetas_titulo?.trim() || DEFAULT_DATA.tarjetasTitulo,
    bancosTitulo:
      settings.pagos_bancos_titulo?.trim() || DEFAULT_DATA.bancosTitulo,
    tarjetas: parseLogos(settings.pagos_tarjetas_json, DEFAULT_DATA.tarjetas),
    bancos: parseLogos(settings.pagos_bancos_json, DEFAULT_DATA.bancos),
  };
}
