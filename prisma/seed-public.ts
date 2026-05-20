import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SETTINGS: Array<{
  key: string;
  value: string;
  type?: string;
  group?: string;
  label?: string;
}> = [
  // ─── Home ─────────────────────────────────────────────────────────────
  {
    key: "home_hero_title",
    value: "Diseñamos tu viaje, creamos tu historia.",
    group: "home",
    label: "Título principal del hero",
  },
  {
    key: "home_hero_subtitle",
    value: "Experiencias únicas hechas a tu medida.",
    group: "home",
    label: "Subtítulo del hero",
    type: "textarea",
  },
  {
    key: "home_hero_cta_text",
    value: "Ver más",
    group: "home",
    label: "Texto del botón CTA",
  },
  {
    key: "home_hero_cta_link",
    value: "/destinos",
    group: "home",
    label: "Link del botón CTA",
  },
  {
    key: "home_hero_video",
    value: "/site/video/video-banner-traveloz.mp4",
    type: "url",
    group: "home",
    label: "Video del hero (URL)",
  },
  {
    key: "home_categorias_title",
    value: "",
    group: "home",
    label: "Título sobre el slider de categorías",
  },
  {
    key: "home_testimonios_title",
    value: "Relatos de nuestros viajeros",
    group: "home",
    label: "Título de la sección de testimonios",
  },
  {
    key: "home_newsletter_label",
    value: "Unite al newsletter",
    group: "home",
    label: "Placeholder del input newsletter",
  },
  {
    key: "home_newsletter_button",
    value: "Suscribirse",
    group: "home",
    label: "Texto del botón newsletter",
  },
  // ─── General (footer / contact info) ────────────────────────────────
  {
    key: "general_whatsapp",
    value: "https://wa.me/59899000000",
    type: "url",
    group: "general",
    label: "Link de WhatsApp",
  },
  {
    key: "general_email",
    value: "info@traveloz.com.uy",
    group: "general",
    label: "Email principal",
  },
  {
    key: "general_phone",
    value: "+598 2628 1717",
    group: "general",
    label: "Teléfono",
  },
  {
    key: "general_address",
    value:
      "Av. Dr. Luis Alberto de Herrera 1343 Of. 301 - Edificio Trade Plaza",
    group: "general",
    label: "Dirección",
    type: "textarea",
  },
  {
    key: "general_hours",
    value: "09:30 AM - 18:30 PM",
    group: "general",
    label: "Horario",
  },
  { key: "header_logo", value: "/site/img/header-logo.webp", type: "image_url", group: "general", label: "Logo del header" },
  { key: "footer_logo", value: "/site/img/footer-logo.webp", type: "image_url", group: "general", label: "Logo del footer" },
  // ─── Nosotros (página /about) ────────────────────────────────────────
  { key: "nosotros_titulo", value: "Quiénes somos", group: "nosotros", label: "Título principal" },
  { key: "nosotros_subtitulo", value: "Una agencia de viajes hecha por viajeros, para viajeros.", type: "textarea", group: "nosotros", label: "Subtítulo / lead" },
  { key: "nosotros_historia", value: "TravelOz nació en 2018 con la idea de cambiar la forma en que se diseñan los viajes en Uruguay. Combinamos la experiencia de un equipo de más de 35 profesionales con tecnología propia para crear experiencias únicas para cada cliente.", type: "textarea", group: "nosotros", label: "Texto historia" },
  { key: "nosotros_mision", value: "Diseñamos experiencias de viaje que generen valor real para cada cliente, con la confianza, eficiencia y compromiso como ejes fundamentales.", type: "textarea", group: "nosotros", label: "Misión" },
  { key: "nosotros_imagen", value: "/site/img/about-us.webp", group: "nosotros", label: "Imagen principal (URL)" },
  { key: "nosotros_valores", value: "Trabajamos con compromiso, confianza y eficiencia. Nuestra prioridad es que cada cliente viva una experiencia que recuerde y elija contarnos.", type: "textarea", group: "nosotros", label: "Valores" },
  { key: "nosotros_proposito", value: "Brindamos un servicio integral con atención personalizada, asesoramiento experto y respaldo en cada paso del viaje.", type: "textarea", group: "nosotros", label: "Propósito" },
  { key: "nosotros_cierre", value: "Sumate a la #ExperienciaOZ y descubrí una nueva forma de viajar.", type: "textarea", group: "nosotros", label: "Frase de cierre" },
  { key: "nosotros_imagen2", value: "/site/img/about-us-2.webp", group: "nosotros", label: "Imagen secundaria (URL)" },
  // ─── Contacto (página /contact) ──────────────────────────────────────
  { key: "contacto_titulo", value: "Hablemos", group: "contacto", label: "Título principal" },
  { key: "contacto_subtitulo", value: "Estamos para escucharte y ayudarte a planear tu próximo viaje.", type: "textarea", group: "contacto", label: "Subtítulo / lead" },
  { key: "contacto_email", value: "info@traveloz.com.uy", group: "contacto", label: "Email de contacto" },
  { key: "contacto_telefono", value: "+598 2628 1717", group: "contacto", label: "Teléfono" },
  { key: "contacto_whatsapp", value: "https://wa.me/59899000000", group: "contacto", label: "WhatsApp (URL)" },
  { key: "contacto_direccion", value: "Av. Dr. Luis Alberto de Herrera 1343 Of. 301 - Edificio Trade Plaza", type: "textarea", group: "contacto", label: "Dirección" },
  { key: "contacto_horario", value: "Lunes a Viernes 09:30 a 18:30", group: "contacto", label: "Horario de atención" },
  { key: "contacto_mapa_embed", value: "", type: "textarea", group: "contacto", label: "URL del iframe de Google Maps (opcional)" },
  // ─── Corporativo (página /corporativo) ───────────────────────────────
  { key: "corporativo_hero_titulo", value: "Viajes que impulsan negocios.", group: "corporativo", label: "Título del hero" },
  { key: "corporativo_hero_video", value: "/site/video/Video-Traveloz-Corporativo.mp4", type: "url", group: "corporativo", label: "Video de fondo del hero" },
  { key: "corporativo_valores_titulo_1", value: "Nuestros valores", group: "corporativo", label: "Card 1 — título" },
  { key: "corporativo_valores_texto_1", value: "Trabajamos con una premisa clara: generar valor real a través de la confianza, la eficiencia y el compromiso.", type: "textarea", group: "corporativo", label: "Card 1 — texto" },
  { key: "corporativo_valores_titulo_2", value: "¿Cómo trabajamos?", group: "corporativo", label: "Card 2 — título" },
  { key: "corporativo_valores_texto_2", value: "Identificamos las necesidades de cada organización y brindamos soluciones alineadas a sus objetivos, garantizando calidad y respaldo.", type: "textarea", group: "corporativo", label: "Card 2 — texto" },
  { key: "corporativo_valores_titulo_3", value: "Atención 24/7", group: "corporativo", label: "Card 3 — título" },
  { key: "corporativo_valores_texto_3", value: "Más de 35 profesionales brindan un servicio de excelencia, resolviendo cada solicitud de forma ágil y con la máxima calidad las 24 horas.", type: "textarea", group: "corporativo", label: "Card 3 — texto" },
  { key: "corporativo_valores_icon_1", value: "/site/img/hand-icon.webp", type: "image_url", group: "corporativo", label: "Card 1 — icono" },
  { key: "corporativo_valores_icon_2", value: "/site/img/flight-icon.webp", type: "image_url", group: "corporativo", label: "Card 2 — icono" },
  { key: "corporativo_valores_icon_3", value: "/site/img/clock-icon.webp", type: "image_url", group: "corporativo", label: "Card 3 — icono" },
  { key: "corporativo_clientes_titulo", value: "Confían en nosotros", group: "corporativo", label: "Título sección clientes" },
  { key: "corporativo_form_titulo", value: "Contactanos", group: "corporativo", label: "Título del form" },
  // ─── Footer ──────────────────────────────────────────────────────────
  { key: "footer_about_titulo", value: "Sobre TravelOz", group: "footer", label: "Columna 1 — título" },
  { key: "footer_about_texto", value: "Diseñamos experiencias de viaje únicas, hechas a la medida de cada uno de nuestros clientes.", type: "textarea", group: "footer", label: "Columna 1 — texto" },
  { key: "footer_links_titulo", value: "Enlaces rápidos", group: "footer", label: "Columna 2 — título" },
  { key: "footer_links_json", value: '[{"label":"Destinos","href":"/destinos"},{"label":"Corporativo","href":"/corporativo"},{"label":"Nosotros","href":"/about"},{"label":"Contacto","href":"/contact"},{"label":"Trabaja con nosotros","href":"/work-with-us"}]', type: "textarea", group: "footer", label: "Columna 2 — links (JSON [{label, href}])" },
  { key: "footer_legal_titulo", value: "Legal", group: "footer", label: "Columna 3 — título" },
  { key: "footer_legal_json", value: '[{"label":"Términos y condiciones","href":"/terms"},{"label":"FAQ","href":"/faq"}]', type: "textarea", group: "footer", label: "Columna 3 — links (JSON [{label, href}])" },
  { key: "footer_social_facebook", value: "", group: "footer", label: "Facebook URL" },
  { key: "footer_social_instagram", value: "https://instagram.com/traveloz.uy", group: "footer", label: "Instagram URL" },
  { key: "footer_social_linkedin", value: "", group: "footer", label: "LinkedIn URL" },
  { key: "footer_social_youtube", value: "", group: "footer", label: "YouTube URL" },
  { key: "footer_copyright", value: "© 2026 TravelOz. Todos los derechos reservados.", group: "footer", label: "Texto de copyright" },
  { key: "footer_partners_json", value: '[{"label":"Uruguay Natural","src":"/site/img/logouruguaynatural.png","href":""},{"label":"AUDAVI","src":"/site/img/footer-aud.webp","href":""}]', type: "textarea", group: "footer", label: "Logos partner (JSON [{label, src, href}])" },
  { key: "footer_agencia_texto", value: "Agencia de viajes registrada Nº 1234", group: "footer", label: "Texto de agencia registrada" },
  { key: "agencia_certificado_url", value: "/site/img/agencia.jpeg", type: "image_url", group: "footer", label: "Certificado de agencia (modal)" },
  // ─── Destinos (página /destinos lista) ───────────────────────────────
  { key: "destinos_titulo", value: "Elegí tu lugar en el mundo", group: "destinos", label: "Título principal" },
  { key: "destinos_subtitulo", value: "Explorá nuestros destinos por región y dejá que te sorprendan.", type: "textarea", group: "destinos", label: "Subtítulo / lead" },
  { key: "destinos_cta_titulo", value: "¿No encontrás lo que buscás?", group: "destinos", label: "CTA — título" },
  { key: "destinos_cta_texto", value: "Diseñamos paquetes a medida. Contanos qué tenés en mente.", type: "textarea", group: "destinos", label: "CTA — texto" },
  { key: "destinos_cta_link_label", value: "Cotizar a medida", group: "destinos", label: "CTA — texto del botón" },
  { key: "destinos_cta_link_href", value: "/cotizar", group: "destinos", label: "CTA — destino del botón" },
  // ─── FAQ (página /faq) ───────────────────────────────────────────────
  { key: "faq_titulo", value: "Preguntas frecuentes", group: "faq", label: "Título principal" },
  { key: "faq_subtitulo", value: "Todo lo que necesitás saber antes, durante y después de tu viaje.", type: "textarea", group: "faq", label: "Subtítulo / lead" },
  { key: "faq_banner_desktop", value: "/site/img/banner-desktop.png", type: "image_url", group: "faq", label: "Banner desktop" },
  { key: "faq_banner_mobile", value: "/site/img/banner-mobile.png", type: "image_url", group: "faq", label: "Banner mobile" },
  // ─── Terms (página /terms) ───────────────────────────────────────────
  { key: "terms_titulo", value: "Términos y condiciones de compra", group: "terms", label: "Título principal" },
  { key: "terms_subtitulo", value: "Todo lo que necesitás saber para contratar con tranquilidad.", type: "textarea", group: "terms", label: "Subtítulo / lead" },
  { key: "terms_banner_desktop", value: "/site/img/terms-banner.webp", type: "image_url", group: "terms", label: "Banner desktop" },
  { key: "terms_banner_mobile", value: "/site/img/terms-mobile-banner.png", type: "image_url", group: "terms", label: "Banner mobile" },
  // ─── Work With Us (página /work-with-us) ─────────────────────────────
  { key: "workwithus_titulo", value: "¡Queremos conocerte!", group: "workwithus", label: "Título principal" },
  { key: "workwithus_subtitulo", value: "Estamos transformando la forma en que se viaja desde Uruguay. Si querés sumarte al equipo, dejanos tu CV.", type: "textarea", group: "workwithus", label: "Subtítulo / lead" },
  { key: "workwithus_imagen", value: "/site/img/work-with-us.webp", type: "image_url", group: "workwithus", label: "Imagen lateral" },
  { key: "workwithus_video_url", value: "", type: "url", group: "workwithus", label: "Video opcional (URL)" },
  // ─── Cotizar (página /cotizar) ───────────────────────────────────────
  { key: "cotizar_titulo", value: "Cotizá tu viaje", group: "cotizar", label: "Título principal" },
  { key: "cotizar_lead", value: "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario y te respondemos en 24 horas.", type: "textarea", group: "cotizar", label: "Subtítulo / lead" },
  { key: "cotizar_meta_title", value: "Cotizá tu viaje | TravelOz", group: "cotizar", label: "SEO — meta title" },
  { key: "cotizar_meta_description", value: "Contanos a dónde querés ir y diseñamos un viaje a tu medida. Te respondemos en 24h.", type: "textarea", group: "cotizar", label: "SEO — meta description" },
  // ─── Cotizar — bloque "¿Por qué elegirnos?" ─────────────────────────
  { key: "cotizar_porque_titulo", value: "¿Por qué elegirnos?", group: "cotizar", label: "Bloque — título" },
  { key: "cotizar_porque_card_1_titulo", value: "Agilidad", group: "cotizar", label: "Card 1 — título" },
  { key: "cotizar_porque_card_1_texto", value: "Respondemos tu consulta en menos de 24 horas, con opciones reales para que decidas rápido.", type: "textarea", group: "cotizar", label: "Card 1 — texto" },
  { key: "cotizar_porque_card_1_icon", value: "/site/img/clock-icon.webp", type: "image_url", group: "cotizar", label: "Card 1 — icono" },
  { key: "cotizar_porque_card_2_titulo", value: "Profesionalismo", group: "cotizar", label: "Card 2 — título" },
  { key: "cotizar_porque_card_2_texto", value: "Más de 35 profesionales con experiencia y respaldo armando tu próximo viaje.", type: "textarea", group: "cotizar", label: "Card 2 — texto" },
  { key: "cotizar_porque_card_2_icon", value: "/site/img/hand-icon.webp", type: "image_url", group: "cotizar", label: "Card 2 — icono" },
  { key: "cotizar_porque_card_3_titulo", value: "Precios competitivos", group: "cotizar", label: "Card 3 — título" },
  { key: "cotizar_porque_card_3_texto", value: "Negociación directa con operadores y aerolíneas para garantizarte las mejores tarifas.", type: "textarea", group: "cotizar", label: "Card 3 — texto" },
  { key: "cotizar_porque_card_3_icon", value: "/site/img/flight-icon.webp", type: "image_url", group: "cotizar", label: "Card 3 — icono" },
];

