import { notFound } from "next/navigation";
import {
  getPaqueteBySlug,
  getSiteSettings,
  getPaquetesRelacionados,
} from "@/lib/public-data";
import { auth } from "@/lib/auth.config";
import { PackageDetailView } from "./_components/PackageDetailView";
import { buildFormasDePagoData } from "./_components/FormasDePago";
import { RelatedPackages } from "./_components/RelatedPackages";

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
  const [paquete, pagosSettings] = await Promise.all([
    getPaqueteBySlug(params.slug),
    getSiteSettings("pagos"),
  ]);
  if (!paquete || paquete.deletedAt) notFound();

  // Related packages — same region as the current package's first destino.
  const regionId =
    paquete.destinos[0]?.ciudad?.pais?.region?.id ?? null;
  const relacionadosRaw = await getPaquetesRelacionados(paquete.id, regionId);
  const relacionados = relacionadosRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    destino: p.destino,
    noches: p.noches,
    salidas: p.salidas,
    precioDesde: p.precioDesde,
    precioDesdeMoneda: p.precioDesdeMoneda,
    heroImage: p.heroImage,
    fotos: p.fotos.map((f) => ({ url: f.url, alt: f.alt ?? p.titulo })),
    destinos: p.destinos.map((d) => ({
      ciudad: { nombre: d.ciudad?.nombre ?? "" },
    })),
    // The public detail page resolves by slug (region segment is cosmetic),
    // so using the current region slug for every related card's href is safe.
    regionSlug: params.region,
  }));

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
        formasDePago={buildFormasDePagoData(pagosSettings)}
      />
      <RelatedPackages
        titulo="Descubrí más destinos"
        items={relacionados}
      />
    </>
  );
}
