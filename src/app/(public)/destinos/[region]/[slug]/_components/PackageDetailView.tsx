"use client";

import { useState } from "react";
import { EmblaSlider } from "@/components/public/EmblaSlider";
import { Skeleton } from "@/components/public/SkeletonClient";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { parseIncluyeItems, incluyeIconUrl } from "@/lib/incluye";
import { QuoteSidebar } from "./QuoteSidebar";
import { FormasDePago, type FormasDePagoData } from "./FormasDePago";

// ---------------------------------------------------------------------------
// PackageDetailView — public single-package layout that mirrors the reference
// markup in html_inicial/destinos-detalle.html so site.css styles apply 1:1
// (gradient-page-bg, content-box.style3, top-heading.stck, image-slider.style3,
// box-tab-content.style1 with .nav-tabs, .text-box.style1, payment-box,
// sidebar-form.sticky). Tabs are pure React state — no Bootstrap JS required.
// ---------------------------------------------------------------------------

type Foto = { url: string; alt: string };
type Servicio = {
  id: string;
  textoCustom: string | null;
  servicio: { nombre: string; icon: string | null };
};
type Hotel = {
  id: string;
  alojamiento: {
    nombre: string;
    categoria: number | null;
    ciudad: string | null;
    fotos?: { url: string; alt: string | null }[];
    precios: {
      precioPorNoche: number;
      periodoDesde: string;
      periodoHasta: string;
      regimen: { nombre: string; abrev: string } | null;
    }[];
  };
};
// `precioVenta` is the customer-facing price for the OPCION (bundled package
// option), with markup already applied by the seller. Per-hotel `precios`
// hold internal/wholesale rates used by ops — never shown to the public.
type Opcion = {
  id: string;
  nombre: string;
  precioVenta: number;
  hoteles: Hotel[];
};

type Props = {
  paquete: {
    id: string;
    titulo: string;
    salidas: string | null;
    noches: number;
    precioDesde: number | null;
    precioDesdeMoneda: string | null;
    heroImage: string | null;
    fotos: Foto[];
    textoIntro: string | null;
    textoIncluye: string | null;
    itinerarioPublico: string | null;
    textoCondiciones: string | null;
    serviciosIncluidos: Servicio[];
    /** Fallback de la lista "Incluye": servicios estructurados cargados al
     * crear el paquete (aéreos, traslados, noches, circuitos, seguros). Se
     * muestran sólo cuando no hay lista pública curada. */
    serviciosDerivados: { texto: string; icon: string }[];
    opcionesHoteleras: Opcion[];
  };
  /** Payment methods block — built from SiteSettings group="pagos". */
  formasDePago?: FormasDePagoData;
};

const SERVICE_ICON_FALLBACK = "/site/img/p-exc-icon.png";

function serviceIconUrl(icon: string | null): string {
  if (!icon) return SERVICE_ICON_FALLBACK;
  return `/site/img/p-${icon}-icon.png`;
}

// Match a free-text bullet to one of the 5 reference icons (flight/bag/bus/
// bed/exc) by detecting Spanish travel keywords. Falls back to "exc" so every
// bullet at least gets a checkmark-style icon.
function detectIconForBullet(text: string): string {
  const t = text.toLowerCase();
  if (/\b(pasaje|aére[oa]|vuelo|avi[oó]n|aeropuerto)\b/.test(t)) return "flight";
  if (/\b(carry|equipaje|valija|maleta|bolso|bagaje)\b/.test(t)) return "bag";
  if (/\b(traslado|transfer|bus|[oó]mnibus|micro|combi)\b/.test(t)) return "bus";
  if (
    /\b(noche|noches|alojamiento|hotel|habitaci[oó]n|r[ée]gimen|desayuno|all\s*inclusive|media\s*pensi[oó]n|pensi[oó]n)\b/.test(
      t,
    )
  )
    return "bed";
  return "exc";
}

