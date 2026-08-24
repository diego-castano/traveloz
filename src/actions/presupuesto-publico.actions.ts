"use server";

// ---------------------------------------------------------------------------
// Server actions públicas del link de cotización (/c/<token>). Sin sesión.
//
//   confirmarDesdeLink(token, ...)        → el pasajero eligió una opción.
//   solicitarRevisionDesdeLink(token, …)  → el pasajero quiere ajustes.
//
// Reglas que no se negocian:
//   • El token es la única credencial. Se valida forma, vigencia y revocación
//     en cada llamada; nada se resuelve con el `id` del presupuesto, que el
//     cliente nunca ve.
//   • Ninguna action tira: todas devuelven { ok:false, error }. Del otro lado
//     hay un pasajero, no un vendedor que sepa qué hacer con un stack.
//   • El email al vendedor y el push a Bitrix son best-effort. Si Resend está
//     caído, la confirmación ya quedó escrita y el vendedor la ve en el panel:
//     perder la confirmación por no poder avisar sería el peor de los mundos.
//   • Nada de $transaction interactiva (pgbouncer con connection_limit=1).
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkFormRate } from "@/lib/rate-limit";
import { ipConfiableDeHeaders } from "@/lib/request-ip";
import { sendEmail } from "@/lib/email";
import { parseContenido } from "@/lib/presupuesto/schema";
import { precioOpcion } from "@/lib/presupuesto/derivados";
import { normalizarToken } from "@/lib/presupuesto/links";
import { fechaLarga } from "@/lib/datos-email";
import { confirmacionEmail, revisionEmail } from "@/lib/presupuesto-email";
import {
  bitrixEnabled,
  buscarContactoPorComunicacion,
  buscarNegocioAbiertoDelContacto,
  comentarEnNegocio,
  variantesTelefono,
} from "@/lib/bitrix";

const log = logger.child({ module: "presupuesto-publico.actions" });

export type ResultadoPublico<T> = { ok: true; data: T } | { ok: false; error: string };

const GENERICO = "Hubo un error. Probá de nuevo en un momento.";
const NO_VALE = "Este link ya no está disponible. Escribile a tu asesor y te manda uno nuevo.";
const RATE = "Recibimos varios intentos desde tu conexión. Probá de nuevo en un rato.";
const OPCION_INVALIDA = "No pudimos identificar la opción que elegiste. Recargá la página y probá de nuevo.";

/** Tope del comentario libre del pedido de revisión. */
const COMENTARIO_MAX = 1000;

/**
 * Texto listo para meter en un comentario de Bitrix.
 *
 * El campo entiende BBCode: unos corchetes en el nombre de una opción bastan
 * para abrir una etiqueta y dejar el comentario del CRM hecho un desastre. Los
 * saltos de línea se aplanan (un comentario es una línea) y el largo se acota,
 * que el nombre de la opción lo escribe el vendedor y puede ser cualquier cosa.
 */
