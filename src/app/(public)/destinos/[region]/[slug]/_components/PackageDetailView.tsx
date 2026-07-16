"use client";

import { useState, type ReactNode } from "react";
import { EmblaSlider } from "@/components/public/EmblaSlider";
import { FramedImage } from "@/components/media/FramedImage";
import { Skeleton } from "@/components/public/SkeletonClient";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { parseIncluyeItems } from "@/lib/incluye";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { QuoteSidebar } from "./QuoteSidebar";
import { FormasDePago, type FormasDePagoData } from "./FormasDePago";

// ---------------------------------------------------------------------------
// PackageDetailView — public single-package layout that mirrors the reference
// markup in html_inicial/destinos-detalle.html so site.css styles apply 1:1
// (gradient-page-bg, content-box.style3, top-heading.stck, image-slider.style3,
// box-tab-content.style1 with .nav-tabs, .text-box.style1, payment-box,
// sidebar-form.sticky). Tabs are pure React state — no Bootstrap JS required.
// ---------------------------------------------------------------------------

type Foto = {
  url: string;
  alt: string;
  posX?: number;
  posY?: number;
  zoom?: number;
};
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

/** Un día del itinerario estructurado del circuito (modalidad CIRCUITO). */
type CircuitoDiaData = {
  numeroDia: number;
  titulo: string;
  descripcion: string | null;
};