const CATEGORIAS = [
  {
    titulo: "Lunas de miel",
    imagen: "/site/img/slider-1.webp",
    link: "/destinos?tipo=lunas-de-miel",
    orden: 1,
  },
  {
    titulo: "Salidas grupales",
    imagen: "/site/img/slider-2.webp",
    link: "/destinos?tipo=salidas-grupales",
    orden: 2,
  },
  {
    titulo: "Cruceros",
    imagen: "/site/img/slider-3.webp",
    link: "/destinos?tipo=cruceros",
    orden: 3,
  },
];

const SERVICIOS = [
  { nombre: "Pasaje aéreo", icon: "flight", orden: 1 },
  { nombre: "Carry on", icon: "bag", orden: 2 },
  { nombre: "Equipaje en bodega", icon: "bag", orden: 3 },
  { nombre: "Traslados aeropuerto-hotel-aeropuerto", icon: "bus", orden: 4 },
  { nombre: "Alojamiento", icon: "bed", orden: 5 },
  { nombre: "Régimen", icon: "exc", orden: 6 },
  { nombre: "Tasas e impuestos", icon: "shield", orden: 7 },
];

async function main() {
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
        type: s.type ?? "text",
        group: s.group,
        label: s.label,
      },
    });
  }
  console.log(`✔ ${SETTINGS.length} SiteSetting upserted`);

  for (const c of CATEGORIAS) {
    await prisma.categoriaDestacada.upsert({
      where: { id: `seed-cat-${c.orden}` },
      update: {},
      create: { id: `seed-cat-${c.orden}`, ...c },
    });
  }
  console.log(`✔ ${CATEGORIAS.length} CategoriaDestacada upserted`);

  for (const s of SERVICIOS) {
    const existing = await prisma.catalogoServicio.findUnique({
      where: { nombre: s.nombre },
    });
    if (!existing) await prisma.catalogoServicio.create({ data: s });
  }
  console.log(`✔ ${SERVICIOS.length} CatalogoServicio upserted`);
}

main().finally(() => prisma.$disconnect());
