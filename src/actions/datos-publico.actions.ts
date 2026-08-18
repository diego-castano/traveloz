"use server";

// ---------------------------------------------------------------------------
// Server actions públicas de los formularios de datos (sin sesión).
//
//   getVendedorPublico(slug)  → la tarjeta del asesor que ve el pasajero.
//   getSolicitud(token)       → precarga cuando el link vino por email (?s=).
//   submitEnvioPasajeros(...) → EnvioPasajeros + N PasajeroDato + aviso.
//   submitDatosPago(...)      → DatosPagoCifrado (bóveda 72 h) + aviso.
//
// Reglas que no se negocian:
//   • Los adjuntos NO viajan por acá: el cliente los sube antes a
//     /api/datos/upload y acá solo llegan las keys del bucket como strings.
//   • Nada de la tarjeta se loguea ni se devuelve al cliente. El logger solo
//     ve ids. Si no hay DATOS_PAGO_KEY, el formulario responde "no disponible"
//     - jamás se guarda en claro.
//   • Persistencia con UN create anidado, sin $transaction interactiva: la
//     DATABASE_URL de producción pasa por pgbouncer en transaction mode con
//     connection_limit=1 y una transacción larga congela toda la app.
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { checkFormRate } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { buildRespuestas, type FormField, type Respuesta } from "@/lib/cotizador-form";
import {
  MAX_PASAJEROS,
  envioPasajerosSchema,
  datosPagoSchema,
  getFormularioDato,
  primerError,
  type EnvioPasajerosInput,
  type PasajeroInput,
} from "@/lib/datos-form";
import {
  bovedaDisponible,
  cifrar,
  detectarEmisor,
  luhnValido,
  ultimos4 as ultimos4De,
  vencimientoVigente,
} from "@/lib/datos-cifrado";
import {
  DATOS_FROM,
  SITE_BASE_URL,
  avisoPagoEmail,
  envioPasajerosEmail,
  fechaLarga,
  recordatorioPagoEmail,
  type PasajeroEmail,
} from "@/lib/datos-email";
import type { TipoFormularioDato } from "@prisma/client";

const log = logger.child({ module: "datos-publico.actions" });

// Rutas del módulo admin (fase 2). Se centralizan acá para que el día que se
// construya la pantalla real haya un solo lugar que tocar.
const ADMIN_ENVIOS_PATH = "/backend/datos/pasajeros";
const ADMIN_PAGOS_PATH = "/backend/datos/pagos";

/** Vida de la bóveda de pago. Pasado esto, el barrido borra el payload. */
const HORAS_BOVEDA = 72;

export type FormResult = { ok: boolean; message: string };

const ERROR_GENERICO = "Hubo un error. Intentá de nuevo.";
const RATE_MSG = "Recibimos varios envíos desde tu conexión. Probá de nuevo más tarde.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function campo(fd: FormData, key: string): string | null {
  const v = fd.get(key);
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

function userAgent(): string | null {
  try {
    return headers().get("user-agent");
  } catch {
    return null;
  }
}

/**
 * Los campos EXTRA de un pasajero llegan con el índice adelante
 * (`p0__telefonoAlternativo`). Reconstruimos un FormData plano con los ids
 * pelados para poder reusar `buildRespuestas` del cotizador tal cual.
 */
function subFormData(fd: FormData, prefijo: string, campos: FormField[]): FormData {
  const sub = new FormData();
  for (const c of campos) {
    for (const v of fd.getAll(`${prefijo}${c.id}`)) sub.append(c.id, v);
    // El rango de fechas usa dos inputs con sufijo (contrato de buildRespuestas).
    for (const suf of ["__desde", "__hasta"]) {
      const v = fd.get(`${prefijo}${c.id}${suf}`);
      if (v !== null) sub.append(`${c.id}${suf}`, v);
    }
  }
  return sub;
}