// Los textos del paquete pueden venir como HTML (editados con el editor
// enriquecido del backend) o como texto plano legacy. Estos helpers permiten
// renderizar ambos casos sin romper el contenido viejo.
function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

// Quita tags para detectar el ícono del bullet a partir del texto visible.
function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convierte "Lo que incluye" en items para la lista de bullets. Cada item
// conserva su HTML inline (negrita/cursiva/links) y expone su texto plano
// para resolver el ícono. Soporta tanto HTML como texto plano legacy.
function parseIncludeItems(raw: string): { html: string; text: string }[] {
  if (!raw) return [];
  if (!looksLikeHtml(raw)) {
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((t) => ({ html: escapeHtml(t), text: t }));
  }
  // HTML: separamos por bloques (div/p/li) y saltos <br>, descartando los
  // wrappers de lista para quedarnos con una línea = un bullet.
  const normalized = raw
    .replace(/<\/(div|p|li)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(div|p|li)[^>]*>/gi, "")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "");
  return normalized
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => stripTags(s).length > 0)
    .map((html) => ({ html, text: stripTags(html) }));
}

function formatPeriodo(desde: string, hasta: string): string {
  // Strings come as ISO; render as MM/YYYY range. Defensive against empty.
  try {
    const d = new Date(desde);
    const h = new Date(hasta);
    const fmt = (dt: Date) =>
      `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    return `${fmt(d)} a ${fmt(h)}`;
  } catch {
    return `${desde} a ${hasta}`;
  }
}

// Scoped style overrides — tighten font sizes that site.css inherited from
// the reference to match a more polished feel: smaller Incluye bullets +
// icons, tighter text-box padding, and a sane container width.
const SCOPED_STYLES = `
  .pkg-detail .container.wide { max-width: 1200px; }
  .pkg-detail .content-box.style3 .top-heading { padding: 24px 28px 16px; }
  .pkg-detail .pkg-title { font-size: 36px; line-height: 1.1; margin-bottom: 8px; }
  .pkg-detail .box-tab-content.style1 .nav-tabs { padding: 14px 28px 0; gap: 0; }
  /* Bootstrap le pone margin-bottom:-1px a los .nav-link (efecto "tab pegado")
     y los botones traen fondo blanco: el tab activo se monta sobre el
     border-bottom de .nav-tabs y tapa la línea separadora justo debajo. Lo
     neutralizamos para que la línea quede continua. */
  .pkg-detail .box-tab-content.style1 .nav-link {
    font-size: 16px;
    padding: 8px 0;
    margin-bottom: 0;
    background: transparent;
  }
  .pkg-detail .box-tab-content.style1 .content-inner {
    padding: 24px 28px;
  }
  /* Solo los bullets de "Incluye" (hijos directos del <ul.content-inner>).
     El '> li' evita que esto se filtre a los <li> de las estrellas, que viven
     anidados dentro de .content-inner.style2 en el tab Alojamientos. */
  .pkg-detail .box-tab-content.style1 .content-inner > li {
    font-size: 16px;
    line-height: 1.4;
    margin-bottom: 14px;
    color: #2b2b2b;
  }
  .pkg-detail .box-tab-content.style1 .content-inner > li img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    margin-right: 14px;
    flex-shrink: 0;
  }
  /* Alojamientos — cada OPCIÓN es un contenedor gris (como el PDF), que agrupa
     sus hoteles. El gris + el orden por precio hacen evidente que son opciones
     distintas, sin necesidad de etiqueta "Opción N". */
  .pkg-detail .opcion-card.text-box.style1 {
    background: #f6f4f9;
    border: 1px solid #ebe5f2;
    border-radius: 12px;
    padding: 22px 24px;
    margin-top: 18px;
  }
  /* Estrellas inline a la derecha del nombre (PDF: "Astoria Copacabana ★★★"),
     anulando el column-reverse del template que las pone arriba.
     font-family explícito: site.css aplica una regla h1..h6 con font-family
     Rufina sobre el h3, que gana por herencia. El PDF usa Clarika (sans) para
     el nombre del hotel, no la serif Rufina; lo forzamos acá. */
  .pkg-detail .opcion-card .h4 {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    font-family: "Clarika Geometric", system-ui, -apple-system, sans-serif;
    font-weight: 700;
  }
  .pkg-detail .opcion-card .h4 ul li i { font-size: 14px; }

  /* Hoteles dentro de la opción: a partir del 2.º, divisor sutil para leer
     "estos hoteles van juntos en esta opción". */
  .pkg-detail .hotel-item-divided {
    border-top: 1px solid #e3d9ef;
    margin-top: 16px;
    padding-top: 16px;
  }

  /* Régimen en una sola línea gris, igual que el PDF. */
  .pkg-detail .opcion-card .hotel-detail {
    display: block;
    font-size: 14px;
    color: #8a8a8a;
    line-height: 1.4;
  }

  /* Fila de precio de la opción — sin borde superior (como el PDF), apenas
     separada de los hoteles. */
  .pkg-detail .opcion-card .meta {
    margin-top: 16px;
    align-items: flex-end;
  }
  .pkg-detail .opcion-card .meta .left .date {
    margin-bottom: 0;
    color: #A05ED3;
  }
  .pkg-detail .opcion-card .meta .left .icon {
    color: #A05ED3;
    margin-right: 6px;
  }
  .pkg-detail .opcion-card .price-consult {
    font-size: 15px;
    font-style: italic;
    font-weight: 400;
    color: #888;
  }

  .pkg-detail .sidebar-form { padding: 28px; }
  .pkg-detail .sidebar-form .main-price { font-size: 56px; }
  .pkg-detail .sidebar-form .price-left .title { font-size: 14px; }
  .pkg-detail .sidebar-form .price-left .title2 { font-size: 22px; }
  .pkg-detail .sidebar-form .form-title { font-size: 18px; margin-top: 18px; }
  .pkg-detail .sidebar-form form input,
  .pkg-detail .sidebar-form form select,
  .pkg-detail .sidebar-form form textarea { height: 42px; font-size: 13.5px; }
  .pkg-detail .sidebar-form form textarea { height: 90px; }
  .pkg-detail .sidebar-form form button.btns { font-size: 16px; padding: 9px 24px; }
  .pkg-detail .payment-box .heading { padding: 20px 24px; }
  .pkg-detail .payment-box .h2 { font-size: 18px; }
  .pkg-detail .payment-box .content { padding: 20px 24px; }
  .pkg-detail .payment-box .content .title { font-size: 14px; margin-bottom: 10px; }
  .pkg-detail .payment-icon { height: 42px; padding: 6px; }

  /* Texto enriquecido (intro / itinerario / condiciones) — restaura listas y
     resaltados que site.css resetea, y da un ritmo de párrafo legible. */
  .pkg-detail .pkg-richtext p { margin: 0 0 0.8em; }
  .pkg-detail .pkg-richtext p:last-child { margin-bottom: 0; }
  .pkg-detail .pkg-richtext ul,
  .pkg-detail .pkg-richtext ol {
    margin: 0 0 0.8em;
    padding-left: 1.5em;
  }
  .pkg-detail .pkg-richtext ul { list-style: disc; }
  .pkg-detail .pkg-richtext ol { list-style: decimal; }
  .pkg-detail .pkg-richtext li { margin-bottom: 0.3em; }
  .pkg-detail .pkg-richtext b,
  .pkg-detail .pkg-richtext strong { font-weight: 700; }
  .pkg-detail .pkg-richtext i,
  .pkg-detail .pkg-richtext em { font-style: italic; }
  .pkg-detail .pkg-richtext u { text-decoration: underline; }
  .pkg-detail .pkg-richtext a { color: #A05ED3; text-decoration: underline; }

  /* ---------------------------------------------------------------------
     Mobile — versión compacta y "escueta": tipografías e íconos más chicos,
     menos padding, para que la ficha (sobre todo Alojamientos) no se vea
     sobredimensionada en celular.
  --------------------------------------------------------------------- */
  @media (max-width: 767px) {
    .pkg-detail .content-box.style3 .top-heading { padding: 18px 18px 12px; }

    /* Header: título más delicado y apilado sobre el precio, así usa todo el
       ancho y no se parte en 3 renglones. */
    .pkg-detail .top-heading .row > [class*="col-"] {
      flex: 0 0 100%;
      max-width: 100%;
    }
    .pkg-detail .pkg-title { font-size: 22px; line-height: 1.18; margin-bottom: 6px; }
    .pkg-detail .top-heading .large-price {
      justify-content: flex-start;
      margin-top: 10px;
      margin-bottom: 0;
    }
    .pkg-detail .top-heading .pr_notes {
      text-align: left !important;
      margin-top: 4px;
    }
    .pkg-detail .box-tab-content.style1 .nav-tabs { padding: 10px 18px 0; }
    .pkg-detail .box-tab-content.style1 .nav-link { font-size: 15px; }
    .pkg-detail .box-tab-content.style1 .content-inner { padding: 16px 18px; }
    .pkg-detail .box-tab-content.style1 .content-inner > li {
      font-size: 14px;
      margin-bottom: 10px;
    }
    .pkg-detail .box-tab-content.style1 .content-inner > li img {
      width: 26px;
      height: 26px;
      margin-right: 10px;
    }

    /* Contenedor de opción y hoteles en mobile — más compacto. */
    .pkg-detail .opcion-card.text-box.style1 { padding: 16px 16px; margin-top: 14px; }
    .pkg-detail .opcion-card .h4 { font-size: 18px; gap: 8px; }
    .pkg-detail .opcion-card .h4 ul li i { font-size: 12px; }
    .pkg-detail .opcion-card .hotel-detail { font-size: 13px; }
    .pkg-detail .hotel-item-divided { margin-top: 12px; padding-top: 12px; }
    .pkg-detail .opcion-card .meta { margin-top: 14px; }
    .pkg-detail .opcion-card .meta .price { font-size: 18px; }
  }
`;

// Bloque de texto del paquete. Renderiza HTML cuando el contenido fue editado
// con formato; para texto plano legacy preserva los saltos con pre-wrap.
function RichBlock({
  content,
  style,
}: {
  content: string;
  style?: React.CSSProperties;
}) {
  if (looksLikeHtml(content)) {
    return (
      <div
        className="pkg-richtext"
        style={style}
        // Sanitizado con whitelist: aunque el contenido lo cargan admins, esto
        // bloquea scripts/estilos inyectados por pegado y fuerza target/rel en
        // los links externos.
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    );
  }
  return <div style={{ ...style, whiteSpace: "pre-wrap" }}>{content}</div>;
}

export function PackageDetailView({ paquete, formasDePago }: Props) {
  const [tab, setTab] = useState<"incluye" | "alojamientos">("incluye");

  // Compose the slider photos. The featured photo (heroImage) always opens the
  // carousel, whether it lives in the gallery or is a standalone hero URL — so
  // the operator can feature any photo without having to reorder the gallery.
  const fotos: Foto[] = (() => {
    const hero = paquete.heroImage;
    if (hero) {
      const inGallery = paquete.fotos.find((f) => f.url === hero);
      return inGallery
        ? [inGallery, ...paquete.fotos.filter((f) => f.url !== hero)]
        : [{ url: hero, alt: paquete.titulo }, ...paquete.fotos];
    }
    return paquete.fotos.length > 0
      ? paquete.fotos
      : [{ url: "/site/img/slider-1.webp", alt: paquete.titulo }];
  })();

  // Items rendered inside the Incluye list — services first, then any extra
  // bullets parsed from textoIncluye (one per non-empty line/bloque). Cada
  // item conserva su HTML inline y su texto plano para resolver el ícono.
  const includeBullets = parseIncludeItems(paquete.textoIncluye ?? "");

  // Lista "Incluye" nueva: renglones ordenados (ícono + texto) que el operador
  // armó en el módulo drag-and-drop, serializados como JSON en textoIncluye.
  // Cuando existe, es la única fuente y reemplaza las ramas legacy de abajo.
  const incluyeItems = parseIncluyeItems(paquete.textoIncluye);
  const hasIncluyeModule = !!incluyeItems && incluyeItems.length > 0;

  // ¿El operador curó una lista pública "Incluye" (catálogo o texto libre)?
  // Si no, caemos a los servicios estructurados que cargó al crear el paquete.
  const hasManualIncluye =
    paquete.serviciosIncluidos.length > 0 || includeBullets.length > 0;

  return (
    <section className="content-area gradient-page-bg ver2 pkg-detail">
      <style dangerouslySetInnerHTML={{ __html: SCOPED_STYLES }} />
      <div className="container wide">
        <div className="row">
          <div className="col-lg-8 col-md-7">
            <Skeleton name="package-detail-main" loading={false}>
            <div className="content-box style3 bg_white">
              {/* Top heading: title + price (mobile-only price) */}
              <div className="top-heading stck">
                <div className="row">
                  <div className="col-7">
                    <div>
                      <h2 className="title pkg-title">
                        <strong>{paquete.titulo}</strong>
                      </h2>
                      {paquete.salidas && (
                        <p className="date" style={{ marginBottom: 0 }}>
                          <span className="icon">
                            <i className="fa-regular fa-calendar-check"></i>
                          </span>
                          {paquete.salidas}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-5">
                    {paquete.precioDesde !== null && (
                      <>
                        <div className="large-price d-md-none">
                          <div className="price-left">
                            <span className="d-block title">DESDE</span>
                            <span className="d-block title2">
                              {paquete.precioDesdeMoneda ?? "USD"}
                            </span>
                          </div>
                          <div className="price-right">
                            <span className="main-price d-block">
                              {paquete.precioDesde}
                            </span>
                          </div>
                        </div>
                        <span className="d-block pr_notes d-md-none">
                          Precio por persona en base doble
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Image slider inside the content box.
                  Cap each slide at 460px tall and cover-fit so portrait
                  photos don't blow out the layout — they get centered and
                  cropped, matching the proportions of destinos-detalle.html. */}
              <div
                className="image-slider style3 package-slider"
                style={{ overflow: "hidden" }}
              >
                <EmblaSlider
                  slidesToShow={1}
                  autoplay={false}
                  showArrows
                  showDots
                >
                  {fotos.map((f, fotoIdx) => (
                    <div
                      className="slide"
                      key={f.url}
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16 / 9",
                        maxHeight: 460,
                        overflow: "hidden",
                        background: "#f3f1f7",
                      }}
                    >
                      <img
                        src={f.url}
                        alt={f.alt}
                        decoding="async"
                        {...(fotoIdx === 0
                          ? { fetchPriority: "high" as const }
                          : { loading: "lazy" as const })}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
                      />
                    </div>
                  ))}
                </EmblaSlider>
              </div>

              {/* Tabs: Incluye / Alojamientos — same markup as reference */}
              <div className="box-tab-content style1">
                <ul className="nav-tabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link${tab === "incluye" ? " active" : ""}`}
                      onClick={() => setTab("incluye")}
                      role="tab"
                      aria-selected={tab === "incluye"}
                      aria-controls="tab-incluye"
                    >
                      Incluye
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link${tab === "alojamientos" ? " active" : ""}`}
                      onClick={() => setTab("alojamientos")}
                      role="tab"
                      aria-selected={tab === "alojamientos"}
                      aria-controls="tab-alojamientos"
                    >
                      Alojamientos
                    </button>
                  </li>
                </ul>

                <div className="tab-content">
                  {/* INCLUYE PANE */}
                  <div
                    id="tab-incluye"
                    role="tabpanel"
                    className={`tab-pane fade${tab === "incluye" ? " show active" : ""}`}
                  >
                    {hasIncluyeModule ? (
                      <ul className="content-inner">
                        {incluyeItems!.map((it) => (
                          <li key={it.id}>
                            <img
                              src={incluyeIconUrl(it.icon)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  SERVICE_ICON_FALLBACK;
                              }}
                            />
                            {it.texto}
                          </li>
                        ))}
                      </ul>
                    ) : !hasManualIncluye &&
                      paquete.serviciosDerivados.length === 0 ? (
                      <div style={{ padding: 30, color: "#999" }}>
                        Próximamente cargaremos los servicios incluidos.
                      </div>
                    ) : !hasManualIncluye ? (
                      // Fallback: servicios estructurados cargados en la creación.
                      <ul className="content-inner">
                        {paquete.serviciosDerivados.map((s, i) => (
                          <li key={`d-${i}`}>
                            <img
                              src={`/site/img/p-${s.icon}-icon.png`}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  SERVICE_ICON_FALLBACK;
                              }}
                            />
                            {s.texto}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="content-inner">
                        {paquete.serviciosIncluidos.map((s) => (
                          <li key={s.id}>
                            <img
                              src={serviceIconUrl(s.servicio.icon)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  SERVICE_ICON_FALLBACK;
                              }}
                            />
                            {s.textoCustom ?? s.servicio.nombre}
                          </li>
                        ))}
                        {includeBullets.map((b, i) => (
                          <li key={`b-${i}`}>
                            <img
                              src={`/site/img/p-${detectIconForBullet(b.text)}-icon.png`}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  SERVICE_ICON_FALLBACK;
                              }}
                            />
                            <span
                              dangerouslySetInnerHTML={{
                                __html: sanitizeRichHtml(b.html),
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* ALOJAMIENTOS PANE — grouped by Opción Hotelera. Each opción
                      is one customer-facing bundle: the option's `precioVenta`
                      (markup applied) is the only price the public sees.
                      Hotels inside are listed informationally with régimen
                      but NEVER with their internal/wholesale `precioPorNoche`. */}
                  <div
                    id="tab-alojamientos"
                    role="tabpanel"
                    className={`tab-pane fade${tab === "alojamientos" ? " show active" : ""}`}
                  >
                    {paquete.opcionesHoteleras.length === 0 ? (
                      <div style={{ padding: 30, color: "#999" }}>
                        Próximamente cargaremos las opciones de alojamiento.
                      </div>
                    ) : (
                      <div className="content-inner style2">
                        {/* Opciones ordenadas de menor a mayor precio: así se
                            entienden como alternativas distintas sin necesidad de
                            etiqueta "Opción N". Las que van "a consultar" (sin
                            precio) quedan al final. */}
                        {[...paquete.opcionesHoteleras]
                          .sort(
                            (a, b) =>
                              (a.precioVenta || Infinity) -
                              (b.precioVenta || Infinity),
                          )
                          .map((opt, optIdx) => {
                            const moneda = paquete.precioDesdeMoneda ?? "USD";
                            const hasPrice = opt.precioVenta > 0;
                            return (
                              <div
                                key={opt.id}
                                className={
                                  "text-box style1 opcion-card" +
                                  (optIdx === 0 ? " mt-0" : "")
                                }
                              >
                                {opt.hoteles.length === 0 ? (
                                  <p style={{ color: "#999", fontSize: 14 }}>
                                    Sin hoteles asignados a esta opción.
                                  </p>
                                ) : (
                                  opt.hoteles.map((h, idx) => {
                                    const stars = h.alojamiento.categoria ?? 0;
                                    const ciudadNombre =
                                      h.alojamiento.ciudad?.trim();
                                    const regimenNombre =
                                      h.alojamiento.precios[0]?.regimen?.nombre;
                                    return (
                                      <div
                                        key={h.id}
                                        className={
                                          "hotel-item" +
                                          (idx > 0 ? " hotel-item-divided" : "")
                                        }
                                      >
                                        {/* Nombre con la ciudad adelante:
                                            "Búzios - Posada Kybalion". Estrellas
                                            inline a la derecha (ver CSS). */}
                                        <h3 className="h4">
                                          {ciudadNombre
                                            ? `${ciudadNombre} - ${h.alojamiento.nombre}`
                                            : h.alojamiento.nombre}
                                          {stars > 0 && (
                                            <ul>
                                              {Array.from({
                                                length: stars,
                                              }).map((_, i) => (
                                                <li key={i}>
                                                  <i className="fa-solid fa-star"></i>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </h3>
                                        {/* Régimen en una sola línea, como el PDF:
                                            "Habitación Estándar con Desayuno". */}
                                        <span className="hotel-detail">
                                          {regimenNombre
                                            ? `Habitación Estándar con ${regimenNombre}`
                                            : "Habitación Estándar"}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}

                                {/* Meta: salidas (izq) + precio de la OPCIÓN
                                    (der). El precio es del bundle, nunca el
                                    interno por hotel. */}
                                <div className="meta">
                                  <div className="left">
                                    {paquete.salidas && (
                                      <p className="date">
                                        <span className="icon">
                                          <i className="fa-regular fa-calendar-check"></i>
                                        </span>
                                        {paquete.salidas}
                                      </p>
                                    )}
                                  </div>
                                  <div className="right text-end">
                                    {hasPrice ? (
                                      <>
                                        <span className="price">
                                          {moneda}{" "}
                                          {opt.precioVenta.toLocaleString(
                                            "es-UY",
                                          )}
                                        </span>
                                        <p>Por persona en base doble</p>
                                      </>
                                    ) : (
                                      <span className="price price-consult">
                                        Consultar precio
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional intro / itinerario / condiciones below the card */}
            {(paquete.textoIntro ||
              paquete.itinerarioPublico ||
              paquete.textoCondiciones) && (
              <div
                className="content-box style3 bg_white"
                style={{ marginTop: 30, padding: 30 }}
              >
                {paquete.textoIntro && (
                  <div style={{ marginBottom: 24 }}>
                    <h2 className="h2" style={{ marginBottom: 12 }}>
                      Sobre el destino
                    </h2>
                    <RichBlock
                      content={paquete.textoIntro}
                      style={{ color: "#444", lineHeight: 1.7 }}
                    />
                  </div>
                )}
                {paquete.itinerarioPublico && (
                  <div style={{ marginBottom: 24 }}>
                    <h2 className="h2" style={{ marginBottom: 12 }}>
                      Itinerario
                    </h2>
                    <RichBlock
                      content={paquete.itinerarioPublico}
                      style={{ color: "#444", lineHeight: 1.7 }}
                    />
                  </div>
                )}
                {paquete.textoCondiciones && (
                  <div>
                    <h2 className="h2" style={{ marginBottom: 12 }}>
                      Condiciones
                    </h2>
                    <RichBlock
                      content={paquete.textoCondiciones}
                      style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Payment methods (desktop, below the content card) */}
            <FormasDePago variant="desktop" data={formasDePago} />
            </Skeleton>
          </div>

          {/* Sidebar — intentionally NOT wrapped in <Skeleton>. The wrapper
              would shrink the sticky's travel range to 0 (wrapper height =
              sidebar height) and the sidebar would scroll away with the page
              instead of pinning to the top. */}
          <div className="col-lg-4 col-md-5">
            <QuoteSidebar
              paqueteId={paquete.id}
              paqueteTitulo={paquete.titulo}
              precioDesde={paquete.precioDesde}
              precioDesdeMoneda={paquete.precioDesdeMoneda}
            />
            <FormasDePago variant="mobile" data={formasDePago} />
          </div>
        </div>
      </div>
    </section>
  );
}
