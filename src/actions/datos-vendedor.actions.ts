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
//     es LO SUYO - el preview ?vista=vendedor no espía la bandeja de otro.
//   • MARKETING no entra a ninguna de estas actions: ve paquetes, no datos
//     personales de pasajeros ni tarjetas.
//   • Los errores que el vendedor tiene que leer vuelven como
//     { ok: false, message }, nunca como excepción: en producción Next
//     enmascara el mensaje de una server action que tira y el usuario termina
//     viendo "An error occurred in the Server Components render…".
//   • payload / iv / tag de DatosPagoCifrado NUNCA salen de este módulo. Los
//     selects son explícitos justamente para que un `include` distraído no
//     los arrastre. La revelación con segundo factor la construye otro módulo.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { parseRespuestas, type Respuesta } from "@/lib/cotizador-form";
import {
  DATOS_FROM,
  SITE_BASE_URL,
  datosPagoAdmEmail,
  solicitudDatosEmail,
} from "@/lib/datos-email";
import { descifrar } from "@/lib/datos-cifrado";
import { nombreCompleto, nombrePago } from "@/lib/datos-nombre";
import { slugUnicoParaUsuario } from "@/lib/slug-usuario";
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

/** Falla de negocio que la UI muestra tal cual. Nunca viaja como excepción. */
export interface DatosError {
  ok: false;
  message: string;
}

/**
 * Igual que scopeVendedor pero devolviendo el error en vez de tirarlo. En
 * producción Next enmascara el mensaje de una excepción de server action
 * ("An error occurred in the Server Components render…"), así que todo lo que
 * el vendedor tiene que poder leer vuelve como valor.
 */
async function scopeSuave(vendedorId?: string): Promise<
  | { ok: true; sessionUserId: string; targetId: string; isAdmin: boolean }
  | DatosError
> {
  try {
    const scope = await scopeVendedor(vendedorId);
    return { ok: true, ...scope };
  } catch (err) {
    const message =
      err instanceof Error && err.message ? err.message : "No pudimos verificar tu sesión.";
    return { ok: false, message };
  }
}

/**
 * Slug del link personal, generándolo y guardándolo si el usuario todavía no
 * tiene (los creados desde Perfiles nacían sin slug). Devuelve null solo si
 * del nombre no sale ningún slug utilizable.
 */
async function asegurarSlug(user: {
  id: string;
  name: string;
  slug: string | null;
}): Promise<string | null> {
  if (user.slug) return user.slug;

  const candidato = await slugUnicoParaUsuario(user.name, {
    excluirId: user.id,
    fallback: "vendedor",
  });
  if (!candidato) {
    log.warn("datos.slug.sin-candidato", { userId: user.id });
    return null;
  }

  try {
    const actualizado = await prisma.user.update({
      where: { id: user.id },
      data: { slug: candidato },
      select: { slug: true },
    });
    log.info("datos.slug.autocurado", { userId: user.id, slug: candidato });
    return actualizado.slug;
  } catch (err) {
    // Carrera contra otro request (el slug es unique): si mientras tanto ya
    // quedó puesto, ese sirve igual.
    log.error(`datos.slug.autocurar failed (${user.id})`, err);
    const fresco = await prisma.user.findUnique({
      where: { id: user.id },
      select: { slug: true },
    });
    return fresco?.slug ?? null;
  }
}

const SIN_SLUG =
  "No pudimos armar tu link personal. Pedile a un administrador que te lo genere desde Perfiles.";

// ---------------------------------------------------------------------------
// Contadores (mismo patrón que getLeadCounts)
// ---------------------------------------------------------------------------

