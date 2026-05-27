import {
  getRegionesPublicas,
  getTipoPaqueteBySlug,
  getPaquetesByTipo,
  getRegionBySlug,
  getSiteSettings,
} from "@/lib/public-data";
import { DestinosGrid } from "@/components/public/DestinosGrid";
import { PackageCard } from "@/components/public/PackageCard";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("destinos");
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
      const [paquetes, regiones, settings] = await Promise.all([
        getPaquetesByTipo(tipo.id),
        // Resolver region slug para el href de cada paquete (toma la primera
        // región disponible; cae a una default si no tiene).
        getRegionesPublicas(),
        getSiteSettings("destinos"),
      ]);
      const defaultRegionSlug = regiones[0]?.slug ?? "ver";
      // Plantilla del subtítulo de categoría — {tipo} se reemplaza por el
      // nombre de la categoría. Editable desde /backend/web/destinos.
      const subtituloTpl =
        settings.destinos_categoria_subtitulo?.trim() ||
        "Paquetes de {tipo} disponibles.";
      const subtitulo = subtituloTpl.replace(
        /\{tipo\}/gi,
        tipo.nombre.toLowerCase(),
      );

      return (
        <section className="content-area">
          <div className="container">
            <div className="text-center mb_50">
              <h1 className="section-heading">{tipo.nombre}</h1>
              <p>{subtitulo}</p>
            </div>
            {paquetes.length === 0 ? (
              <p className="text-center py-12">
                Próximamente más paquetes en esta categoría.
              </p>
            ) : (
              <div className="row">
                {paquetes.map((p) => (
                  <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                    <PackageCard
                      paquete={p}
                      regionSlug={defaultRegionSlug}
                    />
                  </div>
                ))}
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
