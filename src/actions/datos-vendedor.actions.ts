"use server";

// ---------------------------------------------------------------------------
// Server actions del VENDEDOR para "Pasajeros y Pagos".
//
// Espejo privado de datos-publico.actions.ts: allá entra lo que carga el
// pasajero sin sesión, acá lo lee el dueño del link con sesión.
//
// Reglas que no se negocian:
//   • Scope duro por vendedor. Un VENDEDOR solo ve lo suyo (where vendedorId
//     = su id). Un ADMIN puede pasar un vendedorId explícito, pero el default
//     es LO SUYO — el preview ?vista=vendedor no espía la bandeja de otro.
//   • MARKETING no entra a ninguna de estas actions: ve paquetes, no datos
//     personales de pasajeros ni tarjetas.
//   • payload / iv / tag de DatosPagoCifrado NUNCA salen de este módulo. Los
//     selects son explícitos justamente para que un `include` distraído no
//     los arrastre. La revelación con segundo factor la construye otro módulo.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { parseRespuestas, type Respuesta } from "@/lib/cotizador-form";
import { DATOS_FROM, SITE_BASE_URL, solicitudDatosEmail } from "@/lib/datos-email";
import type { TipoFormularioDato } from "@prisma/client";

const log = logger.child({ module: "datos-vendedor.actions" });

/** Tamaño de página del listado de envíos. */
const ENVIOS_PAGE_SIZE = 20;

/** Vida de la solicitud según el tipo (el link del email caduca; el permanente no). */
const HORAS_SOLICITUD: Record<TipoFormularioDato, number> = {
  PASAJEROS: 7 * 24,
  PAGO: 48,
};

/** Tope de invitaciones por vendedor cada 24 h. Se cuenta en DB, sin lib nueva. */
const MAX_SOLICITUDES_DIA = 30;

const RUTA_PUBLICA: Record<TipoFormularioDato, string> = {
  PASAJEROS: "/datos-de-pasajeros",
  PAGO: "/datos-de-pago",
};

const SIN_PERMISO =
  "Tu rol no tiene acceso a los datos de pasajeros y pagos.";

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

/**
 * Resuelve de QUIÉN son los datos que se van a leer y corta el paso a
 * MARKETING. Devuelve también el userId de la sesión porque `crearSolicitud`
 * necesita los datos del vendedor real que manda el email.
 */
async function scopeVendedor(vendedorId?: string): Promise<{
  sessionUserId: string;
  targetId: string;
  isAdmin: boolean;
}> {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN" && ctx.role !== "VENDEDOR") {
    throw new Error(SIN_PERMISO);
  }
  const isAdmin = ctx.role === "ADMIN";
  return {
    sessionUserId: ctx.userId,
    // Solo el admin puede mirar la bandeja de otro; el vendedor siempre la suya.
    targetId: isAdmin && vendedorId ? vendedorId : ctx.userId,
    isAdmin,
  };
}

// ---------------------------------------------------------------------------
// Contadores (mismo patrón que getLeadCounts)
// ---------------------------------------------------------------------------

export interface DatosCounts {
  /** Envíos de pasajeros recibidos (histórico completo). */
  envios: number;
  /** Envíos todavía sin abrir — el badge violeta de la solapa. */
  enviosSinVer: number;
  /** Tarjetas todavía legibles: sin purgar y sin vencer. */
  pagosVivos: number;
}

export async function getMisDatosCounts(vendedorId?: string): Promise<DatosCounts> {
  const { targetId } = await scopeVendedor(vendedorId);
  const [envios, enviosSinVer, pagosVivos] = await Promise.all([
    prisma.envioPasajeros.count({ where: { vendedorId: targetId } }),
    prisma.envioPasajeros.count({ where: { vendedorId: targetId, vistoAt: null } }),
    prisma.datosPagoCifrado.count({
      where: { vendedorId: targetId, purgadoAt: null, expiraAt: { gt: new Date() } },
    }),
  ]);
  return { envios, enviosSinVer, pagosVivos };
}

// ---------------------------------------------------------------------------
// Envíos de pasajeros
// ---------------------------------------------------------------------------

export interface EnvioResumen {
  id: string;
  createdAt: Date;
  destino: string | null;
  referencia: string | null;
  vistoAt: Date | null;
  cantidad: number;
  /** Primer pasajero del grupo: es el contacto que el vendedor reconoce. */
  contacto: string;
  contactoEmail: string;
}

