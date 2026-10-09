"use server";

// Panel de consultas y suscriptores de Collection. Todo con "consultas.ver".
// Contrato { ok, data } | { ok, error }. Sin prisma.$transaction (pgbouncer).

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fallar } from "@/lib/presupuesto/acceso";
import { resumenPauta, touchSchema } from "@/lib/atribucion";
import { requireCollection, registrarEventoCol } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { numeroConsulta } from "@/lib/collection/consultas";
import { enviarConsultaABitrix, tituloPublicado } from "@/lib/collection/consultas-servidor";

const ENTIDAD = "consulta";
const PAGINA = 30;
const ESTADOS = ["NUEVA", "EN_CURSO", "CERRADA", "DESCARTADA"] as const;
type EstadoConsulta = (typeof ESTADOS)[number];
const idSchema = z.string().min(1).max(40);

export interface ConsultaFila {
  id: string;
  numero: string;
  fecha: string;
  nombre: string;
  email: string;
  telefono: string;
  tipo: string;
  experiencia: string | null;
  especialista: string | null;
  estado: EstadoConsulta;
  crmEstado: "PENDIENTE" | "OK" | "ERROR" | null;
  avisoEnviado: boolean;
}

export async function listarConsultas(input?: {
  estado?: EstadoConsulta;
  q?: string;
  experienciaId?: string;
  /** id de la última fila de la página anterior. */
  cursor?: string;
}): Promise<Resultado<{ items: ConsultaFila[]; siguiente: string | null }>> {
  return ejecutar("listarConsultas", async () => {
    await requireCollection("consultas.ver");
    const f = z
      .object({
        estado: z.enum(ESTADOS).optional(),
        q: z.string().trim().max(100).optional(),
        experienciaId: idSchema.optional(),
        cursor: idSchema.optional(),
      })
      .safeParse(input ?? {});
    if (!f.success) fallar("Filtros inválidos.");
    const { estado, q, experienciaId, cursor } = f.data;

    const where: Prisma.ColConsultaWhereInput = {
      ...(estado ? { estado } : {}),
      ...(experienciaId ? { experienciaId } : {}),
    };
    if (q) {
      const n = Number(q.replace(/^tc-?/i, ""));
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q } },
        ...(Number.isInteger(n) && n > 0 ? [{ numero: n }] : []),
      ];
    }

    const filas = await prisma.colConsulta.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGINA + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        experiencia: { select: { titulo: true, publicado: true } },
        especialista: { select: { nombre: true } },
      },
    });
    const hayMas = filas.length > PAGINA;
    const items = filas.slice(0, PAGINA).map((c) => ({
      id: c.id,
      numero: numeroConsulta(c.numero),
      fecha: c.createdAt.toISOString(),
      nombre: c.nombre,
      email: c.email,
      telefono: [c.paisCodigo, c.telefono].filter(Boolean).join(" "),
      tipo: c.tipo,
      experiencia: c.experiencia ? tituloPublicado(c.experiencia) : null,
      especialista: c.especialista?.nombre ?? null,
      estado: c.estado,
      crmEstado: c.crmEstado,
      avisoEnviado: c.avisoEnviado,
    }));
    return { items, siguiente: hayMas ? items[items.length - 1].id : null };
  });
}

export async function obtenerConsulta(id: string) {
  return ejecutar("obtenerConsulta", async () => {
    await requireCollection("consultas.ver");
    const c = await prisma.colConsulta.findUnique({
      where: { id: idSchema.parse(id) },
      include: {
        experiencia: { select: { id: true, slug: true, titulo: true, publicado: true } },
        especialista: { select: { id: true, nombre: true, email: true, whatsapp: true } },
      },
    });
    if (!c) fallar("La consulta no existe.");
    const first = touchSchema.safeParse(c.atribFirst);
    const last = touchSchema.safeParse(c.atribLast);
    const { experiencia, atribFirst: _f, atribLast: _l, ...resto } = c;
    return {
      ...resto,
      numeroTexto: numeroConsulta(c.numero),
      experiencia: experiencia
        ? { id: experiencia.id, slug: experiencia.slug, titulo: tituloPublicado(experiencia) }
        : null,
      pauta: resumenPauta(first.success ? first.data : null, last.success ? last.data : null),
    };
  });
}

