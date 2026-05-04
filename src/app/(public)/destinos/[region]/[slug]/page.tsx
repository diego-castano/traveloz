import { notFound } from "next/navigation";
import { getPaqueteBySlug } from "@/lib/public-data";
import { PackageHero } from "./_components/PackageHero";
import { IncluyeTab } from "./_components/IncluyeTab";
import { AlojamientosTab } from "./_components/AlojamientosTab";
import { QuoteSidebar } from "./_components/QuoteSidebar";
import { FormasDePago } from "./_components/FormasDePago";

export async function generateMetadata({
  params,
}: {
  params: { region: string; slug: string };
}) {
  const p = await getPaqueteBySlug(params.slug);
  if (!p) return { title: "TravelOz" };
  return {
    title: p.metaTitle ?? `${p.titulo} | TravelOz`,
    description:
      p.metaDescription ?? `Conocé ${p.titulo}, ${p.noches} noches.`,
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: { region: string; slug: string };
}) {
  const paquete = await getPaqueteBySlug(params.slug);
  if (!paquete || !paquete.publicado || paquete.deletedAt) notFound();

  return (
    <>
      <PackageHero paquete={paquete} />
      <section className="content-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                {paquete.textoIntro && (
                  <div
                    style={{
                      fontSize: 16,
                      color: "#444",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {paquete.textoIntro}
                  </div>
                )}
                <IncluyeTab
                  textoIncluye={paquete.textoIncluye}
                  servicios={paquete.serviciosIncluidos}
                />
                {paquete.textoNoIncluye && (
                  <div>
                    <h2 style={{ fontSize: 22, marginBottom: 12 }}>No incluye</h2>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#666",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {paquete.textoNoIncluye}
                    </div>
                  </div>
                )}
                {paquete.itinerarioPublico && (
                  <div>
                    <h2 style={{ fontSize: 22, marginBottom: 12 }}>Itinerario</h2>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#444",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {paquete.itinerarioPublico}
                    </div>
                  </div>
                )}
                <AlojamientosTab opciones={paquete.opcionesHoteleras} />
                {paquete.textoCondiciones && (
                  <div>
                    <h2 style={{ fontSize: 22, marginBottom: 12 }}>
                      Condiciones
                    </h2>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#666",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {paquete.textoCondiciones}
                    </div>
                  </div>
                )}
              </div>
              <FormasDePago />
            </div>
            <div className="col-lg-4">
              <QuoteSidebar
                paqueteId={paquete.id}
                paqueteTitulo={paquete.titulo}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
