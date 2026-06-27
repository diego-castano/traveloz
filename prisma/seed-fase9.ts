// ---------------------------------------------------------------------------
// Fase 9 seed — populates DB with the formerly-hardcoded content from
// html_inicial: FAQ topics, Terms sections, clientes corporativos, equipo,
// plus extra SiteSettings groups (about extras, cotizar).
//
// Idempotent — uses upsert/findFirst pattern so re-running is safe.
// Run with: npx tsx prisma/seed-fase9.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { assertSeedAllowed } from "./seed-guard";
import { FAQ_TOPICS } from "./faq-topics";
assertSeedAllowed("seed-fase9");

const prisma = new PrismaClient();

// ─── About extras ────────────────────────────────────────────────────
const NOSOTROS_EXTRA = [
  {
    key: "nosotros_valores",
    label: "Texto valores",
    type: "textarea",
    value:
      "Nuestros valores son los pilares de nuestro éxito. La honestidad guía cada decisión, el respeto sostiene cada vínculo y el compañerismo nos permite avanzar juntos, incluso en los desafíos más grandes. Estos principios, no solo fortalecen nuestra cultura interna, sino que se reflejan en cada interacción con nuestros viajeros, generando relaciones duraderas basadas en la confianza y la transparencia.",
  },
  {
    key: "nosotros_proposito",
    label: "Texto propósito",
    type: "textarea",
    value:
      "En TravelOz entendemos que viajar es mucho más que moverse de un lugar a otro: es descubrir, conectar, emocionarse y aprender. Por eso, nos comprometemos a acompañar a cada persona en su camino, diseñando experiencias que respondan a sus sueños, necesidades y expectativas. Nuestro propósito es simple pero profundo: que cada viaje sea una historia que valga la pena recordar.",
  },
  {
    key: "nosotros_cierre",
    label: "Frase de cierre",
    type: "textarea",
    value:
      "En TravelOz no solo planificamos itinerarios de viaje, acompañamos sueños, creamos momentos y dejamos huellas que perduran para siempre.",
  },
  {
    key: "nosotros_imagen2",
    label: "Imagen secundaria",
    value: "/site/img/about2.webp",
  },
];

const COTIZAR_SETTINGS = [
  { key: "cotizar_titulo", label: "Título principal", value: "Cotizá tu viaje" },
  {
    key: "cotizar_lead",
    label: "Subtítulo / lead",
    type: "textarea",
    value:
      "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario y te respondemos en 24 horas.",
  },
  {
    key: "cotizar_meta_title",
    label: "Meta title (SEO)",
    value: "Cotizá tu viaje | TravelOz",
  },
  {
    key: "cotizar_meta_description",
    label: "Meta description (SEO)",
    type: "textarea",
    value:
      "Contanos a dónde querés ir y diseñamos un viaje a tu medida. Te respondemos en 24h.",
  },
];

// FAQ topics viven en ./faq-topics.ts (compartido con prisma/fix-faq-textos.ts).

// ─── Terms sections (original 14 from html_inicial/terms.html) ───────
const TERM_SECTIONS = [
  {
    slug: "identificacion",
    title: "Identificación de la agencia",
    bodyHtml: `<p>TravelOz Uruguay (en adelante, la "Agencia"), con razón social Jaderito S.A. con domicilio en Luis Alberto de Herrera 1343 oficina 301 es una agencia de viajes minorista, debidamente registrada ante el Ministerio de Turismo de la República Oriental del Uruguay.</p>`,
  },
  {
    slug: "aceptacion",
    title: "Aceptación de los términos",
    bodyHtml: `<p>La solicitud de reservas y/o contratación de cualquier servicio turístico implica la aceptación plena y sin reservas de los presentes Términos y Condiciones.</p>`,
  },
  {
    slug: "procedimiento",
    title: "Procedimiento de contratación",
    bodyHtml: `<p>Una vez seleccionado el servicio turístico, el Cliente deberá realizar una solicitud de reserva proporcionando los datos requeridos y el medio de pago indicado.</p>`,
  },
  {
    slug: "precios",
    title: "Precios, pagos y medios de pago",
    bodyHtml: `<p>Los precios están sujetos a disponibilidad, modificaciones tarifarias, variaciones en el tipo de cambio, impuestos y condiciones impuestas por los proveedores hasta la confirmación definitiva del servicio.</p>`,
  },
  {
    slug: "cancelaciones",
    title: "Cancelaciones, modificaciones y reembolsos",
    bodyHtml: `<p>Las cancelaciones, modificaciones y reembolsos se rigen por las políticas específicas de cada proveedor de servicios. Las penalidades pueden incluir desde cargos mínimos hasta la pérdida total del importe abonado.</p>`,
  },
  {
    slug: "intermediacion",
    title: "Condición de intermediación y responsabilidad",
    bodyHtml: `<p>La Agencia actúa exclusivamente como intermediaria entre el Cliente y los proveedores de los servicios turísticos. La prestación efectiva de los servicios es responsabilidad exclusiva de dichos proveedores.</p>`,
  },
  {
    slug: "aereos",
    title: "Pasajes aéreos",
    bodyHtml: `<p>La compra de pasajes aéreos implica la celebración de un contrato directo entre el Cliente y la compañía aérea, aceptando sus términos y condiciones.</p>`,
  },
  {
    slug: "alojamiento",
    title: "Alojamiento",
    bodyHtml: `<p>La contratación de alojamiento implica la aceptación de las condiciones del establecimiento hotelero, incluyendo horarios de ingreso y egreso, políticas de cancelación y servicios incluidos.</p>`,
  },
  {
    slug: "otros",
    title: "Otros servicios turísticos",
    bodyHtml: `<p>Para traslados, alquiler de vehículos, seguros de viaje, excursiones u otros servicios, el Cliente celebra contrato directo con el prestador correspondiente.</p>`,
  },
  {
    slug: "documentacion-personal",
    title: "Documentación personal y requisitos de viaje",
    bodyHtml: `<p>Es responsabilidad exclusiva del Cliente contar con la documentación necesaria, en condiciones y vigente para viajar.</p>`,
  },
  {
    slug: "seguro",
    title: "Seguro de viaje",
    bodyHtml: `<p>Se recomienda enfáticamente la contratación de un seguro de viaje adecuado al destino y duración del viaje.</p>`,
  },
  {
    slug: "propiedad",
    title: "Propiedad intelectual",
    bodyHtml: `<p>Todos los contenidos del sitio web y/o aplicación son propiedad de la Agencia o de terceros autorizantes y se encuentran protegidos por la legislación vigente.</p>`,
  },
  {
    slug: "modificaciones",
    title: "Modificaciones",
    bodyHtml: `<p>La Agencia se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento.</p>`,
  },
  {
    slug: "aceptacion-final",
    title: "Aceptación",
    bodyHtml: `<p>El Cliente declara haber leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones.</p>`,
  },
];

