// ---------------------------------------------------------------------------
// Home (/) -- minimal placeholder for Fase 2.
//
// Fase 6 will replace this with the full hero + categories slider + testimonios
// section ported from html_inicial/index.html, fed by Prisma data.
//
// The wrapping <header>, <footer>, <AgenciaModal> and WhatsApp button are
// rendered by src/app/(public)/layout.tsx.
// ---------------------------------------------------------------------------

export const metadata = {
  title: "TravelOz",
  description:
    "TravelOz - Agencia de viajes en Uruguay. Diseñamos experiencias únicas a tu medida: lunas de miel, salidas grupales, cruceros y más.",
};

export default function HomePage() {
  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center">
          <h1 className="hero-text">TravelOz</h1>
          <h3 className="hero-sub-title">Sitio público en construcción.</h3>
          <p>
            <a className="hero-btn" href="/backend/login">
              Acceso al panel
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
