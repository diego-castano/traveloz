"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import { type IncluyeItem, newIncluyeId } from "@/lib/incluye";

// ---------------------------------------------------------------------------
// Preview URL resolver — used by the "Previsualizar" button in /backend/paquetes
//
// If the package lacks a slug we auto-generate one from the título (with
// uniqueness suffix on collision) and persist it, so the user doesn't need
// to interrupt their edit flow to type one. The only hard requirement for
// preview is having at least one destino with a resolvable region.
// The `?preview=1` flag is honored by the public page only for authenticated
// users — draft packages stay invisible to the public.
// ---------------------------------------------------------------------------

function slugifyTitulo(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(
  base: string,
  paqueteId: string,
): Promise<string> {
  if (!base) base = "paquete";
  const existing = await prisma.paquete.findMany({
    where: { slug: { startsWith: base }, NOT: { id: paqueteId } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((e) => e.slug).filter(Boolean) as string[]);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function getPaquetePreviewUrl(
  paqueteId: string,
): Promise<
  | { ok: true; url: string; publicado: boolean; slugGenerated?: string }
  | { ok: false; reason: string }
> {
  await requireAuth();
  const p = await prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      slug: true,
      titulo: true,
      publicado: true,
      destinos: {
        orderBy: { orden: "asc" },
        take: 1,
        select: {
          ciudad: {
            select: { pais: { select: { region: { select: { slug: true } } } } },
          },
        },
      },
    },
  });
  if (!p) return { ok: false, reason: "Paquete no encontrado." };

  // Region is informational in the URL — the public page resolves the package
  // by slug, not by region. So when destinos are still empty (early-stage
  // editing) we fall back to any region from the catalog. This way the user
  // can preview as soon as they have a name + photos, before assigning a
  // destination.
  let regionSlug = p.destinos[0]?.ciudad?.pais?.region?.slug;
  if (!regionSlug) {
    const fallbackRegion = await prisma.region.findFirst({
      orderBy: { orden: "asc" },
      select: { slug: true },
    });
    regionSlug = fallbackRegion?.slug ?? "ver";
  }

  let slug = p.slug;
  let slugGenerated: string | undefined;
  if (!slug) {
    const base = slugifyTitulo(p.titulo);
    slug = await ensureUniqueSlug(base, paqueteId);
    await prisma.paquete.update({
      where: { id: paqueteId },
      data: { slug },
    });
    revalidateTag("paquetes");
    slugGenerated = slug;
  }

  return {
    ok: true,
    url: `/destinos/${regionSlug}/${slug}?preview=1`,
    publicado: p.publicado,
    slugGenerated,
  };
}

export async function getPaqueteFrontendData(paqueteId: string) {
  return prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      id: true,
      titulo: true,
      slug: true,
      publicado: true,
      // Lifecycle fields — merged from former PublicacionTab so this is the
      // single source of truth for everything the operator manages from the
      // "Publicación" tab.
      estado: true,
      destacado: true,
      validezDesde: true,
      validezHasta: true,
      metaTitle: true,
      metaDescription: true,
      heroImage: true,
      // descripcion: breve resumen interno (alimenta el buscador del backend);
      // editable desde la pestaña Publicación junto al resto del contenido.
      descripcion: true,
      textoIntro: true,
      textoIncluye: true,
      itinerarioPublico: true,
      textoCondiciones: true,
      precioDesde: true,
      precioDesdeMoneda: true,
      fotos: {
        select: { url: true, alt: true, orden: true },
        orderBy: { orden: "asc" },
      },
      serviciosIncluidos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          textoCustom: true,
          orden: true,
          servicio: { select: { id: true, nombre: true, icon: true } },
        },
      },
      etiquetas: {
        select: {
          id: true,
          etiqueta: { select: { id: true, nombre: true, slug: true, color: true } },
        },
      },
    },
  });
}

