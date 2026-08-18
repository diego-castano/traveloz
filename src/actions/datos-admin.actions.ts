"use server";

// ---------------------------------------------------------------------------
// Server actions del ADMIN para /backend/datos.
//
// Espejo global de datos-vendedor.actions.ts: allá cada vendedor ve LO SUYO,
// acá el admin ve TODO (bandeja global de pasajeros, registro de la bóveda y
// edición de los dos formularios públicos).
//
// Reglas que no se negocian:
//   • Todas las actions de este módulo arrancan con requireAdmin(). No hay
//     "vista de vendedor" acá: el vendedor tiene su propio módulo.
//   • payload / iv / tag de DatosPagoCifrado NUNCA salen de este módulo. Los
//     selects son explícitos para que un `include` distraído no los arrastre;
//     la revelación con segundo factor la sigue haciendo datos-boveda.actions.
//   • No hay relación Prisma entre EnvioPasajeros/DatosPagoCifrado y User
//     (vendedorId es un String suelto, misma convención que asignadoAUserId),
//     así que el nombre del vendedor se resuelve con una query aparte por lote.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  camposSchema,
  parseCampos,
  parseRespuestas,
  type FormField,
  type Respuesta,
} from "@/lib/cotizador-form";
import { getFormularioDato, type FormularioDatoView } from "@/lib/datos-form";
import { SITE_BASE_URL } from "@/lib/datos-email";
import type { Prisma, TipoFormularioDato } from "@prisma/client";

const log = logger.child({ module: "datos-admin.actions" });

/** Tamaño de página de las dos tablas del módulo. */
const PAGE_SIZE = 25;

/**
 * Tope de envíos que entran en un CSV. Con 12 pasajeros por envío son 24.000
 * filas: más que suficiente para el equipo y un techo sano para no armar un
 * string de decenas de MB en memoria.
 */
const EXPORT_MAX_ENVIOS = 2000;

// ---------------------------------------------------------------------------
// Helpers de vendedor
//
// El vendedorId es un String suelto. Traemos los User del lote en una sola
// query y caemos al vendedorEmail guardado en la fila si el usuario ya no
// existe — un envío viejo se sigue leyendo aunque el vendedor se haya ido.
// ---------------------------------------------------------------------------

