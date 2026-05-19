type Region = {
  id: string;
  slug: string;
  nombre: string;
  heroImage: string | null;
  descripcion: string | null;
};

interface DestinosGridProps {
  regiones: Region[];
  /** SiteSettings group="destinos" — flat key→value record. */
  settings?: Record<string, string>;
}

export function DestinosGrid({ regiones, settings = {} }: DestinosGridProps) {
  const titulo = settings.destinos_titulo?.trim() || "Elegí tu lugar en el mundo";
  const subtitulo =
    settings.destinos_subtitulo?.trim() ||
    "Explorá nuestros destinos por región y dejá que te sorprendan.";
  const ctaTitulo = settings.destinos_cta_titulo?.trim();
  const ctaTexto = settings.destinos_cta_texto?.trim();
  const ctaLabel = settings.destinos_cta_link_label?.trim();
  const ctaHref = settings.destinos_cta_link_href?.trim();

  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center mb_50">
          <h1 className="section-heading">{titulo}</h1>
          <p className="text-muted">{subtitulo}</p>
        </div>
        {regiones.length === 0 ? (
          <p className="text-center py-12">
            Próximamente mostraremos los destinos disponibles.
          </p>
        ) : (
          <div className="row">
            {regiones.map((r) => (
              <div className="col-lg-4 col-sm-6 mb-4" key={r.id}>
                <a href={`/destinos/${r.slug}`} className="image-box style1">
                  <img
                    src={r.heroImage ?? "/site/img/slider-1.webp"}
                    alt={r.nombre}
                  />
                  <h3 className="title">{r.nombre}</h3>
                </a>
              </div>
            ))}
          </div>
        )}
        {ctaTitulo && ctaLabel && ctaHref && (
          <div className="text-center mt-5">
            <h3 className="section-heading mb-2">{ctaTitulo}</h3>
            {ctaTexto && <p className="text-muted mb-3">{ctaTexto}</p>}
            <a href={ctaHref} className="btn-style1">
              {ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