export async function updatePaqueteFrontend(
  paqueteId: string,
  data: {
    slug?: string | null;
    publicado?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    heroImage?: string | null;
    descripcion?: string | null;
    textoIntro?: string | null;
    textoIncluye?: string | null;
    itinerarioPublico?: string | null;
    textoCondiciones?: string | null;
  },
) {
  await requireCanEdit();

  // Publishing gate: when the operator flips `publicado=true`, validate the
  // paquete is actually ready. We block the publish (but still save the rest
  // of the form) when essentials are missing — slug, at least 1 destino, at
  // least 1 hotel option, and (when noches is declared) destinos summing
  // correctly. Returning a structured error lets the UI show what's missing.
  // Track whether the publish toggle is being flipped on — if so, we also
  // auto-bump `estado` to ACTIVO server-side so the operator doesn't need to
  // change the lifecycle state in a separate UI control. Source of truth:
  // `publicado` is the public-visibility flag; `estado` is the lifecycle
  // pipeline. Going public implies the package is at least ACTIVO.
  let bumpEstadoToActivo = false;

  if (data.publicado === true) {
    const current = await prisma.paquete.findUnique({
      where: { id: paqueteId },
      select: {
        slug: true,
        titulo: true,
        noches: true,
        heroImage: true,
        estado: true,
        viajeDesde: true,
        viajeHasta: true,
        destinos: { select: { noches: true } },
        opcionesHoteleras: { select: { id: true } },
        aereos: { select: { id: true } },
      },
    });
    if (!current) throw new Error("Paquete no encontrado.");

    if (current.estado === "BORRADOR" || current.estado === "EN_REVISION") {
      bumpEstadoToActivo = true;
    }

    const incomingSlug =
      typeof data.slug === "string" ? data.slug.trim() : current.slug;
    const heroImage =
      typeof data.heroImage === "string" ? data.heroImage.trim() : current.heroImage;
    const missing: string[] = [];

    if (!incomingSlug) missing.push("slug (URL pública)");
    if (!current.titulo?.trim()) missing.push("título");
    if (current.destinos.length === 0) missing.push("al menos 1 destino en el itinerario");
    if (current.opcionesHoteleras.length === 0) missing.push("al menos 1 opción hotelera");
    if (current.aereos.length === 0) missing.push("al menos 1 aéreo asignado");
    if (!heroImage) missing.push("foto principal del slider");
    // Sin período de viaje el resolver de precios cae al fallback y el sitio
    // público puede mostrar "Desde $0". Exigirlo antes de publicar.
    if (!current.viajeDesde || !current.viajeHasta)
      missing.push("período del viaje (desde / hasta)");

    const nochesPaquete = current.noches ?? 0;
    const nochesDestinos = current.destinos.reduce(
      (sum, d) => sum + (d.noches || 0),
      0,
    );
    if (nochesPaquete > 0 && nochesDestinos !== nochesPaquete) {
      missing.push(
        `noches por destino suman ${nochesDestinos} (paquete declara ${nochesPaquete})`,
      );
    }

    if (missing.length > 0) {
      // Important: we return a structured result instead of throwing because
      // Next.js production builds redact server-action error messages, so the
      // user would otherwise see a generic "Error al guardar" with no clue
      // about what's missing. The UI checks `ok` and shows `missing` in a toast.
      return {
        ok: false as const,
        reason: "publish_blocked" as const,
        missing,
      };
    }
  }

  const updated = await prisma.paquete.update({
    where: { id: paqueteId },
    data: bumpEstadoToActivo ? { ...data, estado: "ACTIVO" } : data,
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidatePath("/destinos", "layout");
  revalidateTag("paquetes");
  return { ok: true as const, updated };
}

// ---------------------------------------------------------------------------
// Lifecycle fields — estado pipeline, destacado, validez. Separate from
// updatePaqueteFrontend because publishing has its own validation gate and
// because lifecycle changes don't trigger a re-publish-check.
// ---------------------------------------------------------------------------
export async function updatePaqueteLifecycle(
  paqueteId: string,
  data: {
    estado?: "BORRADOR" | "EN_REVISION" | "ACTIVO" | "ARCHIVADO";
    destacado?: boolean;
    validezDesde?: string | null;
    validezHasta?: string | null;
  },
) {
  await requireCanEdit();

  // Unpublishing rule: when the operator moves a published paquete OUT of
  // ACTIVO (to BORRADOR/EN_REVISION/ARCHIVADO), we also flip `publicado=false`
  // so the public site stops showing a paquete the operator considers
  // not-yet-or-no-longer ready.
  let alsoUnpublish = false;
  if (data.estado && data.estado !== "ACTIVO") {
    const current = await prisma.paquete.findUnique({
      where: { id: paqueteId },
      select: { publicado: true },
    });
    if (current?.publicado) alsoUnpublish = true;
  }

  await prisma.paquete.update({
    where: { id: paqueteId },
    data: alsoUnpublish ? { ...data, publicado: false } : data,
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidatePath("/destinos", "layout");
  revalidateTag("paquetes");
  return { unpublished: alsoUnpublish };
}

// ---------------------------------------------------------------------------
// Etiquetas — assign/remove tags for a paquete. Replaces the old
// PackageProvider hooks for the merged Publicación tab.
// ---------------------------------------------------------------------------
export async function assignPaqueteEtiqueta(
  paqueteId: string,
  etiquetaId: string,
) {
  await requireCanEdit();
  const created = await prisma.paqueteEtiqueta.create({
    data: { paqueteId, etiquetaId },
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidateTag("paquetes");
  return created;
}

export async function removePaqueteEtiqueta(paqueteEtiquetaId: string) {
  await requireCanEdit();
  const row = await prisma.paqueteEtiqueta.delete({
    where: { id: paqueteEtiquetaId },
  });
  revalidatePath(`/backend/paquetes/${row.paqueteId}`);
  revalidateTag("paquetes");
  return row;
}

export async function setPaqueteServicios(
  paqueteId: string,
  servicios: Array<{
    servicioId: string;
    textoCustom?: string | null;
    orden: number;
  }>,
) {
  await requireCanEdit();
  // Dedupe por servicioId: la tabla tiene @@unique([paqueteId, servicioId]), así
  // que si el "incluye" lista el mismo servicio de catálogo más de una vez (el
  // operador puede agregarlo dos veces), nos quedamos con la primera aparición.
  // Sin esto, createMany viola la constraint, la transacción falla y el autosave
  // muestra "Error al guardar" perdiendo el cambio. La lista visible que ve el
  // cliente se guarda aparte en `textoIncluye`, no depende de esta tabla.
  const vistos = new Set<string>();
  const serviciosUnicos = servicios.filter((s) => {
    if (vistos.has(s.servicioId)) return false;
    vistos.add(s.servicioId);
    return true;
  });
  await prisma.$transaction([
    prisma.paqueteServicio.deleteMany({ where: { paqueteId } }),
    ...(serviciosUnicos.length > 0
      ? [
          prisma.paqueteServicio.createMany({
            data: serviciosUnicos.map((s) => ({
              paqueteId,
              servicioId: s.servicioId,
              textoCustom: s.textoCustom ?? null,
              orden: s.orden,
            })),
          }),
        ]
      : []),
  ]);
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidateTag("paquetes");
}
// NOTE (F6): aquí vivía `recalcPaquetePrecioDesde`, una función sin callers que
// recalculaba `precioDesde` como min(precioPorNoche) crudo. El valor autoritativo
// de `precioDesde` lo mantiene el motor de `recompute-prices.ts` (precio de
// opción ya ajustado por factor), invocado en cada mutación de precios de
// servicio (`recomputeForAlojamiento`/etc.) y de opciones hoteleras
// (`recomputeForOpcionHotelera` / `safePropagate`). Enchufar la función vieja
// habría pisado ese valor correcto con el min por noche sin factor. Se eliminó
// para evitar esa regresión.

// ---------------------------------------------------------------------------
// Sugerencias para la lista "Incluye" — arma renglones editables a partir de
// los servicios estructurados que el operador ya cargó: un aéreo/traslado/
// circuito/seguro por línea, y UNA línea por destino con sus noches y el
// régimen del alojamiento de esa ciudad ("3 noches de alojamiento en Río con
// desayuno"). El front lo usa en el botón "Generar incluido"; el operador
// después edita, reordena o borra a gusto.
// ---------------------------------------------------------------------------
export async function getSugerenciasIncluye(
  paqueteId: string,
): Promise<IncluyeItem[]> {
  await requireAuth();

  const paquete = await prisma.paquete.findUnique({
    where: { id: paqueteId },
    include: {
      aereos: { orderBy: { orden: "asc" }, include: { aereo: true } },
      traslados: { orderBy: { orden: "asc" }, include: { traslado: true } },
      circuitos: { orderBy: { orden: "asc" }, include: { circuito: true } },
      seguros: { orderBy: { orden: "asc" }, include: { seguro: true } },
      destinos: {
        orderBy: { orden: "asc" },
        include: {
          ciudad: { select: { nombre: true } },
          opcionHoteles: {
            orderBy: { orden: "asc" },
            include: {
              alojamiento: {
                include: {
                  precios: {
                    where: { deletedAt: null },
                    include: { regimen: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!paquete) return [];

  const items: IncluyeItem[] = [];
  const push = (icon: string, texto: string | null | undefined) => {
    const t = (texto ?? "").trim();
    if (t) items.push({ id: newIncluyeId(), icon, texto: t });
  };

  for (const pa of paquete.aereos) {
    push("vuelo", pa.textoDisplay ?? pa.aereo.ruta);
    // El equipaje es una propiedad del aéreo (no un servicio de catálogo): si el
    // aéreo lo trae cargado, lo agregamos como su propio renglón ("Carry on",
    // "1 valija 23kg", etc.) con el ícono de equipaje.
    push("equipaje", pa.aereo.equipaje);
  }
  for (const pt of paquete.traslados)
    push("traslado", pt.textoDisplay ?? pt.traslado.nombre);

  for (const d of paquete.destinos) {
    if (!d.noches || d.noches <= 0) continue;
    const ciudad = d.ciudad?.nombre?.trim();
    // Régimen del destino: el primero que encontremos entre los hoteles
    // asignados a ese destino (suele ser el mismo para todos).
    let regimen: string | null = null;
    for (const oh of d.opcionHoteles) {
      const reg = oh.alojamiento?.precios.find((p) => p.regimen?.nombre)
        ?.regimen?.nombre;
      if (reg) {
        regimen = reg;
        break;
      }
    }
    const plural = d.noches === 1 ? "noche" : "noches";
    const lugar = ciudad ? ` en ${ciudad}` : "";
    const reg = regimen ? ` con ${regimen.toLowerCase()}` : "";
    push("alojamiento", `${d.noches} ${plural} de alojamiento${lugar}${reg}`);
  }

  for (const pc of paquete.circuitos)
    push("excursion", pc.textoDisplay ?? pc.circuito.nombre);
  // Seguro: texto fijo "Seguro de asistencia al viajero" (no el nombre del plan
  // tipo "Master"). Una sola línea si el paquete tiene al menos un seguro.
  if (paquete.seguros.length > 0)
    push("seguro", "Seguro de asistencia al viajero");

  return items;
}