async function nombresDeVendedores(ids: string[]): Promise<Map<string, string>> {
  // Array.from y no spread: el target de tsconfig es ES5 y no itera Sets.
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (unicos.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unicos } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

// ---------------------------------------------------------------------------
// Contadores del layout
// ---------------------------------------------------------------------------

export interface DatosAdminCounts {
  /** Envíos de pasajeros recibidos por todo el equipo. */
  envios: number;
  /** Envíos que nadie abrió todavía — el badge violeta de la solapa. */
  enviosSinVer: number;
  /** Tarjetas todavía legibles: sin purgar y sin vencer. */
  pagosVivos: number;
}

export async function getDatosAdminCounts(): Promise<DatosAdminCounts> {
  await requireAdmin();
  const [envios, enviosSinVer, pagosVivos] = await Promise.all([
    prisma.envioPasajeros.count(),
    prisma.envioPasajeros.count({ where: { vistoAt: null } }),
    prisma.datosPagoCifrado.count({
      where: { purgadoAt: null, expiraAt: { gt: new Date() } },
    }),
  ]);
  return { envios, enviosSinVer, pagosVivos };
}

// ---------------------------------------------------------------------------
// Opciones de los filtros
// ---------------------------------------------------------------------------

export interface VendedorOpcion {
  id: string;
  nombre: string;
  email: string;
  /** El slug del link personal. Sirve para reconocer al vendedor en el combo. */
  slug: string | null;
}

export interface FiltrosEnvios {
  vendedores: VendedorOpcion[];
  /** Destinos realmente cargados, no una lista fija: sale de los envíos. */
  destinos: string[];
}

export async function getFiltrosEnviosAdmin(): Promise<FiltrosEnvios> {
  await requireAdmin();

  const [users, destinos] = await Promise.all([
    prisma.user.findMany({
      // MARKETING no manda formularios de datos, así que no ensucia el combo.
      where: { role: { in: ["ADMIN", "VENDEDOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, slug: true },
    }),
    // groupBy y no `distinct`: el distinct de Prisma se resuelve en memoria
    // después de traer todas las filas; esto es un GROUP BY de verdad.
    prisma.envioPasajeros.groupBy({
      by: ["destino"],
      where: { destino: { not: null } },
      orderBy: { destino: "asc" },
    }),
  ]);

  return {
    vendedores: users.map((u) => ({
      id: u.id,
      nombre: u.name,
      email: u.email,
      slug: u.slug,
    })),
    destinos: destinos
      .map((d) => d.destino)
      .filter((d): d is string => Boolean(d && d.trim())),
  };
}

// ---------------------------------------------------------------------------
// Bandeja global de pasajeros
// ---------------------------------------------------------------------------

export interface FiltroEnviosInput {
  /** Busca por nombre / apellido / documento / email de CUALQUIER pasajero. */
  busqueda?: string;
  vendedorId?: string;
  destino?: string;
  page?: number;
}

const filtroSchema = z.object({
  busqueda: z.string().trim().max(120).optional(),
  vendedorId: z.string().trim().max(60).optional(),
  destino: z.string().trim().max(160).optional(),
  page: z.number().int().min(1).max(10000).optional(),
});

/**
 * Traduce los filtros de la toolbar a un `where` de Prisma.
 *
 * La búsqueda es el pedido explícito del cliente: "quiero encontrar al
 * pasajero, no al envío". Por eso va con `pasajeros.some` — alcanza con que UN
 * pasajero del grupo matchee para que el envío entero aparezca en la tabla.
 */
function whereEnvios(f: z.infer<typeof filtroSchema>): Prisma.EnvioPasajerosWhereInput {
  const where: Prisma.EnvioPasajerosWhereInput = {};
  if (f.vendedorId) where.vendedorId = f.vendedorId;
  if (f.destino) where.destino = f.destino;

  const q = (f.busqueda ?? "").trim();
  if (q.length > 0) {
    where.pasajeros = {
      some: {
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          { documento: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    };
  }
  return where;
}

export interface EnvioAdminResumen {
  id: string;
  createdAt: Date;
  destino: string | null;
  referencia: string | null;
  vistoAt: Date | null;
  cantidad: number;
  /** Primer pasajero del grupo: el contacto que el equipo reconoce. */
  contacto: string;
  contactoEmail: string;
  vendedorId: string;
  /** Nombre del User; si el usuario ya no existe, el email guardado en la fila. */
  vendedorNombre: string;
}

export interface EnviosAdminPage {
  rows: EnvioAdminResumen[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getEnviosAdmin(
  input?: FiltroEnviosInput,
): Promise<EnviosAdminPage> {
  await requireAdmin();

  const parsed = filtroSchema.safeParse(input ?? {});
  const filtros = parsed.success ? parsed.data : {};
  const page = Math.max(1, filtros.page ?? 1);
  const where = whereEnvios(filtros);

  const [total, filas] = await Promise.all([
    prisma.envioPasajeros.count({ where }),
    prisma.envioPasajeros.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        destino: true,
        referencia: true,
        vistoAt: true,
        vendedorId: true,
        vendedorEmail: true,
        _count: { select: { pasajeros: true } },
        // Solo el titular: la tabla no necesita los 12 pasajeros del grupo.
        pasajeros: {
          orderBy: { orden: "asc" },
          take: 1,
          select: { nombres: true, apellidos: true, email: true },
        },
      },
    }),
  ]);

  const nombres = await nombresDeVendedores(filas.map((f) => f.vendedorId));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    rows: filas.map((e) => {
      const primero = e.pasajeros[0];
      return {
        id: e.id,
        createdAt: e.createdAt,
        destino: e.destino,
        referencia: e.referencia,
        vistoAt: e.vistoAt,
        cantidad: e._count.pasajeros,
        contacto: primero ? `${primero.nombres} ${primero.apellidos}`.trim() : "—",
        contactoEmail: primero?.email ?? "",
        vendedorId: e.vendedorId,
        vendedorNombre: nombres.get(e.vendedorId) ?? e.vendedorEmail,
      };
    }),
  };
}

export interface PasajeroAdminDetalle {
  id: string;
  orden: number;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date | null;
  documento: string;
  pasaporte: string | null;
  email: string;
  telefono: string;
  direccion: string | null;
  pais: string | null;
  ciudad: string | null;
  /** Rutas del proxy protegido (/api/image/...): exigen sesión para abrir. */
  documentoArchivoUrl: string | null;
  pasaporteArchivoUrl: string | null;
  respuestas: Respuesta[];
}

export interface EnvioAdminDetalle {
  id: string;
  createdAt: Date;
  destino: string | null;
  referencia: string | null;
  vistoAt: Date | null;
  vendedorId: string;
  vendedorNombre: string;
  vendedorEmail: string;
  factura: {
    rut: string;
    razonSocial: string | null;
    email: string | null;
    direccion: string | null;
  } | null;
  pasajeros: PasajeroAdminDetalle[];
}

/**
 * Detalle completo de un envío, sin filtro de vendedor: es la bandeja global.
 * NO sella `vistoAt` — eso lo pide la UI aparte con `marcarVistoAdmin`, para
 * que un deep-link abierto por error no marque como leído lo que el vendedor
 * todavía no vio.
 */
export async function getEnvioAdmin(id: string): Promise<EnvioAdminDetalle | null> {
  await requireAdmin();
  if (!id || id.length > 60) return null;

  const envio = await prisma.envioPasajeros.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      destino: true,
      referencia: true,
      vistoAt: true,
      vendedorId: true,
      vendedorEmail: true,
      facturaRut: true,
      facturaRazonSocial: true,
      facturaEmail: true,
      facturaDireccion: true,
      pasajeros: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          orden: true,
          nombres: true,
          apellidos: true,
          fechaNacimiento: true,
          documento: true,
          pasaporte: true,
          email: true,
          telefono: true,
          direccion: true,
          pais: true,
          ciudad: true,
          documentoArchivoUrl: true,
          pasaporteArchivoUrl: true,
          respuestas: true,
        },
      },
    },
  });
  if (!envio) return null;

  const nombres = await nombresDeVendedores([envio.vendedorId]);

  return {
    id: envio.id,
    createdAt: envio.createdAt,
    destino: envio.destino,
    referencia: envio.referencia,
    vistoAt: envio.vistoAt,
    vendedorId: envio.vendedorId,
    vendedorNombre: nombres.get(envio.vendedorId) ?? envio.vendedorEmail,
    vendedorEmail: envio.vendedorEmail,
    factura: envio.facturaRut
      ? {
          rut: envio.facturaRut,
          razonSocial: envio.facturaRazonSocial,
          email: envio.facturaEmail,
          direccion: envio.facturaDireccion,
        }
      : null,
    pasajeros: envio.pasajeros.map((p) => ({
      ...p,
      respuestas: parseRespuestas(p.respuestas),
    })),
  };
}