/** Vendedor dueño del link. null si no existe, está inactivo o apagó el link. */
async function vendedorPorSlug(slug: string) {
  const limpio = slug.trim().toLowerCase();
  if (!limpio || !/^[a-z0-9-]{1,60}$/.test(limpio)) return null;
  return prisma.user.findFirst({
    where: { slug: limpio, isActive: true, linkActivo: true },
    select: { id: true, name: true, email: true, fotoUrl: true, telefono: true, whatsapp: true },
  });
}

/**
 * Solicitud vigente para este tipo. Un token vencido o ya usado devuelve null
 * y el envío sigue igual por el link permanente (solo no queda sellado).
 */
async function solicitudVigente(token: string | null, tipo: TipoFormularioDato) {
  if (!token) return null;
  const row = await prisma.solicitudDato.findUnique({ where: { token } });
  if (!row || row.tipo !== tipo) return null;
  if (row.completadoAt) return null;
  if (row.expiraAt.getTime() < Date.now()) return null;
  return row;
}

// ---------------------------------------------------------------------------
// Lecturas públicas
// ---------------------------------------------------------------------------

export interface VendedorPublicoView {
  nombre: string;
  fotoUrl: string | null;
  telefono: string | null;
  whatsapp: string | null;
}

/**
 * Datos del asesor para la tarjeta pública. SOLO lo que el pasajero puede ver:
 * ni email ni rol ni id salen de acá.
 */
export async function getVendedorPublico(slug: string): Promise<VendedorPublicoView | null> {
  try {
    const v = await vendedorPorSlug(slug);
    if (!v) return null;
    return {
      nombre: v.name,
      fotoUrl: v.fotoUrl,
      telefono: v.telefono,
      whatsapp: v.whatsapp,
    };
  } catch (err) {
    log.error("getVendedorPublico failed", err);
    return null;
  }
}

export interface SolicitudView {
  tipo: TipoFormularioDato;
  destinatarioNombre: string | null;
  destinatarioEmail: string;
  destino: string | null;
  referencia: string | null;
}