export interface EnviosPage {
  rows: EnvioResumen[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getMisEnvios(opts?: {
  page?: number;
  vendedorId?: string;
}): Promise<EnviosPage> {
  const { targetId } = await scopeVendedor(opts?.vendedorId);
  const page = Math.max(1, Math.floor(opts?.page ?? 1));
  const where = { vendedorId: targetId };

  const [total, rows] = await Promise.all([
    prisma.envioPasajeros.count({ where }),
    prisma.envioPasajeros.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ENVIOS_PAGE_SIZE,
      take: ENVIOS_PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        destino: true,
        referencia: true,
        vistoAt: true,
        _count: { select: { pasajeros: true } },
        // Solo el titular del grupo: la tabla no necesita los 12 pasajeros.
        pasajeros: {
          orderBy: { orden: "asc" },
          take: 1,
          select: { nombres: true, apellidos: true, email: true },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize: ENVIOS_PAGE_SIZE,
    rows: rows.map((e) => {
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
      };
    }),
  };
}

export interface PasajeroDetalle {
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
  /** Rutas del proxy protegido (/api/image/...): abren con la sesión del panel. */
  documentoArchivoUrl: string | null;
  pasaporteArchivoUrl: string | null;
  respuestas: Respuesta[];
}

export interface EnvioDetalle {
  id: string;
  createdAt: Date;
  destino: string | null;
  referencia: string | null;
  vistoAt: Date | null;
  factura: {
    rut: string;
    razonSocial: string | null;
    email: string | null;
    direccion: string | null;
  } | null;
  pasajeros: PasajeroDetalle[];
}

/**
 * Detalle de un envío propio. Abrirlo sella `vistoAt` (marca automática, no
 * manual como en Leads): si el vendedor lo leyó, ya no es "nuevo".
 */
export async function getMiEnvioDetalle(
  id: string,
  vendedorId?: string,
): Promise<EnvioDetalle | null> {
  const { targetId } = await scopeVendedor(vendedorId);
  const envio = await prisma.envioPasajeros.findFirst({
    // El vendedorId va en el where, no en un chequeo posterior: así una fila
    // ajena ni siquiera se lee.
    where: { id, vendedorId: targetId },
    select: {
      id: true,
      createdAt: true,
      destino: true,
      referencia: true,
      vistoAt: true,
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

  // El sello es secundario: si falla, el detalle igual se devuelve.
  if (!envio.vistoAt) {
    try {
      await prisma.envioPasajeros.update({
        where: { id: envio.id },
        data: { vistoAt: new Date() },
      });
    } catch (err) {
      log.error(`datos.envio.sellar-visto failed (${envio.id})`, err);
    }
  }

  return {
    id: envio.id,
    createdAt: envio.createdAt,
    destino: envio.destino,
    referencia: envio.referencia,
    vistoAt: envio.vistoAt,
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

// ---------------------------------------------------------------------------
// Bóveda de pagos
// ---------------------------------------------------------------------------

export type EstadoPago = "vivo" | "visto" | "purgado";

export interface PagoResumen {
  id: string;
  titular: string;
  emisor: string | null;
  ultimos4: string;
  createdAt: Date;
  /** El reloj de la tarjeta lo dibuja el cliente contra esta fecha. */
  expiraAt: Date;
  vistoAt: Date | null;
  purgadoAt: Date | null;
  estado: EstadoPago;
}

/**
 * Tarjetas del vendedor: primero las que siguen en la bóveda, después las ya
 * purgadas (sobreviven como registro: titular, emisor, últimos 4 y fechas).
 * El select es explícito y JAMÁS incluye payload/iv/tag.
 */
export async function getMisPagos(vendedorId?: string): Promise<PagoResumen[]> {
  const { targetId } = await scopeVendedor(vendedorId);
  const filas = await prisma.datosPagoCifrado.findMany({
    where: { vendedorId: targetId },
    // Ordenar por purgadoAt asc con nulls primero pone las vivas arriba y,
    // dentro de cada grupo, las más nuevas primero.
    orderBy: [{ purgadoAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      titular: true,
      emisor: true,
      ultimos4: true,
      createdAt: true,
      expiraAt: true,
      vistoAt: true,
      purgadoAt: true,
    },
  });

  const ahora = Date.now();
  return filas.map((f) => ({
    ...f,
    // Una fila sin purgar pero vencida cuenta como purgada para la UI: el
    // barrido corre cada tanto y no queremos prometer datos que ya no sirven.
    estado: f.purgadoAt || f.expiraAt.getTime() <= ahora
      ? "purgado"
      : f.vistoAt
        ? "visto"
        : "vivo",
  }));
}

// ---------------------------------------------------------------------------
// Link personal + QR
// ---------------------------------------------------------------------------

export interface MiLink {
  tipo: TipoFormularioDato;
  url: string;
  /** PNG en data-URL. Se genera en el server para no meter qrcode en el bundle. */
  qrDataUrl: string;
  linkActivo: boolean;
}

export async function getMiLink(
  tipo: TipoFormularioDato,
  vendedorId?: string,
): Promise<MiLink> {
  const { targetId } = await scopeVendedor(vendedorId);
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { slug: true, linkActivo: true },
  });
  if (!user?.slug) {
    throw new Error(
      "Todavía no tenés un link personal. Pedile a un administrador que te genere el link.",
    );
  }

  const url = `${SITE_BASE_URL}${RUTA_PUBLICA[tipo]}/${user.slug}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
  return { tipo, url, qrDataUrl, linkActivo: user.linkActivo };
}

// ---------------------------------------------------------------------------
// Solicitudes por email
// ---------------------------------------------------------------------------

const solicitudSchema = z.object({
  tipo: z.enum(["PASAJEROS", "PAGO"]),
  email: z.email("Ingresá un email válido."),
  nombre: z.string().trim().max(120).optional(),
  destino: z.string().trim().max(120).optional(),
  referencia: z.string().trim().max(120).optional(),
});

export interface SolicitudResult {
  ok: boolean;
  message: string;
}

/** Vacío → null, para no guardar strings de espacios en la fila. */
function limpio(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length === 0 ? null : t;
}

export async function crearSolicitud(input: {
  tipo: TipoFormularioDato;
  email: string;
  nombre?: string;
  destino?: string;
  referencia?: string;
}): Promise<SolicitudResult> {
  const { sessionUserId } = await scopeVendedor();

  const parsed = solicitudSchema.safeParse(input);
  if (!parsed.success) {
    // zod v4: los errores viven en `error.issues`.
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const datos = parsed.data;
  const tipo = datos.tipo as TipoFormularioDato;

  // La solicitud siempre sale a nombre del vendedor de la SESIÓN, aunque un
  // admin esté mirando otra bandeja: el pasajero tiene que poder responderle
  // a quien le escribió.
  const vendedor = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { name: true, email: true, slug: true, linkActivo: true, fotoUrl: true, whatsapp: true },
  });
  if (!vendedor?.slug) {
    return {
      ok: false,
      message: "Todavía no tenés un link personal. Pedile a un administrador que te genere el link.",
    };
  }
  if (!vendedor.linkActivo) {
    return {
      ok: false,
      message: "Tu link está apagado. Pedile a un administrador que lo active.",
    };
  }

  // Rate simple contra la DB: 30 solicitudes por vendedor cada 24 h.
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const enviadasHoy = await prisma.solicitudDato.count({
    where: { vendedorId: sessionUserId, enviadoAt: { gte: desde } },
  });
  if (enviadasHoy >= MAX_SOLICITUDES_DIA) {
    return {
      ok: false,
      message: `Llegaste al tope de ${MAX_SOLICITUDES_DIA} solicitudes por día. Probá de nuevo mañana.`,
    };
  }

  const token = randomBytes(32).toString("hex");
  const expiraAt = new Date(Date.now() + HORAS_SOLICITUD[tipo] * 60 * 60 * 1000);

  const solicitud = await prisma.solicitudDato.create({
    data: {
      tipo,
      vendedorId: sessionUserId,
      vendedorEmail: vendedor.email,
      vendedorNombre: vendedor.name,
      destinatarioEmail: datos.email.trim().toLowerCase(),
      destinatarioNombre: limpio(datos.nombre),
      destino: limpio(datos.destino),
      referencia: limpio(datos.referencia),
      token,
      expiraAt,
    },
    select: { id: true },
  });

  const link = `${SITE_BASE_URL}${RUTA_PUBLICA[tipo]}/${vendedor.slug}?s=${token}`;
  try {
    const tmpl = solicitudDatosEmail({
      tipo,
      vendedor: { nombre: vendedor.name, fotoUrl: vendedor.fotoUrl, whatsapp: vendedor.whatsapp },
      link,
      destinatarioNombre: limpio(datos.nombre),
      destino: limpio(datos.destino),
      referencia: limpio(datos.referencia),
    });
    await sendEmail({
      to: datos.email.trim(),
      from: DATOS_FROM,
      // Si el pasajero responde el email, le escribe directo a su asesor.
      replyTo: vendedor.email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
  } catch (err) {
    // La fila ya existe y el link sigue siendo válido; avisamos sin romper.
    log.error(`datos.solicitud.email failed (${solicitud.id})`, err);
    return {
      ok: false,
      message: "Guardamos la solicitud pero el email no salió. Probá de nuevo o pasale el link a mano.",
    };
  }

  log.info("datos.solicitud.ok", { id: solicitud.id, tipo });
  return { ok: true, message: "Listo, le mandamos el formulario por email." };
}

export type EstadoSolicitud = "completada" | "vigente" | "vencida";

export interface SolicitudResumen {
  id: string;
  destinatarioEmail: string;
  destinatarioNombre: string | null;
  destino: string | null;
  referencia: string | null;
  enviadoAt: Date;
  expiraAt: Date;
  completadoAt: Date | null;
  estado: EstadoSolicitud;
}

export async function getMisSolicitudes(
  tipo: TipoFormularioDato,
  vendedorId?: string,
): Promise<SolicitudResumen[]> {
  const { targetId } = await scopeVendedor(vendedorId);
  const filas = await prisma.solicitudDato.findMany({
    where: { vendedorId: targetId, tipo },
    orderBy: { enviadoAt: "desc" },
    take: 10,
    select: {
      id: true,
      destinatarioEmail: true,
      destinatarioNombre: true,
      destino: true,
      referencia: true,
      enviadoAt: true,
      expiraAt: true,
      completadoAt: true,
    },
  });

  const ahora = Date.now();
  return filas.map((f) => ({
    ...f,
    estado: f.completadoAt
      ? "completada"
      : f.expiraAt.getTime() <= ahora
        ? "vencida"
        : "vigente",
  }));
}
