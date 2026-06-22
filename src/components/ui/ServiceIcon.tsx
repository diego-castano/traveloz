// ---------------------------------------------------------------------------
// Service / Incluye icon registry — a curated set of travel-relevant icons
// from lucide-react, rendered in the public template's brand violet (#a05ed3)
// so they match the reference look (html_inicial/destinos-detalle.html) while
// giving us a large, searchable, scalable icon set. One source of truth used by
// the Incluye module picker, the public package page, and the catalog admin.
// Items store a short string `key`; this maps it to a Lucide component.
// ---------------------------------------------------------------------------

import {
  Plane,
  Luggage,
  CarFront,
  Bus,
  TrainFront,
  Ship,
  BedDouble,
  Coffee,
  Utensils,
  MapPinned,
  Users,
  Ticket,
  ShieldCheck,
  HeartPulse,
  Landmark,
  Receipt,
  Wifi,
  HandCoins,
  Umbrella,
  Building2,
  CircleCheck,
  Star,
  Camera,
  LifeBuoy,
  FileText,
  Mountain,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Brand violet from the reference PNG icons (#a05ed3).
export const INCLUYE_ICON_COLOR = "#a05ed3";

export interface IconOption {
  key: string;
  label: string;
  /** Extra search terms (Spanish synonyms) for the picker. */
  keywords: string;
  Icon: LucideIcon;
}

// Curated, ordered list shown in the picker. Keys are stable identifiers
// stored on items / catalog services.
export const ICON_OPTIONS: IconOption[] = [
  { key: "vuelo", label: "Vuelo / Aéreo", keywords: "avion pasaje aereo flight", Icon: Plane },
  { key: "equipaje", label: "Equipaje", keywords: "valija maleta bolso carry", Icon: Luggage },
  { key: "traslado", label: "Traslado", keywords: "transfer auto remis privado", Icon: CarFront },
  { key: "bus", label: "Bus / Ómnibus", keywords: "omnibus micro colectivo", Icon: Bus },
  { key: "tren", label: "Tren", keywords: "ferrocarril", Icon: TrainFront },
  { key: "crucero", label: "Crucero / Barco", keywords: "barco ferry navegacion", Icon: Ship },
  { key: "alojamiento", label: "Alojamiento", keywords: "hotel noche habitacion cama regimen", Icon: BedDouble },
  { key: "desayuno", label: "Desayuno", keywords: "cafe breakfast", Icon: Coffee },
  { key: "comida", label: "Comida / Régimen", keywords: "regimen pension media all inclusive cena almuerzo", Icon: Utensils },
  { key: "excursion", label: "Excursión / Tour", keywords: "paseo tour visita city", Icon: MapPinned },
  { key: "guia", label: "Guía", keywords: "guia acompanante grupo", Icon: Users },
  { key: "entradas", label: "Entradas / Tickets", keywords: "ticket acceso parque", Icon: Ticket },
  { key: "seguro", label: "Seguro / Asistencia", keywords: "asistencia cobertura proteccion escudo", Icon: ShieldCheck },
  { key: "salud", label: "Seguro médico", keywords: "medico salud cruz emergencia hospital", Icon: HeartPulse },
  { key: "impuestos", label: "Impuestos / Tasas", keywords: "tasas iva fee cargos tax", Icon: Landmark },
  { key: "recibo", label: "Recibo / Comprobante", keywords: "factura comprobante", Icon: Receipt },
  { key: "wifi", label: "WiFi", keywords: "internet conexion", Icon: Wifi },
  { key: "propinas", label: "Propinas", keywords: "tips gratificacion", Icon: HandCoins },
  { key: "playa", label: "Playa", keywords: "sombrilla mar costa", Icon: Umbrella },
  { key: "ciudad", label: "Ciudad", keywords: "city edificio urbano", Icon: Building2 },
  { key: "naturaleza", label: "Naturaleza", keywords: "montana paisaje aventura", Icon: Mountain },
  { key: "fotos", label: "Fotos", keywords: "camara foto recuerdo", Icon: Camera },
  { key: "asistencia", label: "Asistencia 24h", keywords: "soporte ayuda salvavidas", Icon: LifeBuoy },
  { key: "documentos", label: "Documentos / Visa", keywords: "visa pasaporte tramite", Icon: FileText },
  { key: "premium", label: "Premium / Extra", keywords: "lujo destacado especial", Icon: Sparkles },
  { key: "estrella", label: "Destacado", keywords: "estrella rating", Icon: Star },
  { key: "check", label: "Incluido (genérico)", keywords: "incluido check tilde general", Icon: CircleCheck },
];

const BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.key, o.Icon]),
);

// Legacy keys still present in stored data / older catalog services.
const ALIASES: Record<string, string> = {
  flight: "vuelo",
  bag: "equipaje",
  bus: "bus",
  bed: "alojamiento",
  exc: "check",
  shield: "seguro",
  food: "comida",
  tax: "impuestos",
};

export const DEFAULT_ICON_KEY = "check";

export function resolveIcon(key: string | null | undefined): LucideIcon {
  if (!key) return BY_KEY[DEFAULT_ICON_KEY];
  return BY_KEY[key] ?? BY_KEY[ALIASES[key] ?? ""] ?? BY_KEY[DEFAULT_ICON_KEY];
}

export function ServiceIcon({
  icon,
  size = 24,
  className,
  style,
  strokeWidth = 2.1,
  color = INCLUYE_ICON_COLOR,
}: {
  icon: string | null | undefined;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  color?: string;
}) {
  const Icon = resolveIcon(icon);
  return (
    <Icon
      size={size}
      className={className}
      style={style}
      strokeWidth={strokeWidth}
      color={color}
    />
  );
}