/** Precarga del formulario cuando el link llegó por email (?s=<token>). */
export async function getSolicitud(token: string): Promise<SolicitudView | null> {
  try {
    const limpio = token.trim();
    if (!limpio || limpio.length > 200) return null;
    const row = await prisma.solicitudDato.findUnique({ where: { token: limpio } });
    if (!row || row.completadoAt || row.expiraAt.getTime() < Date.now()) return null;
    return {
      tipo: row.tipo,
      destinatarioNombre: row.destinatarioNombre,
      destinatarioEmail: row.destinatarioEmail,
      destino: row.destino,
      referencia: row.referencia,
    };
  } catch (err) {
    log.error("getSolicitud failed", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Envío de pasajeros
// ---------------------------------------------------------------------------

const EXITO_PASAJEROS = "¡Listo! Recibimos los datos y tu asesor ya está en tema.";

export async function submitEnvioPasajeros(
  slug: string,
  solicitudToken: string | null,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    // Honeypot: el input invisible "website" lo completan solo los bots.
    if (campo(formData, "website")) return { ok: true, message: EXITO_PASAJEROS };

    const rate = checkFormRate(`datos-pasajeros:${slug}`, clientIp());
    if (!rate.allowed) return { ok: false, message: RATE_MSG };

    const vendedor = await vendedorPorSlug(slug);
    if (!vendedor) return { ok: false, message: "Este enlace no está disponible." };

    const formulario = await getFormularioDato("PASAJEROS");
    if (!formulario.publicado) {
      return { ok: false, message: "Este enlace no está disponible." };
    }

    // ── Armado del payload desde el FormData ────────────────────────────
    const cantidad = Number(campo(formData, "cantidadPasajeros") ?? "0");
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_PASAJEROS) {
      return { ok: false, message: "Revisá la cantidad de pasajeros." };
    }

    const pasajeros: PasajeroInput[] = [];
    for (let i = 0; i < cantidad; i++) {
      const p = `p${i}__`;
      const extras = buildRespuestas(formulario.campos, subFormData(formData, p, formulario.campos));
      if (!extras.ok) {
        return { ok: false, message: `Pasajero ${i + 1}: ${extras.message}` };
      }
      pasajeros.push({
        nombres: campo(formData, `${p}nombres`) ?? "",
        apellidos: campo(formData, `${p}apellidos`) ?? "",
        fechaNacimiento: campo(formData, `${p}fechaNacimiento`),
        documento: campo(formData, `${p}documento`) ?? "",
        pasaporte: campo(formData, `${p}pasaporte`),
        email: campo(formData, `${p}email`) ?? "",
        telefono: campo(formData, `${p}telefono`) ?? "",
        direccion: campo(formData, `${p}direccion`),
        pais: campo(formData, `${p}pais`) ?? "UY",
        ciudad: campo(formData, `${p}ciudad`),
        documentoKey: campo(formData, `${p}documentoKey`) ?? "",
        pasaporteKey: campo(formData, `${p}pasaporteKey`),
        respuestas: extras.respuestas,
      });
    }

    const quiereFactura = campo(formData, "quiereFactura") === "si";
    const entrada: EnvioPasajerosInput = {
      destino: campo(formData, "destino") ?? "",
      referencia: campo(formData, "referencia"),
      factura: quiereFactura
        ? {
            rut: campo(formData, "facturaRut") ?? "",
            razonSocial: campo(formData, "facturaRazonSocial") ?? "",
            email: campo(formData, "facturaEmail") ?? "",
            direccion: campo(formData, "facturaDireccion"),
          }
        : null,
      pasajeros,
    };

    const parsed = envioPasajerosSchema.safeParse(entrada);
    if (!parsed.success) {
      return { ok: false, message: primerError(parsed.error) };
    }
    const datos = parsed.data;

    const solicitud = await solicitudVigente(solicitudToken, "PASAJEROS");

    // ── Persistencia: un solo create anidado (sin transacción interactiva) ──
    const envio = await prisma.envioPasajeros.create({
      data: {
        vendedorId: vendedor.id,
        vendedorEmail: vendedor.email,
        solicitudId: solicitud?.id ?? null,
        destino: datos.destino,
        referencia: datos.referencia,
        facturaRut: datos.factura?.rut ?? null,
        facturaRazonSocial: datos.factura?.razonSocial ?? null,
        facturaEmail: datos.factura?.email ?? null,
        facturaDireccion: datos.factura?.direccion ?? null,
        ip: clientIp(),
        userAgent: userAgent(),
        pasajeros: {
          create: datos.pasajeros.map((p, orden) => ({
            orden,
            nombres: p.nombres,
            apellidos: p.apellidos,
            fechaNacimiento: p.fechaNacimiento
              ? new Date(`${p.fechaNacimiento}T00:00:00Z`)
              : null,
            documento: p.documento,
            pasaporte: p.pasaporte,
            email: p.email,
            telefono: p.telefono,
            direccion: p.direccion,
            pais: p.pais,
            ciudad: p.ciudad,
            documentoArchivoUrl: `/api/image/${p.documentoKey}`,
            pasaporteArchivoUrl: p.pasaporteKey ? `/api/image/${p.pasaporteKey}` : null,
            respuestas: p.respuestas as unknown as object[],
          })),
        },
      },
      select: { id: true },
    });

    // Sellar la solicitud es secundario: el envío ya quedó guardado.
    if (solicitud) {
      try {
        await prisma.solicitudDato.update({
          where: { id: solicitud.id },
          data: { completadoAt: new Date() },
        });
      } catch (err) {
        log.error("datos.pasajeros.sellar-solicitud failed", err);
      }
    }

    log.info("datos.pasajeros.ok", {
      envioId: envio.id,
      vendedorId: vendedor.id,
      pasajeros: datos.pasajeros.length,
    });

    // ── Aviso al vendedor (best-effort: el envío nunca se pierde por el mail) ──
    try {
      const paraEmail: PasajeroEmail[] = datos.pasajeros.map((p) => ({
        nombres: p.nombres,
        apellidos: p.apellidos,
        fechaNacimiento: p.fechaNacimiento,
        documento: p.documento,
        pasaporte: p.pasaporte,
        email: p.email,
        telefono: p.telefono,
        direccion: p.direccion,
        pais: p.pais,
        ciudad: p.ciudad,
        adjuntos: [
          { label: "Documento", url: `${SITE_BASE_URL}/api/image/${p.documentoKey}` },
          ...(p.pasaporteKey
            ? [{ label: "Pasaporte", url: `${SITE_BASE_URL}/api/image/${p.pasaporteKey}` }]
            : []),
        ],
        respuestas: p.respuestas.map((r: Respuesta) => ({ etiqueta: r.etiqueta, valor: r.valor })),
      }));

      const tmpl = envioPasajerosEmail({
        vendedorNombre: vendedor.name,
        pasajeros: paraEmail,
        destino: datos.destino,
        referencia: datos.referencia,
        factura: datos.factura,
        linkAdmin: `${SITE_BASE_URL}${ADMIN_ENVIOS_PATH}/${envio.id}`,
        fecha: fechaLarga(new Date()),
      });
      await sendEmail({
        to: vendedor.email,
        from: DATOS_FROM,
        // Responder el email escribe directo al primer pasajero del grupo.
        replyTo: datos.pasajeros[0]?.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    } catch (err) {
      log.error(`datos.pasajeros.email failed (envio ${envio.id})`, err);
    }

    return { ok: true, message: EXITO_PASAJEROS };
  } catch (err) {
    log.error("submitEnvioPasajeros failed", err);
    return { ok: false, message: ERROR_GENERICO };
  }
}

// ---------------------------------------------------------------------------
// Datos de pago
// ---------------------------------------------------------------------------

const EXITO_PAGO = "¡Listo! Recibimos los datos. Tu asesor te confirma el pago a la brevedad.";

export async function submitDatosPago(
  slug: string,
  solicitudToken: string | null,
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  // Ninguna rama de esta función loguea `formData` ni el objeto de tarjeta.
  // Todo lo que va al logger son ids.
  try {
    if (campo(formData, "website")) return { ok: true, message: EXITO_PAGO };

    const rate = checkFormRate(`datos-pago:${slug}`, clientIp());
    if (!rate.allowed) return { ok: false, message: RATE_MSG };

    if (!bovedaDisponible()) {
      log.error("datos.pago.boveda-no-configurada", { slug });
      return {
        ok: false,
        message: "El formulario de pago no está disponible en este momento. Escribile a tu asesor.",
      };
    }

    const vendedor = await vendedorPorSlug(slug);
    if (!vendedor) return { ok: false, message: "Este enlace no está disponible." };

    const formulario = await getFormularioDato("PAGO");
    if (!formulario.publicado) {
      return { ok: false, message: "Este enlace no está disponible." };
    }

    const extras = buildRespuestas(formulario.campos, formData);
    if (!extras.ok) return { ok: false, message: extras.message };

    const parsed = datosPagoSchema.safeParse({
      titular: campo(formData, "titular") ?? "",
      documentoTitular: campo(formData, "documentoTitular") ?? "",
      numero: campo(formData, "numero") ?? "",
      vencimiento: campo(formData, "vencimiento") ?? "",
      cvv: campo(formData, "cvv") ?? "",
      cuotas: campo(formData, "cuotas"),
      autorizo: campo(formData, "autorizo") ?? "",
      respuestas: extras.respuestas,
    });
    if (!parsed.success) {
      return { ok: false, message: primerError(parsed.error) };
    }
    const datos = parsed.data;

    if (!luhnValido(datos.numero)) {
      return { ok: false, message: "El número de tarjeta no es válido. Revisalo." };
    }
    if (!vencimientoVigente(datos.vencimiento)) {
      return { ok: false, message: "La tarjeta figura como vencida. Revisá el MM/AA." };
    }

    // Lo único que queda legible: titular, emisor y últimos 4. Se derivan
    // ANTES de cifrar; después de esta línea el número no existe en claro.
    const emisor = detectarEmisor(datos.numero);
    const cola = ultimos4De(datos.numero);
    const sobre = cifrar({
      numero: datos.numero,
      vencimiento: datos.vencimiento,
      cvv: datos.cvv,
      documentoTitular: datos.documentoTitular,
      cuotas: datos.cuotas,
      extras: datos.respuestas,
    });

    const solicitud = await solicitudVigente(solicitudToken, "PAGO");
    const expiraAt = new Date(Date.now() + HORAS_BOVEDA * 60 * 60 * 1000);

    const registro = await prisma.datosPagoCifrado.create({
      data: {
        vendedorId: vendedor.id,
        vendedorEmail: vendedor.email,
        solicitudId: solicitud?.id ?? null,
        titular: datos.titular,
        emisor,
        ultimos4: cola,
        payload: sobre.payload,
        iv: sobre.iv,
        tag: sobre.tag,
        expiraAt,
      },
      select: { id: true },
    });

    if (solicitud) {
      try {
        await prisma.solicitudDato.update({
          where: { id: solicitud.id },
          data: { completadoAt: new Date() },
        });
      } catch (err) {
        log.error("datos.pago.sellar-solicitud failed", err);
      }
    }

    log.info("datos.pago.ok", { pagoId: registro.id, vendedorId: vendedor.id });

    // Aviso inmediato. El email NO lleva número ni CVV: solo titular, emisor,
    // últimos 4 y el link al panel.
    const avisoOpts = {
      vendedorNombre: vendedor.name,
      titular: datos.titular,
      emisor,
      ultimos4: cola,
      expiraAt,
      linkAdmin: `${SITE_BASE_URL}${ADMIN_PAGOS_PATH}/${registro.id}`,
      destino: solicitud?.destino ?? null,
      referencia: solicitud?.referencia ?? null,
    };

    try {
      const tmpl = avisoPagoEmail(avisoOpts);
      await sendEmail({
        to: vendedor.email,
        from: DATOS_FROM,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    } catch (err) {
      log.error(`datos.pago.email failed (pago ${registro.id})`, err);
    }

    // Recordatorio agendado en Resend para 24 h antes de la purga. Guardamos
    // el id devuelto para poder cancelarlo cuando el vendedor abra la bóveda
    // (ver revelarPago en datos-boveda.actions.ts).
    //
    // El `if` de fecha futura es redundante con HORAS_BOVEDA = 72, pero queda
    // por si esa constante baja de 24: agendar en el pasado lo rechaza Resend
    // con un 422 y perderíamos el recordatorio sin enterarnos.
    //
    // Best-effort de punta a punta: sin RESEND_API_KEY no hay id (modo
    // console) y el campo queda en null, que es exactamente lo que espera la
    // cancelación. Nada de esto puede hacer fallar el envío del pasajero.
    try {
      const recordarAt = new Date(expiraAt.getTime() - 24 * 60 * 60 * 1000);
      if (recordarAt.getTime() > Date.now()) {
        const tmpl = recordatorioPagoEmail(avisoOpts);
        const res = await sendEmail({
          to: vendedor.email,
          from: DATOS_FROM,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
          scheduledAt: recordarAt,
        });
        if (res.id) {
          await prisma.datosPagoCifrado.update({
            where: { id: registro.id },
            data: { recordatorioResendId: res.id },
          });
        }
      }
    } catch (err) {
      log.error(`datos.pago.recordatorio failed (pago ${registro.id})`, err);
    }

    return { ok: true, message: EXITO_PAGO };
  } catch (err) {
    // El error se serializa solo (stack + message); nunca metemos el FormData.
    log.error("submitDatosPago failed", err);
    return { ok: false, message: ERROR_GENERICO };
  }
}