export interface DatosCounts {
  /** Envíos de pasajeros recibidos (histórico completo). */
  envios: number;
  /** Envíos todavía sin abrir · el badge violeta de la solapa. */
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
        contacto: primero ? nombreCompleto(primero) : "·",
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
  /** Con qué nombre se muestra: el pasajero, o el titular en los viejos. */
  nombre: string;
  pasajeroNombre: string | null;
  titular: string;
  emisor: string | null;
  ultimos4: string;
  createdAt: Date;
  /** El reloj de la tarjeta lo dibuja el cliente contra esta fecha. */
  expiraAt: Date;
  vistoAt: Date | null;
  purgadoAt: Date | null;
  estado: EstadoPago;
  /** Envío a Administración: null mientras no se haya mandado. */
  numeroFile: string | null;
  enviadoAdmAt: Date | null;
  enviadoAdmPor: string | null;
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
      pasajeroNombre: true,
      titular: true,
      emisor: true,
      ultimos4: true,
      createdAt: true,
      expiraAt: true,
      vistoAt: true,
      purgadoAt: true,
      numeroFile: true,
      enviadoAdmAt: true,
      enviadoAdmPor: true,
    },
  });

  const ahora = Date.now();
  return filas.map((f) => ({
    ...f,
    nombre: nombrePago(f),
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
  ok: true;
  tipo: TipoFormularioDato;
  url: string;
  /** PNG en data-URL. Se genera en el server para no meter qrcode en el bundle. */
  qrDataUrl: string;
  linkActivo: boolean;
}

/**
 * Link personal + QR del vendedor. NUNCA tira: todo lo que puede salir mal
 * vuelve como { ok: false, message } y el modal lo muestra con "Reintentar".
 *
 * Si el usuario todavía no tiene slug (los creados desde Perfiles antes del
 * fix), se lo genera y se lo guarda acá mismo en vez de mandarlo a pedirle el
 * favor a un admin.
 */
export async function getMiLink(
  tipo: TipoFormularioDato,
  vendedorId?: string,
): Promise<MiLink | DatosError> {
  const scope = await scopeSuave(vendedorId);
  if (!scope.ok) return scope;

  try {
    const user = await prisma.user.findUnique({
      where: { id: scope.targetId },
      select: { id: true, name: true, slug: true, linkActivo: true },
    });
    if (!user) {
      return { ok: false, message: "No encontramos tu usuario. Volvé a iniciar sesión." };
    }

    const slug = await asegurarSlug(user);
    if (!slug) return { ok: false, message: SIN_SLUG };

    const url = `${SITE_BASE_URL}${RUTA_PUBLICA[tipo]}/${slug}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
    return { ok: true, tipo, url, qrDataUrl, linkActivo: user.linkActivo };
  } catch (err) {
    log.error("datos.link.armar failed", err);
    return { ok: false, message: "No pudimos armar tu link. Probá de nuevo en un rato." };
  }
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
  const scope = await scopeSuave();
  if (!scope.ok) return scope;
  const { sessionUserId } = scope;

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
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      linkActivo: true,
      fotoUrl: true,
      // La firma de email va en el mail al pasajero (pedido del cliente 28/08).
      firmaUrl: true,
      whatsapp: true,
    },
  });
  if (!vendedor) {
    return { ok: false, message: "No encontramos tu usuario. Volvé a iniciar sesión." };
  }
  const slug = await asegurarSlug(vendedor);
  if (!slug) return { ok: false, message: SIN_SLUG };
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

  const link = `${SITE_BASE_URL}${RUTA_PUBLICA[tipo]}/${slug}?s=${token}`;
  try {
    const tmpl = solicitudDatosEmail({
      tipo,
      vendedor: {
        nombre: vendedor.name,
        fotoUrl: vendedor.fotoUrl,
        firmaUrl: vendedor.firmaUrl,
        whatsapp: vendedor.whatsapp,
        email: vendedor.email,
      },
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

// ---------------------------------------------------------------------------
// Vista previa del email de solicitud
// ---------------------------------------------------------------------------

export interface PreviewSolicitud {
  ok: true;
  subject: string;
  html: string;
  /** El link de ejemplo no sirve: el token real se genera recién al enviar. */
  nota: string;
}

/**
 * Arma el email de solicitud con la MISMA plantilla que `crearSolicitud`,
 * pero sin tocar la DB ni mandar nada: solo para que el vendedor vea antes
 * de enviar cómo le va a llegar al pasajero. El link usa un token de
 * ejemplo ("?s=ejemplo") porque el real recién se genera al enviar.
 */
export async function previewSolicitudEmail(
  tipo: TipoFormularioDato,
  input?: { destinatarioNombre?: string; destino?: string; referencia?: string },
): Promise<PreviewSolicitud | DatosError> {
  const scope = await scopeSuave();
  if (!scope.ok) return scope;

  const vendedor = await prisma.user.findUnique({
    where: { id: scope.sessionUserId },
    select: { id: true, name: true, email: true, slug: true, fotoUrl: true, firmaUrl: true, whatsapp: true },
  });
  if (!vendedor) {
    return { ok: false, message: "No encontramos tu usuario. Volvé a iniciar sesión." };
  }
  const slug = await asegurarSlug(vendedor);
  if (!slug) return { ok: false, message: SIN_SLUG };

  const link = `${SITE_BASE_URL}${RUTA_PUBLICA[tipo]}/${slug}?s=ejemplo`;
  const tmpl = solicitudDatosEmail({
    tipo,
    vendedor: {
      nombre: vendedor.name,
      fotoUrl: vendedor.fotoUrl,
      firmaUrl: vendedor.firmaUrl,
      whatsapp: vendedor.whatsapp,
      email: vendedor.email,
    },
    link,
    destinatarioNombre: limpio(input?.destinatarioNombre),
    destino: limpio(input?.destino),
    referencia: limpio(input?.referencia),
  });

  return {
    ok: true,
    subject: tmpl.subject,
    html: tmpl.html,
    nota: "El link de este preview es de ejemplo: el token real se genera recién al enviar.",
  };
}

// ---------------------------------------------------------------------------
// Accesos a una tarjeta (quién la abrió y cuándo)
// ---------------------------------------------------------------------------

export interface AccesoPago {
  id: string;
  /** Nombre del usuario; si ya no existe, el email que quedó en la fila. */
  quien: string;
  createdAt: Date;
  /** true si el intento falló (credencial incorrecta, o el email que no salió). */
  fallido: boolean;
  /**
   * Qué hizo: "revelar" es haber abierto la tarjeta en el panel, "adm" es
   * haberla mandado a la casilla de Administración. Son dos hechos distintos
   * y la lista los cuenta distinto.
   */
  tipo: "revelar" | "adm";
  /** Número de file del envío a ADM. null en las aperturas. */
  numeroFile: string | null;
}

/**
 * Historial de aperturas de un registro de la bóveda, leído del AuditLog por
 * `targetId`. Mismo alcance que la revelación: el vendedor dueño o un ADMIN.
 *
 * Se muestra en el RevelarModal y en la ficha admin del pago. Es la respuesta
 * a "¿quién vio esta tarjeta?", que hasta ahora solo se podía contestar
 * entrando a la tabla de auditoría.
 */
export async function getAccesosPago(pagoId: string): Promise<AccesoPago[]> {
  try {
    const ctx = await requireAuth();
    if (!pagoId || pagoId.length > 60) return [];

    // El scope se valida contra la fila, no contra el audit log: si el
    // registro no es suyo (y no es admin), no devolvemos ni la existencia.
    const row = await prisma.datosPagoCifrado.findUnique({
      where: { id: pagoId },
      select: { vendedorId: true },
    });
    if (!row) return [];
    if (row.vendedorId !== ctx.userId && ctx.role !== "ADMIN") return [];

    const filas = await prisma.auditLog.findMany({
      where: {
        targetType: "datosPagoCifrado",
        targetId: pagoId,
        // Los envíos a Administración entran acá igual que las aperturas:
        // sacar la tarjeta del sistema por email es un acceso, y el que
        // pregunta "¿quién vio esto?" quiere ver los dos.
        action: {
          in: [
            "datos.pago.revelado",
            "datos.pago.revelar.fail",
            "datos.pago.enviar_adm",
            "datos.pago.enviar_adm.fail",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        action: true,
        userId: true,
        userEmail: true,
        createdAt: true,
        metadata: true,
      },
    });
    if (filas.length === 0) return [];

    const nombres = await nombresDeUsuarios(filas.map((f) => f.userId));
    return filas.map((f): AccesoPago => ({
      id: f.id,
      quien: (f.userId ? nombres.get(f.userId) : null) ?? f.userEmail ?? "Usuario",
      createdAt: f.createdAt,
      fallido: f.action.endsWith(".fail"),
      tipo: f.action.startsWith("datos.pago.enviar_adm") ? "adm" : "revelar",
      numeroFile: fileDeMetadata(f.metadata),
    }));
  } catch (err) {
    log.error("getAccesosPago failed", err);
    return [];
  }
}

/**
 * `metadata.numeroFile` del AuditLog. La columna es Json, así que lo que sale
 * de ahí es dato de afuera hasta que se lo mira: solo pasa un string corto.
 */
function fileDeMetadata(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>).numeroFile;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, 40) : null;
}

/** id → nombre, en una sola query. Los ids sueltos no tienen relación Prisma. */
async function nombresDeUsuarios(ids: (string | null)[]): Promise<Map<string, string>> {
  const unicos = Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
  if (unicos.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unicos } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

// ---------------------------------------------------------------------------
// Enviar a Administración
//
// Es el único camino por el que una tarjeta completa sale del sistema por
// email, y existe porque Administración NO tiene usuario en el panel: hoy el
// vendedor le reenvía el mail o se la dicta por WhatsApp. Esto lo reemplaza
// por un envío a una casilla configurada (SiteSetting notificaciones_email_adm)
// que además queda auditado.
//
// Decisiones del cliente (26/08/2026):
//   • NO pide PIN. La sesión del vendedor alcanza; el registro en AuditLog es
//     la contrapartida.
//   • NO borra ni acorta la tarjeta: sigue viva hasta expiraAt.
//   • El número de file es obligatorio y va en el asunto: es la clave con la
//     que Administración archiva el cobro.
// ---------------------------------------------------------------------------

/** Clave del SiteSetting con la casilla de Administración. */
const SETTING_EMAIL_ADM = "notificaciones_email_adm";

/**
 * Un archivo "use server" solo puede exportar funciones async, así que este
 * mensaje NO se exporta: viaja al cliente dentro del `message` del resultado.
 */
const MSG_ADM_SIN_CASILLA = "Configurá la casilla de ADM en Web → Notificaciones";

/**
 * Un email válido de verdad para la casilla de ADM. Corta el caso que importa:
 * un pedazo de texto suelto en el setting que se colaba como destinatario.
 */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Tope de envíos a ADM por vendedor cada hora. Se cuenta contra el AuditLog. */
const MAX_ADM_HORA = 20;

/** Reintento del MISMO registro con el MISMO file: recién a los 10 minutos. */
const COOLDOWN_ADM_MIN = 10;

const enviarAdmSchema = z.object({
  numeroFile: z
    .string()
    .trim()
    .min(1, "Ingresá el número de file.")
    .max(40, "El número de file no puede pasar de 40 caracteres.")
    // El file va al asunto del email. Letras, números, espacios, punto,
    // guion y barra alcanzan para cualquier nomenclatura de expediente; el
    // resto queda afuera antes de llegar a una cabecera SMTP.
    .regex(/^[\w\s./-]+$/, "El número de file tiene caracteres que no podemos usar.")
    // `\s` de arriba incluye los saltos: el asunto es de UNA línea.
    .refine((v) => !/[\r\n\t]/.test(v), "El número de file no puede tener saltos de línea."),
});

export interface EnviarAdmOk {
  ok: true;
  message: string;
  /** Para que la fila muestre "Enviado a ADM · file 11000" sin recargar. */
  numeroFile: string;
  enviadoAdmAt: Date;
  enviadoAdmPor: string;
}

export type EnviarAdmResult = EnviarAdmOk | DatosError;

export async function enviarPagoAAdm(
  id: string,
  input: { numeroFile: string },
): Promise<EnviarAdmResult> {
  // Ninguna rama loguea el objeto descifrado. Al logger solo van ids.
  try {
    const scope = await scopeSuave();
    if (!scope.ok) return scope;

    const parsed = enviarAdmSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá el número de file." };
    }
    const numeroFile = parsed.data.numeroFile;

    if (!id || id.length > 60) {
      return { ok: false, message: "No encontramos estos datos de pago." };
    }

    // ── Casilla de destino ────────────────────────────────────────────────
    // Sin casilla no se manda nada: preferimos que el vendedor la configure
    // antes que mandar una tarjeta a un destino por defecto.
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_EMAIL_ADM },
      select: { value: true },
    });
    // El validador del setting (key-validators.ts) acepta coma, punto y coma
    // y espacios; acá se parte con el MISMO criterio. Partiendo solo por coma,
    // una casilla escrita "adm@x.com; pagos@x.com" viajaba entera como un
    // único destinatario que Resend rechaza. Se filtra por email y se dedup:
    // ADM no necesita recibir la misma tarjeta dos veces.
    const destinos = Array.from(
      new Set(
        (setting?.value ?? "")
          .split(/[,;\s]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => RE_EMAIL.test(e)),
      ),
    );
    if (destinos.length === 0) {
      return { ok: false, message: MSG_ADM_SIN_CASILLA };
    }

    // ── El registro, con scope ────────────────────────────────────────────
    const row = await prisma.datosPagoCifrado.findUnique({
      where: { id },
      select: {
        id: true,
        vendedorId: true,
        pasajeroNombre: true,
        pasajeroDocumento: true,
        titular: true,
        emisor: true,
        ultimos4: true,
        payload: true,
        iv: true,
        tag: true,
        expiraAt: true,
        purgadoAt: true,
        solicitudId: true,
        numeroFile: true,
        enviadoAdmAt: true,
      },
    });
    if (!row) return { ok: false, message: "No encontramos estos datos de pago." };
    if (row.vendedorId !== scope.sessionUserId && !scope.isAdmin) {
      // Mismo mensaje que "no existe": no confirmamos un registro ajeno.
      return { ok: false, message: "No encontramos estos datos de pago." };
    }
    if (row.purgadoAt !== null || row.expiraAt.getTime() < Date.now()) {
      return { ok: false, message: "El dato ya fue eliminado." };
    }
    if (!row.payload || !row.iv || !row.tag) {
      return { ok: false, message: "El dato ya fue eliminado." };
    }

    // ── Reenvío ───────────────────────────────────────────────────────────
    // Mandar dos veces la misma tarjeta a ADM es mandar dos veces un PAN por
    // email. Cambiar el número de file SÍ es un envío nuevo (se archiva en
    // otro expediente); repetir el mismo file a los segundos es un doble clic
    // o un "no me llegó" apurado, y ahí conviene esperar.
    if (row.enviadoAdmAt && row.numeroFile === numeroFile) {
      const minutos = (Date.now() - row.enviadoAdmAt.getTime()) / 60_000;
      if (minutos < COOLDOWN_ADM_MIN) {
        const n = Math.max(1, Math.floor(minutos));
        return {
          ok: false,
          message: `Ya se envió hace ${n} ${n === 1 ? "minuto" : "minutos"}. Si Administración no lo recibió, esperá ${COOLDOWN_ADM_MIN} minutos y reintentá.`,
        };
      }
    }

    // Tope por vendedor y por hora, contado sobre los envíos que de verdad
    // salieron (el `.fail` no gasta cupo). Mismo patrón que el rate de
    // `crearSolicitud`: se cuenta en la DB, sin lib nueva.
    const desdeUnaHora = new Date(Date.now() - 60 * 60 * 1000);
    const enviadosUltimaHora = await prisma.auditLog.count({
      where: {
        action: "datos.pago.enviar_adm",
        userId: scope.sessionUserId,
        createdAt: { gte: desdeUnaHora },
      },
    });
    if (enviadosUltimaHora >= MAX_ADM_HORA) {
      return {
        ok: false,
        message: `Llegaste al tope de ${MAX_ADM_HORA} envíos a Administración por hora. Probá de nuevo más tarde.`,
      };
    }

    // ── Quién manda ───────────────────────────────────────────────────────
    const yo = await prisma.user.findUnique({
      where: { id: scope.sessionUserId },
      select: { name: true, email: true },
    });
    if (!yo) return { ok: false, message: "No encontramos tu usuario. Volvé a iniciar sesión." };

    // ── Descifrado ────────────────────────────────────────────────────────
    let claro;
    try {
      claro = descifrar({ payload: row.payload, iv: row.iv, tag: row.tag });
    } catch (err) {
      // Clave rotada o payload corrupto. El error de node:crypto no lleva
      // plaintext, pero igual solo logueamos el id.
      log.error("datos.pago.enviar_adm.descifrar failed", { pagoId: row.id });
      void err;
      return { ok: false, message: "No pudimos leer los datos de la tarjeta. Avisale al admin." };
    }

    // Contexto del viaje, si la tarjeta entró por una solicitud.
    const solicitud = row.solicitudId
      ? await prisma.solicitudDato.findUnique({
          where: { id: row.solicitudId },
          select: { destino: true, referencia: true },
        })
      : null;

    const quien = nombrePago(row);

    // ── Envío ─────────────────────────────────────────────────────────────
    const tmpl = datosPagoAdmEmail({
      numeroFile,
      enviadoPorNombre: yo.name,
      enviadoPorEmail: yo.email,
      pasajeroNombre: quien,
      pasajeroDocumento: row.pasajeroDocumento,
      titular: row.titular,
      documentoTitular: claro.documentoTitular,
      emisor: row.emisor,
      ultimos4: row.ultimos4,
      numero: claro.numero,
      vencimiento: claro.vencimiento,
      cvv: claro.cvv,
      cuotas: claro.cuotas,
      destino: solicitud?.destino ?? null,
      referencia: solicitud?.referencia ?? null,
      extras: (claro.extras ?? []).map((e) => ({ etiqueta: e.etiqueta, valor: e.valor })),
    });

    // `sendEmail` NUNCA tira: devuelve `{ delivered:false, error }`. Si el email
    // no salió, no se sella la fila ni se audita como enviado: la auditoría no
    // puede decir que Administración recibió algo que Resend rechazó.
    const envio = await sendEmail({
      to: destinos,
      from: DATOS_FROM,
      // Administración responde y le llega al vendedor que lo mandó.
      replyTo: yo.email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      // Lleva la tarjeta completa: sin preview en logs, nunca.
      sensible: true,
    });
    if (!envio.delivered) {
      log.error("datos.pago.enviar_adm.email failed", {
        pagoId: row.id,
        provider: envio.provider,
        error: typeof envio.error === "string" ? envio.error.slice(0, 200) : undefined,
      });
      const metaFail = await requestMeta();
      await logAudit({
        action: "datos.pago.enviar_adm.fail",
        userId: scope.sessionUserId,
        userEmail: yo.email,
        targetType: "datosPagoCifrado",
        targetId: row.id,
        ipAddress: metaFail.ip,
        userAgent: metaFail.userAgent,
        metadata: { pagoId: row.id, numeroFile, destinos: destinos.length, provider: envio.provider },
      });
      return {
        ok: false,
        message: "No pudimos mandar el email a Administración. Probá de nuevo en unos minutos.",
      };
    }

    // ── Sello + auditoría ─────────────────────────────────────────────────
    const enviadoAdmAt = new Date();
    try {
      await prisma.datosPagoCifrado.update({
        where: { id: row.id },
        data: { numeroFile, enviadoAdmAt, enviadoAdmPor: yo.name },
      });
    } catch (err) {
      // El email ya salió: no lo desandamos por no poder sellar la fila.
      log.error(`datos.pago.enviar_adm.sellar failed (pago ${row.id})`, err);
    }

    const meta = await requestMeta();
    await logAudit({
      action: "datos.pago.enviar_adm",
      userId: scope.sessionUserId,
      userEmail: yo.email,
      targetType: "datosPagoCifrado",
      targetId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      // Solo el QUÉ: nada de la tarjeta entra a la metadata.
      metadata: {
        pagoId: row.id,
        numeroFile,
        destinos: destinos.length,
        pasajero: quien,
      },
    });

    log.info("datos.pago.enviar_adm.ok", { pagoId: row.id, destinos: destinos.length });

    return {
      ok: true,
      message: "Los datos ya están en la casilla de Administración.",
      numeroFile,
      enviadoAdmAt,
      enviadoAdmPor: yo.name,
    };
  } catch (err) {
    log.error("enviarPagoAAdm failed", err);
    return { ok: false, message: "No se pudo enviar. Intentá de nuevo." };
  }
}

/** IP y user-agent del request, para la auditoría. Nunca rompe. */
async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
    return { ip: ip || null, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}