// ─── Clientes corporativos (logos del HTML original) ─────────────────
const CLIENTES = [
  "canal-10",
  "ucu",
  "eju",
  "mmt",
  "inac",
  "inavi",
  "barrios",
  "arkano",
  "amcs",
  "proeza",
  "cibeles",
  "ubs",
];

// ─── Equipo de contacto corporativo ──────────────────────────────────
const EQUIPO = [
  {
    nombre: "Agustina Magnani",
    rol: "Growth Manager",
    email: "agustina.magnani@traveloz.com.uy",
    photoUrl: "/site/img/Agustina.webp",
    orden: 1,
  },
  {
    nombre: "Francisco Calviño",
    rol: "CEO",
    email: "francisco.calvino@traveloz.com.uy",
    photoUrl: "/site/img/Francisco.webp",
    orden: 2,
  },
];

async function main() {
  for (const s of [...NOSOTROS_EXTRA, ...COTIZAR_SETTINGS]) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
        type: s.type ?? "text",
        group: s.key.split("_")[0],
        label: s.label,
      },
    });
  }
  console.log(
    `✔ ${NOSOTROS_EXTRA.length + COTIZAR_SETTINGS.length} extra SiteSettings upserted`,
  );

  for (const t of FAQ_TOPICS) {
    await prisma.faqTopic.upsert({
      where: { slug: t.slug },
      // Sincronizamos el contenido en re-corridas: antes era update:{}, que
      // dejaba las filas viejas (truncadas) sin tocar.
      update: { label: t.label, iconUrl: t.iconUrl, bodyHtml: t.bodyHtml, orden: t.orden },
      create: t,
    });
  }
  console.log(`✔ ${FAQ_TOPICS.length} FaqTopic upserted`);

  for (let i = 0; i < TERM_SECTIONS.length; i++) {
    const s = TERM_SECTIONS[i];
    await prisma.termSection.upsert({
      where: { slug: s.slug },
      update: {},
      create: { ...s, orden: i + 1 },
    });
  }
  console.log(`✔ ${TERM_SECTIONS.length} TermSection upserted`);

  for (let i = 0; i < CLIENTES.length; i++) {
    const slug = CLIENTES[i];
    const existing = await prisma.clienteCorporativo.findFirst({
      where: { logoUrl: `/site/img/${slug}.webp` },
    });
    if (!existing) {
      await prisma.clienteCorporativo.create({
        data: {
          nombre: slug.replace(/-/g, " ").toUpperCase(),
          logoUrl: `/site/img/${slug}.webp`,
          orden: i + 1,
        },
      });
    }
  }
  console.log(`✔ ${CLIENTES.length} ClienteCorporativo upserted`);

  for (const p of EQUIPO) {
    const existing = await prisma.personaContacto.findFirst({
      where: { email: p.email },
    });
    if (!existing) await prisma.personaContacto.create({ data: p });
  }
  console.log(`✔ ${EQUIPO.length} PersonaContacto upserted`);
}

main().finally(() => prisma.$disconnect());