function textoPlanoBitrix(s: unknown, max = 200): string {
  return String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

// ---------------------------------------------------------------------------
// Contexto de la request
// ---------------------------------------------------------------------------

/**
 * IP y user-agent del que llama. La IP sale del extremo CONFIABLE de
 * X-Forwarded-For (ver src/lib/request-ip.ts): acá es la prueba de la firma
 * digital, así que no puede ser un valor que el cliente escriba.
 */
function contextoRequest(): { ip: string | null; ua: string | null } {
  try {
    const h = headers();
    return {
      ip: ipConfiableDeHeaders(h),
      ua: h.get("user-agent")?.slice(0, 400) ?? null,
    };
  } catch {
    return { ip: null, ua: null };
  }
}

// ---------------------------------------------------------------------------
// Resolución del token
// ---------------------------------------------------------------------------

const SELECT_LINK = {
  id: true,
  token: true,
  expiraAt: true,
  revocadoAt: true,
  presupuesto: {
    select: {
      id: true,
      numero: true,
      estado: true,
      contenido: true,
      clienteNombre: true,
      clienteApellido: true,
      clienteEmail: true,
      clienteTelefono: true,
      destino: true,
      confirmadaAt: true,
      confirmadaOpcion: true,
      deletedAt: true,
      vendedor: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

type LinkConPresupuesto = NonNullable<
  Awaited<ReturnType<typeof buscarLink>>
>;

async function buscarLink(token: string) {
  return prisma.presupuestoLink.findUnique({
    where: { token },
    select: SELECT_LINK,
  });
}

/**
 * Trae el link y comprueba que sirva: forma del token, cotización viva, link
 * sin revocar y dentro de la vigencia. Devuelve el mensaje de error listo para
 * mostrarle al pasajero.
 *
 * Un token inexistente y uno vencido dan el MISMO texto a propósito: no
 * confirmamos qué tokens existen.
 */
async function resolverLink(
  raw: unknown,
): Promise<{ ok: true; link: LinkConPresupuesto } | { ok: false; error: string }> {
  const token = normalizarToken(raw);
  if (!token) return { ok: false, error: NO_VALE };

  const link = await buscarLink(token);
  if (!link || link.presupuesto.deletedAt) return { ok: false, error: NO_VALE };
  if (link.revocadoAt) return { ok: false, error: NO_VALE };
  if (link.expiraAt.getTime() < Date.now()) return { ok: false, error: NO_VALE };

  return { ok: true, link };
}

/** Bitácora best-effort: la acción del pasajero ya se escribió. */
async function anotar(
  presupuestoId: string,
  evento: { tipo: string; titulo: string; detalle?: string | null },
): Promise<void> {
  try {
    await prisma.presupuestoEvento.create({
      data: {
        presupuestoId,
        tipo: evento.tipo,
        titulo: evento.titulo,
        detalle: evento.detalle ?? null,
        actorTipo: "pasajero",
      },
    });
  } catch (err) {
    log.error("presupuesto.evento.publico.fail", { presupuestoId, tipo: evento.tipo, err });
  }
}

function nombreCliente(p: {
  clienteNombre: string | null;
  clienteApellido: string | null;
}): string {
  return [p.clienteNombre, p.clienteApellido].filter(Boolean).join(" ").trim() || "El pasajero";
}

// ---------------------------------------------------------------------------
// Confirmar
// ---------------------------------------------------------------------------

export interface ConfirmarInput {
  /** id de la opción elegida en el contenido. Es lo ÚNICO que se acepta. */
  opcionId?: string | null;
  /** Campo trampa: si viene con algo, es un bot. */
  honeypot?: string | null;
}

export interface ConfirmadaResumen {
  opcion: string;
  confirmadaAt: string;
  /** `true` cuando ya estaba confirmada de antes (doble clic, recarga). */
  yaEstaba: boolean;
}

/**
 * El pasajero confirma una opción desde el link.
 *
 * Es idempotente: una cotización ya confirmada devuelve `ok` con la opción que
 * quedó, sin volver a escribir ni a avisar. El botón se puede tocar dos veces
 * y el vendedor recibe un solo email.
 */
export async function confirmarDesdeLink(
  token: string,
  input: ConfirmarInput = {},
): Promise<ResultadoPublico<ConfirmadaResumen>> {
  try {
    // Honeypot: el formulario real deja el campo vacío siempre.
    if (String(input.honeypot ?? "").trim() !== "") {
      return { ok: false, error: GENERICO };
    }

    const { ip, ua } = contextoRequest();
    if (!checkFormRate("cotizador-confirmar", ip).allowed) {
      return { ok: false, error: RATE };
    }

    const res = await resolverLink(token);
    if (!res.ok) return res;
    const { link } = res;
    const p = link.presupuesto;

    if (p.confirmadaAt) {
      return {
        ok: true,
        data: {
          opcion: p.confirmadaOpcion ?? "tu opción",
          confirmadaAt: p.confirmadaAt.toISOString(),
          yaEstaba: true,
        },
      };
    }

    // El nombre de la opción sale SIEMPRE del contenido guardado. El navegador
    // solo dice CUÁL eligió; si ese id no está en la cotización, no hay nada
    // que confirmar y frenamos acá. Antes el nombre podía venir del body y
    // terminaba tal cual en la base, en el email al vendedor y en Bitrix.
    const parsed = parseContenido(p.contenido);
    const opciones = parsed.ok ? parsed.contenido.opciones ?? [] : [];
    const pedido = String(input.opcionId ?? "").trim();
    const idx = opciones.findIndex(
      (o) => String(o?.id ?? "") !== "" && String(o?.id) === pedido,
    );
    if (idx < 0) {
      log.warn("confirmarDesdeLink.opcion-invalida", { presupuestoId: p.id, opciones: opciones.length });
      return { ok: false, error: OPCION_INVALIDA };
    }
    const elegida = opciones[idx];
    const opcion = String(elegida?.nombre ?? "").trim() || `Opción ${idx + 1}`;
    const precio = Math.round(precioOpcion(elegida as never));

    const ahora = new Date();
    await prisma.presupuesto.update({
      where: { id: p.id },
      data: {
        estado: "CONFIRMADA",
        estadoManual: null,
        confirmadaAt: ahora,
        confirmadaOpcion: opcion,
        confirmadaVia: "link",
      },
    });

    // "Al confirmar aceptás esta cotización — vale como firma digital": lo que
    // sostiene esa frase es este registro. IP y user-agent quedan en el
    // detalle del evento, que es append-only.
    await anotar(p.id, {
      tipo: "confirmada",
      titulo: `Confirmada por el pasajero: ${opcion}`,
      detalle: JSON.stringify({
        via: "link",
        token: link.token,
        opcion,
        precio,
        ipFirma: ip,
        userAgentFirma: ua,
        firmadaAt: ahora.toISOString(),
      }),
    });

    await avisarConfirmacion({ p, opcion, precio, cuando: ahora });
    await empujarABitrix({ p, opcion, precio });

    return {
      ok: true,
      data: { opcion, confirmadaAt: ahora.toISOString(), yaEstaba: false },
    };
  } catch (err) {
    log.error("confirmarDesdeLink.fail", err);
    return { ok: false, error: GENERICO };
  }
}

/** Email al vendedor. Nunca frena la confirmación. */
async function avisarConfirmacion(args: {
  p: LinkConPresupuesto["presupuesto"];
  opcion: string;
  precio: number | null;
  cuando: Date;
}): Promise<void> {
  const { p, opcion, precio, cuando } = args;
  const para = p.vendedor?.email?.trim();
  if (!para) return;

  try {
    const plantilla = confirmacionEmail({
      numero: p.numero,
      cliente: nombreCliente(p),
      clienteEmail: p.clienteEmail,
      clienteTelefono: p.clienteTelefono,
      destino: p.destino,
      opcion,
      precio,
      cuando: fechaLarga(cuando),
    });
    await sendEmail({
      to: para,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });
  } catch (err) {
    log.error("confirmacion.email.fail", { presupuestoId: p.id, err });
  }
}

/**
 * Deja el hecho en el CRM, si el pasajero ya tiene un negocio abierto.
 *
 * Solo COMENTA. Nunca crea contactos ni negocios desde acá: el alta la hace el
 * formulario público con todos los datos del lead, y una tarjeta nacida de una
 * confirmación quedaría sin origen, sin campaña y sin vendedor asignado.
 */
async function empujarABitrix(args: {
  p: LinkConPresupuesto["presupuesto"];
  opcion: string;
  precio: number | null;
}): Promise<void> {
  const { p, opcion, precio } = args;
  if (process.env.BITRIX_OFF === "1" || !bitrixEnabled()) return;

  try {
    const email = p.clienteEmail?.trim();
    const telefonos = variantesTelefono(p.clienteTelefono, "+598");

    let contactId: number | null = null;
    if (telefonos.length) {
      contactId = await buscarContactoPorComunicacion("PHONE", telefonos);
    }
    if (!contactId && email) {
      contactId = await buscarContactoPorComunicacion("EMAIL", [email]);
    }
    if (!contactId) {
      log.debug("confirmacion.bitrix.sin-contacto", { presupuestoId: p.id });
      return;
    }

    const dealId = await buscarNegocioAbiertoDelContacto(contactId);
    if (!dealId) {
      log.debug("confirmacion.bitrix.sin-negocio", { presupuestoId: p.id, contactId });
      return;
    }

    const monto = precio && precio > 0 ? ` (USD ${precio.toLocaleString("es-UY")})` : "";
    await comentarEnNegocio(
      dealId,
      `Confirmó la cotización ${textoPlanoBitrix(p.numero, 40)} opción ${textoPlanoBitrix(
        opcion,
      )}${monto} desde el link.`,
    );
  } catch (err) {
    log.error("confirmacion.bitrix.fail", { presupuestoId: p.id, err });
  }
}

// ---------------------------------------------------------------------------
// Pedir una revisión
// ---------------------------------------------------------------------------

export interface RevisionInput {
  comentario?: string | null;
  honeypot?: string | null;
}

/**
 * El pasajero quiere que le ajusten la cotización. No cambia el estado: la
 * cotización sigue viva y el vendedor decide qué hacer. Solo queda el evento
 * en la bitácora y le llega el aviso.
 */
export async function solicitarRevisionDesdeLink(
  token: string,
  input: RevisionInput = {},
): Promise<ResultadoPublico<{ enviado: true }>> {
  try {
    if (String(input.honeypot ?? "").trim() !== "") {
      return { ok: false, error: GENERICO };
    }

    const { ip, ua } = contextoRequest();
    if (!checkFormRate("cotizador-revision", ip).allowed) {
      return { ok: false, error: RATE };
    }

    const res = await resolverLink(token);
    if (!res.ok) return res;
    const p = res.link.presupuesto;

    const comentario = String(input.comentario ?? "").trim().slice(0, COMENTARIO_MAX);
    const ahora = new Date();

    await anotar(p.id, {
      tipo: "revision_solicitada",
      titulo: "El pasajero pidió una revisión",
      detalle: JSON.stringify({
        via: "link",
        comentario: comentario || null,
        ip,
        userAgent: ua,
        pedidaAt: ahora.toISOString(),
      }),
    });

    const para = p.vendedor?.email?.trim();
    if (para) {
      try {
        const plantilla = revisionEmail({
          numero: p.numero,
          cliente: nombreCliente(p),
          clienteEmail: p.clienteEmail,
          clienteTelefono: p.clienteTelefono,
          destino: p.destino,
          comentario,
          cuando: fechaLarga(ahora),
        });
        await sendEmail({
          to: para,
          subject: plantilla.subject,
          html: plantilla.html,
          text: plantilla.text,
        });
      } catch (err) {
        log.error("revision.email.fail", { presupuestoId: p.id, err });
      }
    }

    return { ok: true, data: { enviado: true } };
  } catch (err) {
    log.error("solicitarRevisionDesdeLink.fail", err);
    return { ok: false, error: GENERICO };
  }
}
