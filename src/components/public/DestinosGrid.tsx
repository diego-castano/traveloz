type Region = {
  id: string;
  slug: string;
  nombre: string;
  heroImage: string | null;
  descripcion: string | null;
};

export function DestinosGrid({ regiones }: { regiones: Region[] }) {
  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center mb_50">
          <h1 className="section-heading">Nuestros destinos</h1>
          <p className="text-muted">Elegí tu próxima aventura por región.</p>
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
      </div>
    </section>
  );
}
