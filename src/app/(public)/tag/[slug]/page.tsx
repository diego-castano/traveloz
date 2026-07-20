import { notFound } from "next/navigation";
import {
  getEtiquetaBySlug,
  getPaquetesByEtiqueta,
  getRegionesPublicas,
  getSiteSettings,
} from "@/lib/public-data";
import { PackageCard } from "@/components/public/PackageCard";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";

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
  });
}

export default async function TagPage({
  params,
}: {
  params: { slug: string };
}) {
  const etiqueta = await getEtiquetaBySlug(params.slug);
  if (!etiqueta) notFound();

  const [paquetes, regiones, settings] = await Promise.all([
    getPaquetesByEtiqueta(etiqueta.id),
    // Resolver region slug para el href de cada paquete (toma la primera
    // región disponible; cae a una default si no tiene).
    getRegionesPublicas(),
    getSiteSettings("destinos"),
  ]);
  const defaultRegionSlug = regiones[0]?.slug ?? "ver";
  // Misma plantilla del subtítulo de categoría que usa /destinos?tipo= — ver
  // comentario en generateMetadata sobre el reuso deliberado.
  const subtituloTpl =
    settings.destinos_categoria_subtitulo?.trim() ||
    "Paquetes de {tipo} disponibles.";
  const subtitulo = subtituloTpl.replace(
    /\{tipo\}/gi,
    etiqueta.nombre.toLowerCase(),
  );

  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center mb_50">
          <h1 className="section-heading">{etiqueta.nombre}</h1>
          <p>{subtitulo}</p>
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
                }),
              };
              return (
                <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                  <PackageCard
                    paquete={cardData}
                    regionSlug={defaultRegionSlug}
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
