import { EmblaSlider } from "./EmblaSlider";
import { sortRegionesAlfabetico } from "@/lib/utils";

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
  const ctaLabel =
    settings.destinos_cta_link_label?.trim() || "Explorá todos los destinos";
  const ctaHref = settings.destinos_cta_link_href?.trim() || "/destinos/todos";
  // --- Mismo orden alfabético (es) que el submenú DESTINOS del header.
  const regionesOrdenadas = sortRegionesAlfabetico(regiones);

  return (
    <section className="content-area gradient-page-bg ver2 alt">
      <div className="container wide">
        <div className="text-center">
          <h2 className="section-heading text-white mb_50">{titulo}</h2>
        </div>
        {regiones.length === 0 ? (
          <p className="text-center py-12 text-white">
            Próximamente mostraremos los destinos disponibles.
          </p>
        ) : (
          <EmblaSlider
            // 3.4 (no 3) para que la 4ª card asome ~150px por su propio ancho
            // (1296/3.4 ≈ 381px por slide, 3 completas + peek), en vez del viejo
            // hack de padding-right en el viewport que Embla no contabilizaba y
            // dejaba el 4º slot vacío de forma intermitente con loop activo.
            slidesToShow={3.4}
            autoplay
            autoplayDelay={3000}
            loop
            showArrows
            showDots
            centerModeMobile
            className="image-box-slider v2 alt"
          >
            {regionesOrdenadas.map((r) => (
              <a
                href={`/destinos/${r.slug}`}
                className="image-box style1"
                key={r.id}
              >
                {/* eager (no lazy): dentro de un carrusel loop Embla clona y
                    reposiciona slides, y el lazy dispara decodes durante el
                    scroll -> tirones. Son pocas imágenes y el carrusel abre
                    la página, así que las cargamos ya. */}
                <img
                  src={r.heroImage ?? "/site/img/slider-1.webp"}
                  alt={r.nombre}
                  loading="eager"
                  decoding="async"
                />
                <h3 className="title">{r.nombre}</h3>
              </a>
            ))}
          </EmblaSlider>
        )}
        <div className="text-center mt_50">
          <a className="hero-btn cta-btn btn_v2" href={ctaHref}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
