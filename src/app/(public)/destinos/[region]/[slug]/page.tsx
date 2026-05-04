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
                <IncluyeTab
                  textoIncluye={paquete.textoIncluye}
                  servicios={paquete.serviciosIncluidos}
                />
                <AlojamientosTab opciones={paquete.opcionesHoteleras} />
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
