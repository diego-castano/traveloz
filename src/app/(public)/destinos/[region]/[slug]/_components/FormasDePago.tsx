// ---------------------------------------------------------------------------
// FormasDePago — payment methods grid styled with the `payment-box` markup
// from html_inicial/destinos-detalle.html. Renders two halves: credit cards
// + bank transfers. The reference uses two copies of this block (desktop
// alongside the content card, mobile below the sidebar form), so we expose
// a `variant` prop to toggle the responsive visibility classes.
// ---------------------------------------------------------------------------

const TARJETAS = [
  { src: "/site/img/visa.png", alt: "Visa" },
  { src: "/site/img/dca.png", alt: "Diners Club" },
  { src: "/site/img/mastercard.png", alt: "Mastercard" },
  { src: "/site/img/ae.png", alt: "American Express" },
];

const BANCOS = [
  { src: "/site/img/santander.png", alt: "Santander" },
  { src: "/site/img/itau.png", alt: "Itaú" },
  { src: "/site/img/bbva.png", alt: "BBVA" },
  { src: "/site/img/banco.png", alt: "Banco República" },
];

export function FormasDePago({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const visibilityClass =
    variant === "desktop" ? "d-none d-md-block" : "d-md-none";

  return (
    <div className={`payment-box ${visibilityClass}`}>
      <div className="heading">
        <h2 className="h2">Formas de pago</h2>
      </div>
      <div className="content">
        <div className="row g-lg-4 g-3">
          <div className="col-md-6">
            <span className="d-block title">Tarjetas de crédito</span>
            <div className="row g-3">
              {TARJETAS.map((t) => (
                <div className="col-lg-3 col-3" key={t.alt}>
                  <div className="payment-icon">
                    <img src={t.src} alt={t.alt} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <span className="d-block title">Transferencia bancaria</span>
            <div className="row g-3">
              {BANCOS.map((b) => (
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
