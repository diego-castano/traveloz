import {
  getRegionesPublicas,
  getTipoPaqueteBySlug,
  getPaquetesByTipo,
  getRegionResolver,
  getSiteSettings,
} from "@/lib/public-data";
import { DestinosGrid } from "@/components/public/DestinosGrid";
import { PackageCard } from "@/components/public/PackageCard";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";
import { serviciosDelConteo } from "@/lib/paquete-listing";
import { resolveRegionSlugParaListado } from "@/lib/region-paquete";

export async function generateMetadata() {
  return buildSeoMetadata("destinos", { path: "/destinos" });
}

export default async function DestinosPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const tipoSlug = searchParams.tipo?.trim();

  // Modo categoría: ?tipo=lunas-de-miel → muestra paquetes filtrados por tipo
  if (tipoSlug) {
    const tipo = await getTipoPaqueteBySlug(tipoSlug);
    if (tipo) {
      const [paquetes, regionResolver] = await Promise.all([
        getPaquetesByTipo(tipo.id),
        // El href de cada card sale de la región REAL de ese paquete
        // (src/lib/region-paquete.ts). Antes esta grilla usaba la primera
        // región publicada para todos, y por eso los paquetes de Miami
        // salían linkeados como /destinos/europa/….
        getRegionResolver(),
      ]);
      return (
        <section className="content-area">
          <div className="container">
            {/* Sin subtitulo: el cliente pidio dejar solo el titulo en estas
                landings, igual que en las de etiqueta (/tag/[slug]). La
                plantilla sigue armando la meta description, que si le sirve a
                Google. */}
            <div className="text-center mb_50">
              {/* listing-heading: titulo mas chico en mobile (ver site.css). */}
              <h1 className="section-heading listing-heading">{tipo.nombre}</h1>
            </div>
            {paquetes.length === 0 ? (
              <p className="text-center py-12">
                Próximamente más paquetes en esta categoría.
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
                    <div
                      className="col-lg-4 col-md-6 mb-4 tvz-card-col"
                      key={p.id}
                    >
                      <PackageCard
                        paquete={cardData}
                        regionSlug={resolveRegionSlugParaListado(
                          p,
                          regionResolver,
                        )}
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
  }

  // Modo default: grid de regiones
  const [regiones, settings] = await Promise.all([
    getRegionesPublicas(),
    getSiteSettings("destinos"),
  ]);
  return <DestinosGrid regiones={regiones} settings={settings} />;
}
