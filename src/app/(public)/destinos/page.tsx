import {
  getRegionesPublicas,
  getTipoPaqueteBySlug,
  getPaquetesByTipo,
  getRegionBySlug,
  getSiteSettings,
} from "@/lib/public-data";
import { DestinosGrid } from "@/components/public/DestinosGrid";
import { PackageCard } from "@/components/public/PackageCard";

export const metadata = {
  title: "Destinos | TravelOz",
  description: "Descubrí todos nuestros destinos por región.",
};

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
      const paquetes = await getPaquetesByTipo(tipo.id);
      // Resolver region slug para el href de cada paquete (toma la primera región
      // disponible en sus destinos; cae a una región default si no tiene).
      const regiones = await getRegionesPublicas();
      const defaultRegionSlug = regiones[0]?.slug ?? "ver";

      return (
        <section className="content-area">
          <div className="container">
            <div className="text-center mb_50">
              <h1 className="section-heading">{tipo.nombre}</h1>
              <p>Paquetes de {tipo.nombre.toLowerCase()} disponibles.</p>
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
