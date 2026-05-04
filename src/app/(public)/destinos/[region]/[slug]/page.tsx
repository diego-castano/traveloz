import { notFound } from "next/navigation";
import { getPaqueteBySlug } from "@/lib/public-data";
import { auth } from "@/lib/auth.config";
import { PackageDetailView } from "./_components/PackageDetailView";

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
  searchParams,
}: {
  params: { region: string; slug: string };
  searchParams: { preview?: string };
}) {
  const paquete = await getPaqueteBySlug(params.slug);
  if (!paquete || paquete.deletedAt) notFound();

  // Drafts are visible only when ?preview=1 is set AND the request comes from
  // an authenticated admin session. Public visitors still get a 404 for
  // unpublished packages.
  const wantsPreview = searchParams.preview === "1";
  let isPreview = false;
  if (!paquete.publicado) {
    if (!wantsPreview) notFound();
    const session = await auth();
    if (!session?.user) notFound();
    isPreview = true;
  }

  return (
    <>
      {isPreview && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 60,
            background: "#785AE5",
            color: "white",
            textAlign: "center",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.4,
          }}
        >
          PREVIEW · Borrador no publicado
        </div>
      )}
      <PackageDetailView
        paquete={{
          id: paquete.id,
          titulo: paquete.titulo,
          salidas: paquete.salidas,
          noches: paquete.noches,
          precioDesde: paquete.precioDesde,
          precioDesdeMoneda: paquete.precioDesdeMoneda,
          heroImage: paquete.heroImage,
          fotos: paquete.fotos.map((f) => ({
            url: f.url,
            alt: f.alt ?? paquete.titulo,
          })),
          textoIntro: paquete.textoIntro,
          textoIncluye: paquete.textoIncluye,
          textoNoIncluye: paquete.textoNoIncluye,
          itinerarioPublico: paquete.itinerarioPublico,
          textoCondiciones: paquete.textoCondiciones,
          serviciosIncluidos: paquete.serviciosIncluidos.map((s) => ({
            id: s.id,
            textoCustom: s.textoCustom,
            servicio: {
              nombre: s.servicio.nombre,
              icon: s.servicio.icon ?? null,
            },
          })),
          opcionesHoteleras: paquete.opcionesHoteleras.map((opt) => ({
            id: opt.id,
            nombre: opt.nombre,
            precioVenta: opt.precioVenta,
            hoteles: opt.hoteles.map((h) => ({
              id: h.id,
              alojamiento: {
                nombre: h.alojamiento.nombre,
                categoria: h.alojamiento.categoria,
                fotos: h.alojamiento.fotos?.map((ph) => ({
                  url: ph.url,
                  alt: ph.alt,
                })),
                precios: h.alojamiento.precios.map((p) => ({
                  precioPorNoche: p.precioPorNoche,
                  periodoDesde: p.periodoDesde.toString(),
                  periodoHasta: p.periodoHasta.toString(),
                  regimen: p.regimen
                    ? { nombre: p.regimen.nombre, abrev: p.regimen.abrev }
                    : null,
                })),
              },
            })),
          })),
        }}
      />
    </>
  );
}
