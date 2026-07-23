// ---------------------------------------------------------------------------
// Service / Incluye icon registry — the designer's custom Traveloz icon set,
// rendered in the brand violet (#a05ed3) so it matches the reference look
// (html_inicial/destinos-detalle.html). Solid-fill SVGs (see traveloz-icons),
// one source of truth used by the Incluye module picker, the public package
// page, and the catalog admin. Items store a short string `key`; this maps it
// to a React SVG component.
// ---------------------------------------------------------------------------

import {
  IconAvion,
  IconInfo,
  IconCama,
  IconBusFrente,
  IconValijaRuedas,
  IconMochila,
  IconValijaMano,
  IconCrucero,
  IconVelero,
  IconCafe,
  IconCartelSenales,
  IconMapaPin,
  IconTickets,
  IconEscudoCheck,
  IconPlato,
  IconEstrella,
  IconAuto,
  IconDocCheck,
  IconMonedas,
  IconTren,
  type TravelozIconProps,
} from "./traveloz-icons";

type IconComponent = (props: TravelozIconProps) => React.JSX.Element;

// Brand violet from the designer's icons (#a05ed3).
export const INCLUYE_ICON_COLOR = "#a05ed3";

export interface IconOption {
  key: string;
  label: string;
  /** Extra search terms (Spanish synonyms) for the picker. */
  keywords: string;
  Icon: IconComponent;
}

// Curated, ordered list shown in the picker. Keys are stable identifiers
// stored on items / catalog services.
export const ICON_OPTIONS: IconOption[] = [
  { key: "vuelo", label: "Vuelo / Aéreo", keywords: "avion pasaje aereo flight", Icon: IconAvion },
  { key: "equipaje", label: "Equipaje", keywords: "valija maleta bolso bodega ruedas", Icon: IconValijaRuedas },
  { key: "valijamano", label: "Valija de mano", keywords: "carry on cabina bolso equipaje mano", Icon: IconValijaMano },
  { key: "mochila", label: "Mochila / Carry on", keywords: "carry on mochila bolso personal", Icon: IconMochila },
  { key: "traslado", label: "Traslado", keywords: "transfer auto remis privado aeropuerto", Icon: IconAuto },
  { key: "bus", label: "Bus / Ómnibus", keywords: "omnibus micro colectivo", Icon: IconBusFrente },
  { key: "tren", label: "Tren", keywords: "ferrocarril", Icon: IconTren },
  { key: "crucero", label: "Crucero / Barco", keywords: "barco ferry navegacion", Icon: IconCrucero },
  { key: "velero", label: "Velero / Paseo náutico", keywords: "barco navegacion nautico paseo velero", Icon: IconVelero },
  { key: "alojamiento", label: "Alojamiento", keywords: "hotel noche habitacion cama regimen", Icon: IconCama },
  { key: "desayuno", label: "Desayuno", keywords: "cafe breakfast", Icon: IconCafe },
  { key: "comida", label: "Comida / Régimen", keywords: "regimen pension media all inclusive cena almuerzo plato", Icon: IconPlato },
  { key: "excursion", label: "Excursión / Tour", keywords: "paseo tour visita city mapa", Icon: IconMapaPin },
  { key: "circuito", label: "Circuito / Itinerario", keywords: "circuito itinerario ruta recorrido cartel senales", Icon: IconCartelSenales },
  { key: "entradas", label: "Entradas / Tickets", keywords: "ticket acceso parque entrada", Icon: IconTickets },
  { key: "seguro", label: "Seguro / Asistencia", keywords: "asistencia cobertura proteccion escudo", Icon: IconEscudoCheck },
  { key: "impuestos", label: "Impuestos / Tasas", keywords: "tasas iva fee cargos tax monedas", Icon: IconMonedas },
  { key: "documentos", label: "Documentos / Visa", keywords: "visa pasaporte tramite documento", Icon: IconDocCheck },
  { key: "estrella", label: "Destacado", keywords: "estrella rating", Icon: IconEstrella },
  { key: "check", label: "Info / Otro", keywords: "incluido info otro general nota", Icon: IconInfo },
];

const BY_KEY: Record<string, IconComponent> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.key, o.Icon]),
);

// Legacy keys still present in stored data / older catalog services. Keys that
// no longer exist in ICON_OPTIONS (guia, salud, wifi, propinas, playa, ciudad,
// naturaleza, fotos, asistencia, recibo, premium) intentionally fall through to
// DEFAULT_ICON_KEY via resolveIcon — no migration needed, they render as info.
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

export function resolveIcon(key: string | null | undefined): IconComponent {
  if (!key) return BY_KEY[DEFAULT_ICON_KEY];
  return BY_KEY[key] ?? BY_KEY[ALIASES[key] ?? ""] ?? BY_KEY[DEFAULT_ICON_KEY];
}

export function ServiceIcon({
  icon,
  size = 24,
  className,
  style,
  // Fill icons — kept in the signature so existing callers don't break, but
  // there's no stroke to width so it's ignored.
  strokeWidth: _strokeWidth,
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
  return <Icon size={size} className={className} style={style} color={color} />;
}
