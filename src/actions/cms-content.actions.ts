"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCanEdit } from "@/lib/require-auth";

// ---------------------------------------------------------------------------
// CMS content CRUD — FaqTopic, TermSection, ClienteCorporativo, PersonaContacto
// Each lives in its own group of helpers; the Web admin uses one editor per
// model. All writes revalidate the public page they affect.
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────── FAQ ──
export async function listFaqTopics() {
  return prisma.faqTopic.findMany({ orderBy: { orden: "asc" } });
}

export async function createFaqTopic(input: {
  label: string;
  bodyHtml: string;
  iconUrl?: string | null;
  orden?: number;
}) {
  await requireCanEdit();
  const slug = slugify(input.label) || `topic-${Date.now()}`;
  const created = await prisma.faqTopic.create({
    data: { ...input, slug },
  });
  revalidatePath("/backend/web/faq");
  revalidatePath("/faq");
  revalidateTag("faq");
  return created;
}

export async function updateFaqTopic(
  id: string,
  input: Partial<{
    label: string;
    bodyHtml: string;
    iconUrl: string | null;
    orden: number;
    activo: boolean;
    slug: string;
  }>,
) {
  await requireCanEdit();
  const updated = await prisma.faqTopic.update({ where: { id }, data: input });
  revalidatePath("/backend/web/faq");
  revalidatePath("/faq");
  revalidateTag("faq");
  return updated;
}

export async function deleteFaqTopic(id: string) {
  await requireCanEdit();
  await prisma.faqTopic.delete({ where: { id } });
  revalidatePath("/backend/web/faq");
  revalidatePath("/faq");
  revalidateTag("faq");
}

// ──────────────────────────────────────────── Terms ──
export async function listTermSections() {
  return prisma.termSection.findMany({ orderBy: { orden: "asc" } });
}

export async function createTermSection(input: {
  title: string;
  bodyHtml: string;
  orden?: number;
}) {
  await requireCanEdit();
  const slug = slugify(input.title) || `section-${Date.now()}`;
  const created = await prisma.termSection.create({
    data: { ...input, slug },
  });
  revalidatePath("/backend/web/terms");
  revalidatePath("/terms");
  revalidateTag("terms");
  return created;
}

export async function updateTermSection(
  id: string,
  input: Partial<{
    title: string;
    bodyHtml: string;
    orden: number;
    activo: boolean;
    slug: string;
  }>,
) {
  await requireCanEdit();
  const updated = await prisma.termSection.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/web/terms");
  revalidatePath("/terms");
  revalidateTag("terms");
  return updated;
}

export async function deleteTermSection(id: string) {
  await requireCanEdit();
  await prisma.termSection.delete({ where: { id } });
  revalidatePath("/backend/web/terms");
  revalidatePath("/terms");
  revalidateTag("terms");
}

// ──────────────────────────────────── Clientes corporativos ──
export async function listClientesCorporativos() {
  return prisma.clienteCorporativo.findMany({ orderBy: { orden: "asc" } });
}

export async function createClienteCorporativo(input: {
  nombre: string;
  logoUrl: string;
  link?: string | null;
  orden?: number;
}) {
  await requireCanEdit();
  const created = await prisma.clienteCorporativo.create({ data: input });
  revalidatePath("/backend/web/clientes");
  revalidatePath("/corporativo");
  revalidateTag("clientes-corporativos");
  return created;
}

export async function updateClienteCorporativo(
  id: string,
  input: Partial<{
    nombre: string;
    logoUrl: string;
    link: string | null;
    orden: number;
    activo: boolean;
  }>,
) {
  await requireCanEdit();
  const updated = await prisma.clienteCorporativo.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/web/clientes");
  revalidatePath("/corporativo");
  revalidateTag("clientes-corporativos");
  return updated;
}

export async function deleteClienteCorporativo(id: string) {
  await requireCanEdit();
  await prisma.clienteCorporativo.delete({ where: { id } });
  revalidatePath("/backend/web/clientes");
  revalidatePath("/corporativo");
  revalidateTag("clientes-corporativos");
}

// ──────────────────────────────────── Equipo / Personas contacto ──
export async function listPersonasContacto() {
  return prisma.personaContacto.findMany({ orderBy: { orden: "asc" } });
}

export async function createPersonaContacto(input: {
  nombre: string;
  rol: string;
  email: string;
  photoUrl?: string | null;
  orden?: number;
}) {
  await requireCanEdit();
  const created = await prisma.personaContacto.create({ data: input });
  revalidatePath("/backend/web/equipo");
  revalidatePath("/corporativo");
  revalidateTag("equipo");
  return created;
}

export async function updatePersonaContacto(
  id: string,
  input: Partial<{
    nombre: string;
    rol: string;
    email: string;
    photoUrl: string | null;
    orden: number;
    activo: boolean;
  }>,
) {
  await requireCanEdit();
  const updated = await prisma.personaContacto.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/web/equipo");
  revalidatePath("/corporativo");
  revalidateTag("equipo");
  return updated;
}

export async function deletePersonaContacto(id: string) {
  await requireCanEdit();
  await prisma.personaContacto.delete({ where: { id } });
  revalidatePath("/backend/web/equipo");
  revalidatePath("/corporativo");
  revalidateTag("equipo");
}
