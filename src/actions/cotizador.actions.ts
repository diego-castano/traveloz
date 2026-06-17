"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-auth";
import { checkFormRate } from "@/lib/rate-limit";
import { validateSlug, normalizeSlug } from "@/lib/cotizador";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "cotizador.actions" });

// ---------------------------------------------------------------------------
// Lectura pública del landing (slug → landing publicado). La usa la página
// /[slug] del route group aislado.
// ---------------------------------------------------------------------------
export async function getPublishedLanding(slug: string) {
  return prisma.cotizadorLanding.findFirst({
    where: { slug, publicado: true, deletedAt: null },
    select: {
      id: true,
      slug: true,
      nombreMarca: true,
      logoUrl: true,
      textoInstitucional: true,
      colorPrimario: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Envío público del formulario → CotizadorLead (sin auth).
// Honeypot + rate-limit, igual que los forms del sitio. El envío por email a
// `emailsDestino` se cablea cuando Resend esté configurado; por ahora el lead
// queda en DB y se ve en el módulo admin.
// ---------------------------------------------------------------------------
export type FormResult = { ok: boolean; message: string };

const leadSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá tu nombre.").max(200),
  email: z.string().trim().min(1, "Ingresá tu email.").max(254).email("Email inválido."),
  telefono: z.string().trim().max(50).nullable(),
  paisCodigo: z
    .string()
    .trim()
    .regex(/^\+?\d{1,6}$/, "Código de país inválido.")
    .nullable(),
  comentarios: z.string().trim().max(5000).nullable(),
});

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function clientIp(): string | null {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

export async function submitCotizadorLead(
  landingId: string,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const SUCCESS = "¡Gracias! Recibimos tu consulta y te vamos a contactar.";
  try {
    // Honeypot: bots completan el input invisible "website".
    if (field(formData, "website")) return { ok: true, message: SUCCESS };

    const rate = checkFormRate(`cotizador:${landingId}`, clientIp());
    if (!rate.allowed) {
      return {
        ok: false,
        message: "Recibimos varios envíos desde tu conexión. Probá de nuevo más tarde.",
      };
    }

    const parsed = leadSchema.safeParse({
      nombre: field(formData, "nombre"),
      email: field(formData, "email"),
      telefono: field(formData, "telefono"),
      paisCodigo: field(formData, "paisCodigo"),
      comentarios: field(formData, "comentarios"),
    });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos." };
    }

    // Validamos que el landing exista y esté publicado antes del insert (evita
    // P2003 y que un id viejo pierda el lead).
    const landing = await prisma.cotizadorLanding.findFirst({
      where: { id: landingId, publicado: true, deletedAt: null },
      select: { id: true },
    });
    if (!landing) return { ok: false, message: "Este formulario ya no está disponible." };

    await prisma.cotizadorLead.create({
      data: { landingId, ...parsed.data },
    });
    return { ok: true, message: SUCCESS };
  } catch (err) {
    log.error("submitCotizadorLead failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Admin CRUD (ADMIN). Las marcas/landings son una entidad independiente.
// ---------------------------------------------------------------------------
const upsertSchema = z.object({
  nombreMarca: z.string().trim().min(1, "El nombre de la marca es requerido.").max(120),
  slug: z.string().trim().min(1).max(60),
  logoUrl: z.string().trim().max(500).nullable(),
  textoInstitucional: z.string().trim().max(2000).nullable(),
  colorPrimario: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (usá #RRGGBB).")
    .nullable(),
  emailsDestino: z.array(z.string().trim().email()).max(20),
  publicado: z.boolean(),
});

export type CotizadorUpsertInput = {
  nombreMarca: string;
  slug: string;
  logoUrl?: string | null;
  textoInstitucional?: string | null;
  colorPrimario?: string | null;
  emailsDestino: string[];
  publicado: boolean;
};

export async function getCotizadorLandings() {
  await requireAdmin();
  return prisma.cotizadorLanding.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      nombreMarca: true,
      publicado: true,
      createdAt: true,
      _count: { select: { leads: true } },
    },
  });
}

export async function getCotizadorLanding(id: string) {
  await requireAdmin();
  return prisma.cotizadorLanding.findUnique({
    where: { id },
    include: {
      leads: { orderBy: { createdAt: "desc" }, take: 500 },
    },
  });
}

function normalizeUpsert(input: CotizadorUpsertInput) {
  const slug = normalizeSlug(input.slug || input.nombreMarca);
  const slugErr = validateSlug(slug);
  if (slugErr) throw new Error(slugErr);
  const parsed = upsertSchema.parse({
    nombreMarca: input.nombreMarca,
    slug,
    logoUrl: input.logoUrl ?? null,
    textoInstitucional: input.textoInstitucional ?? null,
    colorPrimario: input.colorPrimario ?? null,
    emailsDestino: input.emailsDestino ?? [],
    publicado: input.publicado,
  });
  return parsed;
}

export async function createCotizadorLanding(input: CotizadorUpsertInput) {
  try {
    await requireAdmin();
    const data = normalizeUpsert(input);
    const exists = await prisma.cotizadorLanding.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (exists) throw new Error(`Ya existe un cotizador con el slug "${data.slug}".`);
    const created = await prisma.cotizadorLanding.create({ data });
    revalidatePath("/backend/cotizadores");
    revalidatePath(`/${data.slug}`);
    return created;
  } catch (err) {
    log.error("createCotizadorLanding failed", err);
    throw err instanceof Error ? err : new Error("No se pudo crear el cotizador.");
  }
}

export async function updateCotizadorLanding(id: string, input: CotizadorUpsertInput) {
  try {
    await requireAdmin();
    const data = normalizeUpsert(input);
    const clash = await prisma.cotizadorLanding.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (clash) throw new Error(`Ya existe otro cotizador con el slug "${data.slug}".`);
    const updated = await prisma.cotizadorLanding.update({ where: { id }, data });
    revalidatePath("/backend/cotizadores");
    revalidatePath(`/backend/cotizadores/${id}`);
    revalidatePath(`/${data.slug}`);
    return updated;
  } catch (err) {
    log.error("updateCotizadorLanding failed", err);
    throw err instanceof Error ? err : new Error("No se pudo actualizar el cotizador.");
  }
}

export async function deleteCotizadorLanding(id: string) {
  try {
    await requireAdmin();
    const row = await prisma.cotizadorLanding.update({
      where: { id },
      data: { deletedAt: new Date(), publicado: false },
      select: { slug: true },
    });
    revalidatePath("/backend/cotizadores");
    revalidatePath(`/${row.slug}`);
    return row;
  } catch (err) {
    log.error("deleteCotizadorLanding failed", err);
    throw new Error("No se pudo eliminar el cotizador.");
  }
}

// ---------------------------------------------------------------------------
// Coming Soon — toggle del sitio principal (SiteSetting coming_soon_activo).
// ---------------------------------------------------------------------------
const COMING_SOON_KEY = "coming_soon_activo";

export async function getComingSoonState(): Promise<boolean> {
  await requireAdmin();
  const row = await prisma.siteSetting.findUnique({ where: { key: COMING_SOON_KEY } });
  // Ausente → activo (el sitio arranca en Próximamente).
  return row ? row.value !== "false" : true;
}

export async function setComingSoon(active: boolean) {
  try {
    await requireAdmin();
    await prisma.siteSetting.upsert({
      where: { key: COMING_SOON_KEY },
      update: { value: active ? "true" : "false" },
      create: {
        key: COMING_SOON_KEY,
        value: active ? "true" : "false",
        type: "text",
        label: "Sitio principal en Próximamente",
        group: "general",
      },
    });
    // El gate vive en el layout (public) que es force-dynamic; igual
    // revalidamos la home por las dudas del cache de datos.
    revalidatePath("/", "layout");
    revalidatePath("/backend/cotizadores");
    return { active };
  } catch (err) {
    log.error("setComingSoon failed", err);
    throw new Error("No se pudo cambiar el estado del sitio.");
  }
}
