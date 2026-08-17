import { notFound } from "next/navigation";
import {
  getEtiquetaBySlug,
  getPaquetesByEtiqueta,
  getRegionResolver,
  getSiteSettings,
} from "@/lib/public-data";
import { PackageCard } from "@/components/public/PackageCard";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";
import { serviciosDelConteo } from "@/lib/paquete-listing";
import { resolveRegionSlugParaListado } from "@/lib/region-paquete";

// ---------------------------------------------------------------------------
// /tag/[slug] — landing publica por Etiqueta (ej. "Miami combinados"). Mismo
// shell visual que el "modo categoria" de /destinos?tipo= (ver el bloque
// `if (tipoSlug)` en (public)/destinos/page.tsx): section-heading + grid de
// PackageCard, misma vista vacia. La diferencia es el filtro: acá es por
// Etiqueta (PaqueteEtiqueta), no por TipoPaquete.
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const etiqueta = await getEtiquetaBySlug(params.slug);
  if (!etiqueta) {
    return buildSeoMetadata("default", { noindex: true });
  }

  // Reuso deliberado de la plantilla `destinos_categoria_subtitulo` (grupo
  // "destinos", editable desde /backend/web/destinos): es la misma plantilla
  // que arma el subtitulo de /destinos?tipo=, reemplazando {tipo} por el
  // nombre de la etiqueta en vez del tipo de paquete. No se crea un setting
  // nuevo solo para etiquetas.
  const settings = await getSiteSettings("destinos");
  const subtituloTpl =
    settings.destinos_categoria_subtitulo?.trim() ||
    "Paquetes de {tipo} disponibles.";
  const description = subtituloTpl.replace(
    /\{tipo\}/gi,
    etiqueta.nombre.toLowerCase(),
  );

  return buildSeoMetadata("default", {
    title: `${etiqueta.nombre} | TravelOz`,
    description,
    noindex: false,
    path: `/tag/${params.slug}`,
  });
}

export default async function TagPage({
  params,
}: {
  params: { slug: string };
}) {
  const etiqueta = await getEtiquetaBySlug(params.slug);
  if (!etiqueta) notFound();

  const [paquetes, regionResolver] = await Promise.all([
    getPaquetesByEtiqueta(etiqueta.id),
    // El href de cada card sale de la región REAL de ese paquete
    // (src/lib/region-paquete.ts). Esta landing es la que reportó el cliente:
    // /tag/miami-combinados linkeaba todo a /destinos/europa/… porque usaba la
    // primera región publicada para cualquier paquete.
    getRegionResolver(),
  ]);

  return (
    <section className="content-area">
      <div className="container">
        {/* Sin subtitulo: el cliente pidio dejar solo el titulo en las landings
            de etiqueta. La plantilla sigue armando la meta description (ver
            generateMetadata), que si le sirve a Google. */}
        <div className="text-center mb_50">
          {/* listing-heading: titulo mas chico en mobile (ver site.css). */}
          <h1 className="section-heading listing-heading">{etiqueta.nombre}</h1>
        </div>
        {paquetes.length === 0 ? (
          <p className="text-center py-12">
            Próximamente más paquetes con esta etiqueta.
          </p>
        ) : (
          <div className="row">
            {paquetes.map((p) => {
              const nochesTotales = resolveNochesTotales({
                noches: p.noches,
                destinos: p.destinos,
                circuitoNoches: p.circuitos[0]?.circuito?.noches ?? null,
              });
              const cardData = {
                ...p,
                bullets: buildCardBullets({
                  textoIncluye: p.textoIncluye,
                  nochesTotales,
                  cardBullets: p.cardBullets,
                  servicios: serviciosDelConteo(p._count),
                }),
              };
              return (
                // tvz-card-col: estira la card al alto de la fila (site.css,
                // "Tarjetas de paquete del grid — todas al mismo alto").
                <div className="col-lg-4 col-md-6 mb-4 tvz-card-col" key={p.id}>
                  <PackageCard
                    paquete={cardData}
                    regionSlug={resolveRegionSlugParaListado(p, regionResolver)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