type Props = {
  paquete: {
    id: string;
    titulo: string;
    /** CLASICO (opciones hoteleras) o CIRCUITO (todo incluido, itinerario
     *  estructurado propio del circuito asignado). */
    modalidad: "CLASICO" | "CIRCUITO";
    salidas: string | null;
    noches: number;
    precioDesde: number | null;
    precioDesdeMoneda: string | null;
    heroImage: string | null;
    fotos: Foto[];
    textoIntro: string | null;
    textoIncluye: string | null;
    itinerarioPublico: string | null;
    /** Itinerario día a día del circuito asignado (modalidad CIRCUITO). Vacío
     *  para paquetes CLASICO o circuitos sin días cargados. */
    itinerarioDias: CircuitoDiaData[];
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
  /** Slider "Descubrí más destinos". Se inyecta como nodo para renderizarlo
   * DENTRO de la sección con gradient de este componente (igual que la
   * referencia), donde el heading-alt blanco se ve sobre el degradé. */
  related?: ReactNode;
};

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

// Split a package title like "Rio de Janeiro - 07 Noches" into the destination
// ("Rio de Janeiro") and the nights tail ("07 Noches"), so the detail header
// can render the nights on a second line. Falls back to the whole title when
// there's no "- NN Noche(s)" tail.
function splitTitulo(titulo: string): { main: string; nights: string | null } {
  const m = titulo.match(/^(.*\S)\s*[-–—]\s*(\d+\s*noches?)\s*$/i);
  if (m) return { main: m[1].trim(), nights: m[2].trim() };
  return { main: titulo, nights: null };
}

// Scoped style overrides — tighten font sizes that site.css inherited from
// the reference to match a more polished feel: smaller Incluye bullets +
// icons, tighter text-box padding, and a sane container width.
const SCOPED_STYLES = `
  /* 1320px = ancho del .container.wide del template, mismo que usa el header
     (logo) y el footer. Así el contenido alinea con el logo a la izquierda y
     con el borde derecho, igual que en la referencia. */
  .pkg-detail .container.wide { max-width: 1320px; }
  .pkg-detail .content-box.style3 .top-heading { padding: 24px 28px 16px; }
  .pkg-detail .pkg-title { font-size: clamp(22px, 2.6vw, 34px); line-height: 1.12; margin-bottom: 8px; white-space: nowrap; }
  /* Nights ("07 Noches") drop to a second line, lighter than the destination. */
  .pkg-detail .pkg-title .pkg-title-nights {
    display: block;
    font-size: 0.62em;
    font-weight: 600;
    color: #7a7a7a;
    margin-top: 2px;
  }
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
    display: flex;
    align-items: center;
    font-size: 16px;
    line-height: 1.35;
    margin-bottom: 18px;
    color: #2b2b2b;
  }
  /* Icon sits inside a white circle with a violet ring ("redondel"), as in the
     reference: white background, round violet border, nothing else. */
  .pkg-detail .box-tab-content.style1 .content-inner > li > svg {
    width: 44px;
    height: 44px;
    padding: 10px;
    box-sizing: border-box;
    border-radius: 9999px;
    background: #ffffff;
    border: 2px solid #a05ed3;
    color: #a05ed3;
    stroke-width: 2;
    margin-right: 16px;
    flex-shrink: 0;
  }
  .pkg-detail .box-tab-content.style1 .content-inner > li img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    margin-right: 16px;
    flex-shrink: 0;
  }
  /* Alojamientos — cada OPCIÓN es una tarjeta BLANCA (como la referencia
     html_inicial/destinos-detalle.html), que agrupa sus hoteles. El orden por
     precio hace evidente que son opciones distintas, sin etiqueta "Opción N". */
  .pkg-detail .opcion-card.text-box.style1 {
    background: #fff;
    border: 1px solid #e3d9ef;
    border-radius: 12px;
    padding: 22px 24px;
    margin-top: 18px;
  }
  /* Nombre del hotel: violeta + serif Rufina, con las estrellas ARRIBA — igual
     que la referencia. No forzamos font-family ni flex-direction: dejamos el
     column-reverse del template (estrellas sobre el nombre) y la herencia de la
     regla h1..h6 { font-family: Rufina } de site.css. Así el nombre (serif) y el
     precio (sans rosa) quedan en fonts distintas, como en el HTML original. */
  .pkg-detail .opcion-card .h4 {
    gap: 4px;
    margin-bottom: 4px;
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
    /* La salida (izq) comparte la línea base del precio (der); el subtítulo
       "Por persona en base doble" queda debajo de ambos. */
    align-items: baseline;
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
    .pkg-detail .pkg-title { font-size: 22px; line-height: 1.18; margin-bottom: 6px; white-space: normal; }
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
      margin-bottom: 14px;
    }
    .pkg-detail .box-tab-content.style1 .content-inner > li > svg {
      width: 38px;
      height: 38px;
      padding: 9px;
      margin-right: 12px;
    }
    .pkg-detail .box-tab-content.style1 .content-inner > li img {
      width: 26px;
      height: 26px;
      margin-right: 12px;
    }

    /* Contenedor de opción y hoteles en mobile — más compacto. */
    .pkg-detail .opcion-card.text-box.style1 { padding: 16px 16px; margin-top: 14px; }
    .pkg-detail .opcion-card .h4 { font-size: 18px; gap: 4px; }
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

// ---------------------------------------------------------------------------
// Itinerario día a día (modalidad CIRCUITO). Acordeón mobile-first: el primer
// día arranca abierto, el resto colapsado. Usa el mismo primitivo de animación
// "grid-template-rows 0fr → 1fr" que evita medir alturas a mano, con estilos
// inline consistentes con esta vista pública (site.css + RichBlock).
// ---------------------------------------------------------------------------
function ItinerarioAccordion({ dias }: { dias: CircuitoDiaData[] }) {
  const [openDay, setOpenDay] = useState<number | null>(
    dias[0]?.numeroDia ?? null,
  );

  if (dias.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dias.map((dia) => {
        const open = openDay === dia.numeroDia;
        const panelId = `itinerario-dia-panel-${dia.numeroDia}`;
        const buttonId = `itinerario-dia-btn-${dia.numeroDia}`;
        return (
          <div
            key={dia.numeroDia}
            style={{
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid #e5e5e5",
            }}
          >
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenDay(open ? null : dia.numeroDia)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "#fff",
                  padding: "13px 16px",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: "20px",
                    color: "#1a1a1a",
                  }}
                >
                  Día {dia.numeroDia}
                  {dia.titulo?.trim() ? ` — ${dia.titulo}` : ""}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    color: "#1A3A5C",
                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .3s ease-in-out",
                  }}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              style={{
                display: "grid",
                gridTemplateRows: open ? "1fr" : "0fr",
                transition: "grid-template-rows .3s ease-in-out",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                {dia.descripcion?.trim() ? (
                  <RichBlock
                    content={dia.descripcion}
                    style={{
                      borderTop: "1px solid #f0f0f0",
                      padding: "12px 16px",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#444",
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PackageDetailView({ paquete, formasDePago, related }: Props) {
  const [tab, setTab] = useState<"incluye" | "alojamientos" | "itinerario">(
    "incluye",
  );

  // Itinerario estructurado (modalidad CIRCUITO, circuito con días cargados).
  // En CLASICO esto es siempre [] y el bloque de texto libre queda intacto.
  const hasItinerarioDias =
    paquete.modalidad === "CIRCUITO" && paquete.itinerarioDias.length > 0;
  // En circuito el alojamiento va incluido: no hay opciones hoteleras, así que
  // la pestaña Alojamientos no se muestra. CLASICO conserva su comportamiento.
  const showAlojamientosTab = paquete.modalidad !== "CIRCUITO";

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

  // Lista "Incluye" nueva: renglones ordenados (ícono + texto) que el operador
  // armó en el módulo drag-and-drop, serializados como JSON en textoIncluye.
  // Cuando existe, es la única fuente y reemplaza las ramas legacy de abajo.
  const incluyeItems = parseIncluyeItems(paquete.textoIncluye);
  // Un envelope JSON válido —incluso vacío— marca que el campo YA es el módulo
  // nuevo. En ese caso jamás parseamos textoIncluye como texto legacy, porque
  // parseIncludeItems renderizaría el JSON crudo como un bullet.
  const isIncluyeModule = incluyeItems !== null;
  const hasIncluyeModule = !!incluyeItems && incluyeItems.length > 0;

  // Items rendered inside the Incluye list — services first, then any extra
  // bullets parsed from textoIncluye (one per non-empty line/bloque). Cada
  // item conserva su HTML inline y su texto plano para resolver el ícono.
  const includeBullets = isIncluyeModule
    ? []
    : parseIncludeItems(paquete.textoIncluye ?? "");

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
                        <strong>{splitTitulo(paquete.titulo).main}</strong>
                        {splitTitulo(paquete.titulo).nights && (
                          <span className="pkg-title-nights">
                            {splitTitulo(paquete.titulo).nights}
                          </span>
                        )}
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
                      <FramedImage
                        src={f.url}
                        alt={f.alt}
                        posX={f.posX}
                        posY={f.posY}
                        zoom={f.zoom}
                        decoding="async"
                        {...(fotoIdx === 0
                          ? { fetchPriority: "high" as const }
                          : { loading: "lazy" as const })}
                        style={{ position: "absolute", inset: 0 }}
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
                  {hasItinerarioDias && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        className={`nav-link${tab === "itinerario" ? " active" : ""}`}
                        onClick={() => setTab("itinerario")}
                        role="tab"
                        aria-selected={tab === "itinerario"}
                        aria-controls="tab-itinerario"
                      >
                        Itinerario
                      </button>
                    </li>
                  )}
                  {showAlojamientosTab && (
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
                  )}
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
                            <ServiceIcon icon={it.icon} />
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
                            <ServiceIcon icon={s.icon} />
                            {s.texto}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="content-inner">
                        {paquete.serviciosIncluidos.map((s) => (
                          <li key={s.id}>
                            <ServiceIcon icon={s.servicio.icon} />
                            {s.textoCustom ?? s.servicio.nombre}
                          </li>
                        ))}
                        {includeBullets.map((b, i) => (
                          <li key={`b-${i}`}>
                            <ServiceIcon icon={detectIconForBullet(b.text)} />
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

                  {/* ITINERARIO PANE — modalidad CIRCUITO. Acordeón día a día
                      del circuito asignado; el texto libre itinerarioPublico
                      queda debajo como complemento. */}
                  {hasItinerarioDias && (
                    <div
                      id="tab-itinerario"
                      role="tabpanel"
                      className={`tab-pane fade${tab === "itinerario" ? " show active" : ""}`}
                    >
                      <div style={{ padding: "20px 28px 28px" }}>
                        <ItinerarioAccordion dias={paquete.itinerarioDias} />
                        {paquete.itinerarioPublico && (
                          <RichBlock
                            content={paquete.itinerarioPublico}
                            style={{
                              marginTop: 16,
                              color: "#444",
                              lineHeight: 1.7,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

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
                                        {/* Orden: nombre del hotel + estrellas
                                            inline a la derecha (ver CSS). */}
                                        <h3 className="h4">
                                          {h.alojamiento.nombre}
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
                                        {/* Debajo: la ciudad y luego el régimen,
                                            ambos con el estilo gris de detalle. */}
                                        {ciudadNombre && (
                                          <span className="hotel-detail">
                                            {ciudadNombre}
                                          </span>
                                        )}
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

            {/* Optional intro / itinerario / condiciones below the card. En
                circuito el itinerarioPublico se muestra dentro del tab
                Itinerario, así que acá sólo aplica a paquetes clásicos. */}
            {(paquete.textoIntro ||
              (!hasItinerarioDias && paquete.itinerarioPublico) ||
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
                {!hasItinerarioDias && paquete.itinerarioPublico && (
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

        {/* Payment methods (desktop) en fila propia: así el sidebar puede
            igualar la altura de la tarjeta principal (las dos cajas cierran
            al mismo nivel, como el diseño de referencia). */}
        <div className="row">
          <div className="col-lg-8 col-md-7">
            <FormasDePago variant="desktop" data={formasDePago} />
          </div>
        </div>
      </div>

      {/* "Descubrí más destinos" — hermano del .container.wide del detalle,
          dentro del mismo gradient (heading-alt blanco sobre el degradé),
          igual que la referencia. RelatedPackages trae su propio container. */}
      {related}
    </section>
  );
}
