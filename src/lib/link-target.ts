// ---------------------------------------------------------------------------
// link-target — destinos internos que puede apuntar un item del CMS.
//
// Las "categorías destacadas" de la home guardan su destino como un string
// (`/destinos?tipo=cruceros`). Escribir ese string a mano es inusable para el
// admin, así que la UI ofrece un selector y estas funciones traducen entre
// (tipo de destino + slug) y la URL guardada, en los dos sentidos.
//
// Módulo puro: sin acceso a DB, sin React. Lo usan la server action que arma
// las opciones, el campo del drawer y la lista del backend.
// ---------------------------------------------------------------------------

export type LinkTargetKind = "tipo" | "etiqueta" | "region" | "todos" | "custom";

export type LinkTargetOption = {
  /** Slug tal como viaja en la URL pública. */
  slug: string;
  /** Nombre legible para el admin (ej. "Lunas de miel"). */
  nombre: string;
};

export type LinkTargetOptions = {
  /** TipoPaquete — el slug se deriva del nombre (el modelo no tiene columna). */
  tipos: LinkTargetOption[];
  etiquetas: LinkTargetOption[];
  regiones: LinkTargetOption[];
};

export const EMPTY_LINK_TARGET_OPTIONS: LinkTargetOptions = {
  tipos: [],
  etiquetas: [],
  regiones: [],
};

/** Orden y etiquetas del primer desplegable. */
export const LINK_TARGET_KINDS: { kind: LinkTargetKind; label: string }[] = [
  { kind: "tipo", label: "Categoría de paquete" },
  { kind: "etiqueta", label: "Etiqueta" },
  { kind: "region", label: "Región" },
  { kind: "todos", label: "Todos los destinos" },
  { kind: "custom", label: "URL personalizada" },
];

export function linkTargetKindLabel(kind: LinkTargetKind): string {
  return LINK_TARGET_KINDS.find((k) => k.kind === kind)?.label ?? "";
}

/** Lista de opciones que corresponde a cada tipo de destino. */
export function optionsForKind(
  kind: LinkTargetKind,
  options: LinkTargetOptions,
): LinkTargetOption[] {
  if (kind === "tipo") return options.tipos;
  if (kind === "etiqueta") return options.etiquetas;
  if (kind === "region") return options.regiones;
  return [];
}

/**
 * Arma la URL pública a guardar. Para "custom" devuelve el valor crudo: ese
 * caso lo maneja el input de texto, no el desplegable.
 */
export function buildLinkTarget(kind: LinkTargetKind, slug: string): string {
  switch (kind) {
    case "tipo":
      return slug ? `/destinos?tipo=${slug}` : "";
    case "etiqueta":
      return slug ? `/tag/${slug}` : "";
    case "region":
      return slug ? `/destinos/${slug}` : "";
    case "todos":
      return "/destinos/todos";
    default:
      return slug;
  }
}

function findSlug(list: LinkTargetOption[], slug: string): boolean {
  return list.some((o) => o.slug === slug);
}

/**
 * Deduce el tipo de destino desde el link guardado. Todo lo que no matchee un
 * patrón conocido (o apunte a un slug que ya no existe) cae en "custom" con el
 * valor intacto — nunca se reescribe un link que no entendemos.
 *
 * @example parseLinkTarget("/destinos?tipo=cruceros", opts) // { kind: "tipo", slug: "cruceros" }
 * @example parseLinkTarget("https://otra-cosa.com/x", opts) // { kind: "custom", slug: "" }
 */
export function parseLinkTarget(
  link: string,
  options: LinkTargetOptions,
): { kind: LinkTargetKind; slug: string } {
  const custom = { kind: "custom" as const, slug: "" };
  const raw = (link ?? "").trim();
  // Vacío = categoría nueva: arranca en el tipo más usado.
  if (!raw) return { kind: "tipo", slug: "" };
  // Absolutas (http://, //cdn…) y relativas sin barra: no son rutas internas.
  if (!raw.startsWith("/") || raw.startsWith("//")) return custom;

  let url: URL;
  try {
    url = new URL(raw, "https://internal.invalid");
  } catch {
    return custom;
  }

  const path = url.pathname.replace(/\/+$/, "");
  const params = Array.from(url.searchParams.keys());

  if (path === "/destinos" && params.length === 1 && params[0] === "tipo") {
    const slug = url.searchParams.get("tipo") ?? "";
    return findSlug(options.tipos, slug) ? { kind: "tipo", slug } : custom;
  }
  // Cualquier otro query string lo dejamos como está.
  if (params.length > 0 || url.hash) return custom;

  if (path === "/destinos/todos") return { kind: "todos", slug: "" };

  const seg = path.split("/").filter(Boolean);
  if (seg.length === 2 && seg[0] === "tag") {
    return findSlug(options.etiquetas, seg[1])
      ? { kind: "etiqueta", slug: seg[1] }
      : custom;
  }
  if (seg.length === 2 && seg[0] === "destinos") {
    return findSlug(options.regiones, seg[1])
      ? { kind: "region", slug: seg[1] }
      : custom;
  }

  return custom;
}

/**
 * Texto corto para listar un link en el backend: "Etiqueta · Miami y
 * combinados". Los links no reconocidos se muestran tal cual.
 */
export function describeLinkTarget(
  link: string,
  options: LinkTargetOptions,
): string {
  const { kind, slug } = parseLinkTarget(link, options);
  if (kind === "custom") return link;
  if (kind === "todos") return linkTargetKindLabel(kind);
  const nombre = optionsForKind(kind, options).find((o) => o.slug === slug)?.nombre;
  return nombre ? `${linkTargetKindLabel(kind)} · ${nombre}` : link;
}