export async function actualizarConsulta(
  id: string,
  input: { estado?: EstadoConsulta; notaInterna?: string },
): Promise<Resultado<null>> {
  return ejecutar("actualizarConsulta", async () => {
    const { userId } = await requireCollection("consultas.ver");
    const p = z
      .object({ estado: z.enum(ESTADOS).optional(), notaInterna: z.string().max(4000).optional() })
      .safeParse(input);
    if (!p.success) fallar("Datos inválidos.");
    const previa = await prisma.colConsulta.findUnique({
      where: { id: idSchema.parse(id) },
      select: { estado: true },
    });
    if (!previa) fallar("La consulta no existe.");
    await prisma.colConsulta.update({ where: { id }, data: p.data });
    await registrarEventoCol({
      entidad: ENTIDAD,
      entidadId: id,
      accion: p.data.estado && p.data.estado !== previa.estado ? "estado" : "nota",
      userId,
      detalle: { de: previa.estado, estado: p.data.estado, nota: p.data.notaInterna !== undefined },
    });
    return null;
  });
}

export async function reintentarBitrixConsulta(id: string): Promise<Resultado<{ resultado: "OK" | "ERROR" | "SALTEADO" }>> {
  return ejecutar("reintentarBitrixConsulta", async () => {
    const { userId } = await requireCollection("consultas.ver");
    const c = await prisma.colConsulta.findUnique({ where: { id: idSchema.parse(id) }, select: { crmEstado: true } });
    if (!c) fallar("La consulta no existe.");
    if (c.crmEstado !== null && c.crmEstado !== "ERROR") fallar("Esta consulta ya está en Bitrix.");
    const resultado = await enviarConsultaABitrix(id);
    await registrarEventoCol({ entidad: ENTIDAD, entidadId: id, accion: "reintentar-bitrix", userId, detalle: { resultado } });
    return { resultado };
  });
}

export async function contarConsultasNuevas(): Promise<Resultado<number>> {
  return ejecutar("contarConsultasNuevas", async () => {
    await requireCollection("consultas.ver");
    return prisma.colConsulta.count({ where: { estado: "NUEVA" } });
  });
}

export async function listarSuscriptores(input?: {
  estado?: "PENDIENTE" | "CONFIRMADO" | "BAJA";
}): Promise<Resultado<{ id: string; email: string; estado: string; origen: string; createdAt: string; confirmadoEn: string | null }[]>> {
  return ejecutar("listarSuscriptores", async () => {
    await requireCollection("consultas.ver");
    const estado = z.enum(["PENDIENTE", "CONFIRMADO", "BAJA"]).optional().parse(input?.estado);
    const filas = await prisma.colSuscriptor.findMany({
      where: estado ? { estado } : {},
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    return filas.map((s) => ({
      id: s.id,
      email: s.email,
      estado: s.estado,
      origen: s.origen,
      createdAt: s.createdAt.toISOString(),
      confirmadoEn: s.confirmadoEn?.toISOString() ?? null,
    }));
  });
}

// Un valor que arranca con = + - @ se abriría como fórmula en Excel.
const celda = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

/** CSV (email, origen, alta, confirmación) de los CONFIRMADO. */
export async function exportarSuscriptoresCsv(): Promise<Resultado<string>> {
  return ejecutar("exportarSuscriptoresCsv", async () => {
    const { userId } = await requireCollection("consultas.ver");
    const filas = await prisma.colSuscriptor.findMany({
      where: { estado: "CONFIRMADO" },
      orderBy: { confirmadoEn: "asc" },
    });
    await registrarEventoCol({ entidad: "suscriptor", entidadId: "csv", accion: "exportar", userId, detalle: { total: filas.length } });
    const cab = "email,origen,alta,confirmado";
    return [
      cab,
      ...filas.map((s) =>
        [celda(s.email), celda(s.origen), s.createdAt.toISOString(), s.confirmadoEn?.toISOString() ?? ""].join(","),
      ),
    ].join("\n");
  });
}
