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
import { buildSeoMetadata } from "@/lib/seo";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";

export async function generateMetadata({
  params,
}: {
  params: { region: string; slug: string };
}) {
  const p = await getPaqueteBySlug(params.slug);
  // Noches robustas para el SEO: paquetes CIRCUITO tienen `noches` = 0 y las
  // reales viven en el circuito → evita "0 noches" en la meta description.
  const nochesSeo = p
    ? resolveNochesTotales({
        noches: p.noches,
        destinos: p.destinos,
        circuitoNoches: p.circuitos[0]?.circuito?.noches ?? null,
      })
    : 0;
  return buildSeoMetadata("default", {
    title: p ? (p.metaTitle ?? `${p.titulo} | TravelOz`) : undefined,
    // Fallback en cascada: meta propia → descripción interna → genérico.
    description: p
      ? (p.metaDescription?.trim() ||
        p.descripcion?.trim() ||
        (nochesSeo > 0
          ? `Conocé ${p.titulo}, ${nochesSeo} noche${nochesSeo === 1 ? "" : "s"}.`
          : `Conocé ${p.titulo}.`))
      : undefined,
    image: p?.fotos?.[0]?.url ?? undefined,
    noindex: !p,
  });
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
  const relacionados = relacionadosRaw.map((p) => {
    const nochesTotales = resolveNochesTotales({
      noches: p.noches,
      destinos: p.destinos,
      circuitoNoches: p.circuitos[0]?.circuito?.noches ?? null,
    });
    return {
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
      bullets: buildCardBullets({
        textoIncluye: p.textoIncluye,
        nochesTotales,
        cardBullets: p.cardBullets,
      }),
      destinos: p.destinos.map((d) => ({
        ciudad: { nombre: d.ciudad?.nombre ?? "" },
      })),
      // The public detail page resolves by slug (region segment is cosmetic),
      // so using the current region slug for every related card's href is safe.
      regionSlug: params.region,
    };
  });

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

  // Lista "Incluye" derivada de los servicios estructurados que el operador
  // cargó al crear el paquete. Se usa como fallback cuando no hay una lista
  // pública curada (serviciosIncluidos del catálogo / textoIncluye). Cada
  // servicio usa su `textoDisplay` si fue personalizado, o el nombre/ruta base.
  // Régimen por ciudad: lo tomamos del primer hotel (de cualquier opción) que
  // esté en esa ciudad y tenga régimen cargado. Sirve para armar la línea
  // "N noches de alojamiento en {ciudad} con {régimen}" por destino.
  const regimenPorCiudad = new Map<string, string>();
  for (const opt of paquete.opcionesHoteleras) {
    for (const h of opt.hoteles) {
      const ciudad = h.alojamiento.ciudad?.nombre;
      if (!ciudad || regimenPorCiudad.has(ciudad)) continue;
      const reg = h.alojamiento.precios.find((p) => p.regimen?.nombre)?.regimen
        ?.nombre;
      if (reg) regimenPorCiudad.set(ciudad, reg);
    }
  }
  // Una línea por destino con sus noches y, si lo tenemos, el régimen.
  const nochesDerivadas = paquete.destinos
    .filter((d) => (d.noches || 0) > 0)
    .map((d) => {
      const ciudad = d.ciudad?.nombre;
      const plural = d.noches === 1 ? "noche" : "noches";
      const lugar = ciudad ? ` en ${ciudad}` : "";
      const reg = ciudad && regimenPorCiudad.has(ciudad)
        ? ` con ${regimenPorCiudad.get(ciudad)!.toLowerCase()}`
        : "";
      return {
        texto: `${d.noches} ${plural} de alojamiento${lugar}${reg}`,
        icon: "alojamiento",
      };
    });
  // Fallback: si no hay destinos cargados pero sí noches totales, una sola línea.
  const nochesTotales =
    paquete.noches ??
    paquete.destinos.reduce((sum, d) => sum + (d.noches || 0), 0);
  const nochesBullets =
    nochesDerivadas.length > 0
      ? nochesDerivadas
      : nochesTotales > 0
        ? [
            {
              texto: `${nochesTotales} noche${nochesTotales === 1 ? "" : "s"} de alojamiento`,
              icon: "bed",
            },
          ]
        : [];
  const serviciosDerivados: { texto: string; icon: string }[] = [
    ...paquete.aereos.flatMap((pa) => [
      { texto: pa.textoDisplay ?? pa.aereo.ruta, icon: "vuelo" },
      ...(pa.aereo.equipaje?.trim()
        ? [{ texto: pa.aereo.equipaje, icon: "equipaje" }]
        : []),
    ]),
    ...paquete.traslados.map((pt) => ({
      texto: pt.textoDisplay ?? pt.traslado.nombre,
      icon: "traslado",
    })),
    ...nochesBullets,
    ...paquete.circuitos.map((pc) => ({
      texto: pc.textoDisplay ?? pc.circuito.nombre,
      icon: "excursion",
    })),
    // Seguro: texto fijo, una sola línea si hay al menos un seguro cargado.
    ...(paquete.seguros.length > 0
      ? [{ texto: "Seguro de asistencia al viajero", icon: "seguro" }]
      : []),
  ].filter((s) => s.texto && s.texto.trim());

  // Precio "DESDE" robusto: el menor precioVenta entre las opciones hoteleras.
  // `paquete.precioDesde` es un campo denormalizado que puede quedar
  // desincronizado si un recompute falló; las opciones hoteleras son la fuente
  // real del precio que ve el cliente, así que leemos el mínimo directo de ahí.
  const ventasOpciones = paquete.opcionesHoteleras
    .map((o) => o.precioVenta)
    .filter((v) => v > 0);
  const precioDesdeReal = ventasOpciones.length
    ? Math.min(...ventasOpciones)
    : paquete.precioDesde;

  // Itinerario estructurado día a día: solo aplica a modalidad CIRCUITO, y
  // toma el primer circuito asignado al paquete (el motor de precios ya
  // asume un único circuito por paquete en esta modalidad).
  const itinerarioDias = (paquete.circuitos[0]?.circuito?.itinerario ?? []).map(
    (d) => ({
      numeroDia: d.numeroDia,
      titulo: d.titulo,
      descripcion: d.descripcion,
    }),
  );

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
          modalidad: paquete.modalidad,
          salidas: paquete.salidas,
          noches: paquete.noches,
          precioDesde: precioDesdeReal,
          precioDesdeMoneda: paquete.precioDesdeMoneda,
          heroImage: paquete.heroImage,
          fotos: paquete.fotos.map((f) => ({
            url: f.url,
            alt: f.alt ?? paquete.titulo,
            posX: f.posX,
            posY: f.posY,
            zoom: f.zoom,
          })),
          textoIntro: paquete.textoIntro,
          textoIncluye: paquete.textoIncluye,
          itinerarioPublico: paquete.itinerarioPublico,
          itinerarioDias,
          textoCondiciones: paquete.textoCondiciones,
          serviciosDerivados,
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
            textoDisplay: opt.textoDisplay,
            precioVenta: opt.precioVenta,
            hoteles: opt.hoteles.map((h) => ({
              id: h.id,
              alojamiento: {
                nombre: h.alojamiento.nombre,
                categoria: h.alojamiento.categoria,
                ciudad: h.alojamiento.ciudad?.nombre ?? null,
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
        related={
          <RelatedPackages
            titulo="Descubrí más destinos, explorá otras opciones"
            items={relacionados}
          />
        }
      />
    </>
  );
}
