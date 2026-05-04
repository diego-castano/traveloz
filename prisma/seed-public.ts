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