/**
 * Sella `vistoAt` si todavía está en null. El admin que abre un envío también
 * lo marca: si alguien del equipo ya lo leyó, deja de ser "nuevo" para todos.
 * Devuelve `true` si esta llamada fue la que lo selló.
 */
export async function marcarVistoAdmin(id: string): Promise<boolean> {
  await requireAdmin();
  if (!id || id.length > 60) return false;
  try {
    // updateMany con vistoAt:null en el where hace el chequeo y la escritura en
    // un solo viaje, y no pisa el sello si otro ya lo puso.
    const r = await prisma.envioPasajeros.updateMany({
      where: { id, vistoAt: null },
      data: { vistoAt: new Date() },
    });
    return r.count > 0;
  } catch (err) {
    // El sello es secundario: nunca rompe la lectura del detalle.
    log.error(`datos.envio.sellar-visto failed (${id})`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Registro de la bóveda
// ---------------------------------------------------------------------------

export type EstadoPagoAdmin = "vivo" | "visto" | "purgado";

export interface PagoAdminResumen {
  id: string;
  titular: string;
  emisor: string | null;
  ultimos4: string;
  createdAt: Date;
  /** El reloj de vencimiento lo dibuja el cliente contra esta fecha. */
  expiraAt: Date;
  vistoAt: Date | null;
  purgadoAt: Date | null;
  estado: EstadoPagoAdmin;
  vendedorId: string;
  vendedorNombre: string;
}

export interface PagosAdminPage {
  rows: PagoAdminResumen[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getPagosAdmin(input?: {
  vendedorId?: string;
  page?: number;
}): Promise<PagosAdminPage> {
  await requireAdmin();

  const vendedorId = (input?.vendedorId ?? "").trim();
  const page = Math.max(1, Math.floor(input?.page ?? 1));
  const where: Prisma.DatosPagoCifradoWhereInput = vendedorId ? { vendedorId } : {};

  const [total, filas] = await Promise.all([
    prisma.datosPagoCifrado.count({ where }),
    prisma.datosPagoCifrado.findMany({
      where,
      // nulls first pone las vivas arriba; dentro de cada grupo, las más nuevas.
      orderBy: [{ purgadoAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Select explícito y sin payload/iv/tag. Jamás.
      select: {
        id: true,
        titular: true,
        emisor: true,
        ultimos4: true,
        createdAt: true,
        expiraAt: true,
        vistoAt: true,
        purgadoAt: true,
        vendedorId: true,
        vendedorEmail: true,
      },
    }),
  ]);

  const nombres = await nombresDeVendedores(filas.map((f) => f.vendedorId));
  const ahora = Date.now();

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    rows: filas.map((f) => ({
      id: f.id,
      titular: f.titular,
      emisor: f.emisor,
      ultimos4: f.ultimos4,
      createdAt: f.createdAt,
      expiraAt: f.expiraAt,
      vistoAt: f.vistoAt,
      purgadoAt: f.purgadoAt,
      // Vencida sin purgar (el barrido todavía no llegó) cuenta como purgada:
      // no prometemos datos que ya no se pueden abrir.
      estado:
        f.purgadoAt || f.expiraAt.getTime() <= ahora
          ? "purgado"
          : f.vistoAt
            ? "visto"
            : "vivo",
      vendedorId: f.vendedorId,
      vendedorNombre: nombres.get(f.vendedorId) ?? f.vendedorEmail,
    })),
  };
}

// ---------------------------------------------------------------------------
// Exportación a CSV
//
// Mismas reglas que el export de Leads (leads.actions.ts): separador ";"
// porque el Excel en español usa "," como decimal, BOM para que detecte UTF-8,
// y apóstrofo delante de cualquier celda que arranque con un trigger de
// fórmula. Los valores vienen de un formulario público: input NO confiable.
//
// Los helpers están duplicados a propósito: un archivo "use server" solo puede
// exportar funciones async, así que no se pueden compartir desde leads.actions
// sin convertirlos en server actions (una función utilitaria expuesta como
// endpoint público es peor que la duplicación).
// ---------------------------------------------------------------------------

const CSV_DELIMITER = ";";
const CSV_FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

function fechaHoraUY(d: Date): string {
  const partes = new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("day")}/${v("month")}/${v("year")} ${v("hour")}:${v("minute")}`;
}

/** Fecha de nacimiento: sin hora, que no aporta y confunde en la planilla. */
function soloFechaUY(d: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) s = fechaHoraUY(value);
  else if (typeof value === "boolean") s = value ? "Sí" : "No";
  else s = String(value);

  if (CSV_FORMULA_TRIGGER_RE.test(s)) s = `'${s}`;
  s = s.replace(/\r/g, "").replace(/\t/g, " ").trim();
  if (s.includes(CSV_DELIMITER) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(CSV_DELIMITER)];
  for (const row of rows) lines.push(row.map(csvEscape).join(CSV_DELIMITER));
  return "﻿" + lines.join("\r\n");
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Los adjuntos se guardan como ruta relativa; en la planilla van absolutos. */
function urlAbsoluta(ruta: string | null): string {
  if (!ruta) return "";
  return ruta.startsWith("/") ? `${SITE_BASE_URL}${ruta}` : ruta;
}

export interface ExportResult {
  filename: string;
  csv: string;
  /** Filas de pasajero exportadas. La UI lo usa para el toast. */
  filas: number;
}

/**
 * CSV de los envíos filtrados, aplanado a UNA FILA POR PASAJERO: es como el
 * equipo lo carga después en el sistema del proveedor. Las columnas de envío
 * (fecha, vendedor, destino, referencia, facturación) se repiten en cada fila
 * del grupo, que es lo que espera un filtro de Excel.
 *
 * Los campos EXTRA del formulario se vuelcan a una columna por etiqueta:
 * recorremos todo el resultado primero para saber qué columnas existen.
 */
export async function exportEnviosCsv(
  input?: FiltroEnviosInput,
): Promise<ExportResult> {
  const ctx = await requireAdmin();

  const parsed = filtroSchema.safeParse(input ?? {});
  const filtros = parsed.success ? parsed.data : {};
  const where = whereEnvios(filtros);

  const envios = await prisma.envioPasajeros.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: EXPORT_MAX_ENVIOS,
    select: {
      id: true,
      createdAt: true,
      destino: true,
      referencia: true,
      vendedorId: true,
      vendedorEmail: true,
      facturaRut: true,
      facturaRazonSocial: true,
      facturaEmail: true,
      facturaDireccion: true,
      pasajeros: {
        orderBy: { orden: "asc" },
        select: {
          orden: true,
          nombres: true,
          apellidos: true,
          fechaNacimiento: true,
          documento: true,
          pasaporte: true,
          email: true,
          telefono: true,
          direccion: true,
          ciudad: true,
          pais: true,
          documentoArchivoUrl: true,
          pasaporteArchivoUrl: true,
          respuestas: true,
        },
      },
    },
  });

  const nombres = await nombresDeVendedores(envios.map((e) => e.vendedorId));

  // Primera pasada: qué campos extra aparecen y en qué orden. Una etiqueta que
  // solo existe en un envío viejo igual se lleva su columna.
  const etiquetasExtra: string[] = [];
  const vistas = new Set<string>();
  const respuestasPorPasajero = new Map<string, Respuesta[]>();
  for (const e of envios) {
    for (const p of e.pasajeros) {
      const rs = parseRespuestas(p.respuestas);
      respuestasPorPasajero.set(`${e.id}:${p.orden}`, rs);
      for (const r of rs) {
        if (!vistas.has(r.etiqueta)) {
          vistas.add(r.etiqueta);
          etiquetasExtra.push(r.etiqueta);
        }
      }
    }
  }

  const headers = [
    "Envío",
    "Fecha",
    "Vendedor",
    "Email del vendedor",
    "Destino",
    "Referencia",
    "Pasajeros en el envío",
    "Nº de pasajero",
    "Nombres",
    "Apellidos",
    "Fecha de nacimiento",
    "Documento",
    "Pasaporte",
    "Email",
    "Teléfono",
    "Dirección",
    "Ciudad",
    "País",
    "Archivo del documento",
    "Archivo del pasaporte",
    "Factura RUT",
    "Factura razón social",
    "Factura email",
    "Factura dirección",
    ...etiquetasExtra,
  ];

  const filas: unknown[][] = [];
  for (const e of envios) {
    const vendedor = nombres.get(e.vendedorId) ?? e.vendedorEmail;
    for (const p of e.pasajeros) {
      const rs = respuestasPorPasajero.get(`${e.id}:${p.orden}`) ?? [];
      const extras = etiquetasExtra.map(
        (etq) => rs.find((r) => r.etiqueta === etq)?.valor ?? "",
      );
      filas.push([
        e.id,
        e.createdAt,
        vendedor,
        e.vendedorEmail,
        e.destino ?? "",
        e.referencia ?? "",
        e.pasajeros.length,
        p.orden + 1,
        p.nombres,
        p.apellidos,
        p.fechaNacimiento ? soloFechaUY(p.fechaNacimiento) : "",
        p.documento,
        p.pasaporte ?? "",
        p.email,
        p.telefono,
        p.direccion ?? "",
        p.ciudad ?? "",
        p.pais ?? "",
        // Los links exigen sesión igual (el proxy /api/image la valida), así
        // que van completos: quien abre la planilla ya está adentro del panel.
        urlAbsoluta(p.documentoArchivoUrl),
        urlAbsoluta(p.pasaporteArchivoUrl),
        e.facturaRut ?? "",
        e.facturaRazonSocial ?? "",
        e.facturaEmail ?? "",
        e.facturaDireccion ?? "",
        ...extras,
      ]);
    }
  }

  // Bajar datos personales de N pasajeros es una operación sensible: queda en
  // la auditoría igual que la apertura de la bóveda. Solo el conteo y los
  // filtros usados, nunca los datos.
  await logAudit({
    action: "datos.envios.export",
    userId: ctx.userId,
    targetType: "envioPasajeros",
    metadata: {
      envios: envios.length,
      pasajeros: filas.length,
      filtros: {
        busqueda: filtros.busqueda ? "sí" : "no",
        vendedorId: filtros.vendedorId ?? null,
        destino: filtros.destino ?? null,
      },
    },
  });

  return {
    filename: `pasajeros-${todayStamp()}.csv`,
    csv: buildCsv(headers, filas),
    filas: filas.length,
  };
}

// ---------------------------------------------------------------------------
// Formularios públicos
//
// El toggle `publicado` es LA llave del go-live: con él apagado, las dos
// páginas públicas devuelven "todavía no está disponible" para TODOS los
// vendedores, tengan o no link activo.
// ---------------------------------------------------------------------------

export interface FormulariosAdmin {
  pasajeros: FormularioDatoView;
  pago: FormularioDatoView;
}

export async function getFormulariosAdmin(): Promise<FormulariosAdmin> {
  await requireAdmin();
  // getFormularioDato es self-healing: si la fila no existe la crea apagada.
  const [pasajeros, pago] = await Promise.all([
    getFormularioDato("PASAJEROS"),
    getFormularioDato("PAGO"),
  ]);
  return { pasajeros, pago };
}

const updateFormularioSchema = z.object({
  titulo: z.string().trim().min(1, "El formulario necesita un título.").max(160).optional(),
  // null borra el texto; undefined lo deja como estaba.
  texto: z.string().trim().max(2000).nullable().optional(),
  campos: camposSchema.optional(),
  publicado: z.boolean().optional(),
});

export type UpdateFormularioInput = {
  titulo?: string;
  texto?: string | null;
  campos?: FormField[];
  publicado?: boolean;
};

export type UpdateFormularioResult =
  | { ok: true; formulario: FormularioDatoView }
  | { ok: false; message: string };

/**
 * Guarda la definición de uno de los dos formularios. Devuelve un resultado en
 * vez de tirar: los errores de validación (un campo de selección sin opciones,
 * por ejemplo) son mensajes que el admin necesita leer, y una excepción de
 * server action llega enmascarada al cliente en producción.
 */
export async function updateFormularioDato(
  tipo: TipoFormularioDato,
  input: UpdateFormularioInput,
): Promise<UpdateFormularioResult> {
  const ctx = await requireAdmin();

  if (tipo !== "PASAJEROS" && tipo !== "PAGO") {
    return { ok: false, message: "Formulario desconocido." };
  }

  const parsed = updateFormularioSchema.safeParse(input);
  if (!parsed.success) {
    // zod v4: los errores viven en `issues`.
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const datos = parsed.data;

  const data: Prisma.FormularioDatoUpdateInput = {};
  if (datos.titulo !== undefined) data.titulo = datos.titulo;
  if (datos.texto !== undefined) data.texto = datos.texto;
  if (datos.campos !== undefined) data.campos = datos.campos as Prisma.InputJsonValue;
  if (datos.publicado !== undefined) data.publicado = datos.publicado;

  if (Object.keys(data).length === 0) {
    // Nada que guardar: devolvemos el estado actual sin escribir ni auditar.
    return { ok: true, formulario: await getFormularioDato(tipo) };
  }

  try {
    // Lectura previa self-healing: garantiza que la fila exista antes del
    // update (el formulario se puede editar sin haber abierto la pública).
    await getFormularioDato(tipo);
    const row = await prisma.formularioDato.update({ where: { tipo }, data });

    await logAudit({
      action: "datos.formulario.update",
      userId: ctx.userId,
      targetType: "formularioDato",
      targetId: row.id,
      metadata: {
        tipo,
        // Qué cambió, no el contenido: el detalle vive en la fila.
        cambios: Object.keys(data),
        publicado: row.publicado,
        campos: Array.isArray(row.campos) ? row.campos.length : 0,
      },
    });

    return {
      ok: true,
      formulario: {
        id: row.id,
        tipo: row.tipo,
        titulo: row.titulo,
        texto: row.texto,
        // Siempre desde la fila guardada, no desde el input: si esta llamada
        // solo tocó el toggle, los campos que devolvemos son los que ya había.
        campos: parseCampos(row.campos),
        publicado: row.publicado,
      },
    };
  } catch (err) {
    log.error(`datos.formulario.update failed (${tipo})`, err);
    return { ok: false, message: "No se pudo guardar el formulario. Probá de nuevo." };
  }
}
