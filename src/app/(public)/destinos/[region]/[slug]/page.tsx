import { notFound, permanentRedirect } from "next/navigation";
import {
  getPaqueteBySlug,
  getSiteSettings,
  getPaquetesRelacionados,
  getRegionResolver,
} from "@/lib/public-data";
import {
  resolveRegionSlugPaquete,
  resolveRegionSlugParaListado,
} from "@/lib/region-paquete";
import { auth } from "@/lib/auth.config";
import { PackageDetailView } from "./_components/PackageDetailView";
import { buildFormasDePagoData } from "./_components/FormasDePago";
import { RelatedPackages } from "./_components/RelatedPackages";
import { buildSeoMetadata } from "@/lib/seo";
import { precioDesdeDePaquete } from "@/lib/precio-desde";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";
import { iconForTrasladoTexto } from "@/lib/incluye";

export async function generateMetadata({
  params,
}: {
  params: { region: string; slug: string };
}) {
  const [p, regionResolver] = await Promise.all([
    getPaqueteBySlug(params.slug),
    getRegionResolver(),
  ]);
  // Canonical: SIEMPRE la región real del paquete, nunca el segmento de la
  // URL. El componente de página ya redirige a la región correcta, pero el
  // canonical es la señal que consolida en Google y no debe reforzar jamás una
  // región equivocada.
  const regionCanonica = p
    ? (resolveRegionSlugPaquete(p, regionResolver) ?? params.region)
    : params.region;
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
    // Al compartir un paquete debe ir SU foto: primera de la galería, o el
    // hero si la galería está vacía (p.ej. Rio & Buzios solo carga heroImage).
    // Sin ninguna de las dos cae al og-default de marca vía buildSeoMetadata.
    image: p?.fotos?.[0]?.url || p?.heroImage || undefined,
    noindex: !p,
    path: p ? `/destinos/${regionCanonica}/${params.slug}` : undefined,
  });
}

export default async function PackageDetailPage({
  params,
  searchParams,
}: {
  params: { region: string; slug: string };
  searchParams: { preview?: string };
}) {
  const [paquete, pagosSettings, regionResolver] = await Promise.all([
    getPaqueteBySlug(params.slug),
    getSiteSettings("pagos"),
    getRegionResolver(),
  ]);
  if (!paquete || paquete.deletedAt) notFound();

  // Drafts are visible only when ?preview=1 is set AND the request comes from
  // an authenticated admin session. Public visitors still get a 404 for
  // unpublished packages. Este gate va ANTES del redirect de región para que
  // un borrador nunca delate su existencia con un 308.
  const wantsPreview = searchParams.preview === "1";
  let isPreview = false;
  if (!paquete.publicado) {
    if (!wantsPreview) notFound();
    const session = await auth();
    if (!session?.user) notFound();
    isPreview = true;
  }

  // ── Región canónica de la URL ───────────────────────────────────────────
  // El detalle resuelve por slug, así que el segmento de región es cosmético y
  // durante un tiempo se generaron links con la región equivocada (todas las
  // cards de /destinos?tipo= y /tag/[slug] usaban la primera región publicada,
  // "europa", para cualquier paquete). Esas URLs viejas siguen vivas en Google
  // y en campañas: si la región del path no es la real del paquete, mandamos
  // al visitante a la buena.
  //
  // OJO con el status: /destinos/** tiene loading.tsx en tres niveles
  // (destinos/, [region]/, [region]/[slug]/), y un `loading.tsx` mete un
  // Suspense que hace que React arranque a streamear antes de que el page
  // resuelva. Cuando eso pasa, Next ya no puede cambiar el código de respuesta
  // y este permanentRedirect se degrada a un redirect client-side con 200 (lo
  // mismo le pasa hoy al notFound() de esta ruta: es un soft 404). El visitante
  // igual termina en la URL correcta, y el canonical apunta a la región real.
  // Para que sea un 308 de verdad hay que sacar esos loading.tsx y mover los
  // esqueletos a un <Suspense> dentro de cada page — decisión de producto,
  // afecta el perceived performance de los listados.
  //
  // Si la región no se puede resolver (paquete sin destinos cargados), no
  // redirigimos: la página se sirve igual que siempre bajo la región pedida.
  const regionReal = resolveRegionSlugPaquete(paquete, regionResolver);
  if (regionReal && regionReal !== params.region) {
    // `?preview=1` se preserva para no romper la vista de borradores del admin.
    permanentRedirect(
      `/destinos/${regionReal}/${params.slug}${isPreview ? "?preview=1" : ""}`,
    );
  }

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
      // Cada card relacionada linkea a SU región real, no a la del paquete
      // actual: el slider mezcla regiones cuando la región propia trae menos
      // de 3 resultados, y arrastrar `params.region` era otra fuente de
      // /destinos/europa/<paquete-de-Miami>.
      regionSlug: resolveRegionSlugParaListado(p, regionResolver),
    };
  });

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
              icon: "alojamiento",
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
    ...paquete.traslados.map((pt) => {
      // El ícono depende del medio que diga el texto, igual que en el generador
      // del Incluye: acá estaba fijo en "traslado" (auto), así que un renglón
      // como "Tren París - Amsterdam" mostraba un auto en la ficha pública.
      const texto = pt.textoDisplay ?? pt.traslado.nombre;
      return { texto, icon: iconForTrasladoTexto(texto) };
    }),
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

  // Precio "DESDE": la misma regla que aplica la pestaña Precios del backend
  // (ver src/lib/precio-desde.ts). `paquete.precioDesde` es una copia
  // denormalizada que sólo sirve para el ORDER BY de los listados; mostrarla
  // cruda es lo que hacía que la ficha y el panel dijeran números distintos.
  const precioDesdeReal = precioDesdeDePaquete(paquete);

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
