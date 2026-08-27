// ---------------------------------------------------------------------------
// Emails del cotizador — los tres que salen alrededor del link público.
//
//   1. cotizacionEmail   → al pasajero: el link a su cotización (y el mismo
//                          texto sirve de recordatorio).
//   2. confirmacionEmail  → al vendedor: "eligió la opción X desde el link".
//   3. revisionEmail      → al vendedor: "pidió una revisión".
//
// El marco visual replica el `brandedLayout` de email.ts (que no está
// exportado) por el mismo camino que datos-email.ts y cotizador-email.ts: HTML
// local, inline-CSS email-safe, tabla de 560 px. Si algún día se exporta el
// layout, estas tres plantillas se cuelgan de él sin cambiar sus firmas.
//
// REGLA: al pasajero nunca le viaja nada interno. Ni notas del vendedor, ni
// netos, ni factores — solo lo que ya vería abriendo el link.
// ---------------------------------------------------------------------------

import { SITE_BASE_URL } from "@/lib/datos-email";
import { telefonoWa } from "@/lib/telefono";
import { precioOpcion } from "@/lib/presupuesto/derivados";
import { destinoFinal } from "@/lib/presupuesto/destino";
import { REGLA_HABILES, textoDiaCorto, textoVencimiento } from "@/lib/presupuesto/habiles";
import type { ContenidoPresupuesto } from "@/lib/presupuesto/schema";

const ACCENT = "#F43E55";
const VIOLET = "#785AE5";
const INK = "#23232b";
const MUTED = "#8a8f98";

const LOGO_URL = `${SITE_BASE_URL}/email-logo.png`;
const SITE_LABEL = SITE_BASE_URL.replace(/^https?:\/\//, "");

/** Remitente de los avisos del cotizador. Subdominio verificado en Resend. */
export const COTIZADOR_FROM = "TravelOz <notificaciones@app.traveloz.com.uy>";

export interface PlantillaEmail {
  subject: string;
  html: string;
  text: string;
}

/** Lo que la plantilla necesita saber del vendedor que firma. */
export interface VendedorEmail {
  nombre: string;
  cargo?: string | null;
  email?: string | null;
  tel?: string | null;
  foto?: string | null;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Asunto listo para el header del mail.
 *
 * El nombre del cliente y el nombre de la opción los escribe una persona y
 * terminan acá adentro. Un salto de línea en el medio de un header SMTP parte
 * el mensaje en dos (los headers se separan por CRLF): se aplanan siempre. El
 * corte en 120 caracteres es lo que muestra cualquier cliente de correo, y de
 * paso evita el asunto de tres renglones.
 */
function asunto(...partes: unknown[]): string {
  return partes
    .map((p) => String(p ?? ""))
    .join("")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

const P = (html: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK}">${html}</p>`;
const PMUTED = (html: string) =>
  `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${MUTED}">${html}</p>`;

function ctaButton(url: string, label: string, bg: string = ACCENT): string {
  return `<a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;line-height:1">${escapeHtml(
    label,
  )}</a>`;
}

function fieldRows(campos: { label: string; value: string | null | undefined }[]): string {
  return campos
    .filter((c) => c.value != null && String(c.value).trim() !== "")
    .map(
      (c, i) => `
        <tr>
          <td style="padding:9px 0;${i ? "border-top:1px solid #edeef2;" : ""}color:${MUTED};font-size:13px;line-height:1.4;vertical-align:top;width:38%">${escapeHtml(
            c.label,
          )}</td>
          <td style="padding:9px 0 9px 16px;${i ? "border-top:1px solid #edeef2;" : ""}color:${INK};font-size:14px;line-height:1.5;vertical-align:top;font-weight:500">${escapeHtml(
            String(c.value),
          ).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");
}

function tabla(filas: string): string {
  return filas
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px">${filas}</table>`
    : "";
}

function layout(opts: {
  heading: string;
  kicker?: string;
  bodyHtml: string;
  preheader?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#eef0f4;">
  ${
    opts.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef0f4;font-size:1px;line-height:1px">${escapeHtml(
          opts.preheader,
        )}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef0f4;padding:24px 12px;font-family:'Helvetica Neue',Arial,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:#ffffff;border:1px solid #e6e8ee;border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 28px 0;text-align:center">
          <img src="${LOGO_URL}" alt="TravelOz" height="40" style="height:40px;width:auto;display:inline-block" />
        </td></tr>
        <tr><td style="padding:16px 28px 0"><div style="height:2px;background-color:${ACCENT};width:40px;margin:0 auto;border-radius:2px;line-height:2px">&nbsp;</div></td></tr>
        <tr><td style="padding:20px 32px 26px">
          ${
            opts.kicker
              ? `<div style="font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:${MUTED};font-weight:600;margin-bottom:6px">${escapeHtml(
                  opts.kicker,
                )}</div>`
              : ""
          }
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${INK}">${escapeHtml(
            opts.heading,
          )}</h1>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background-color:#f7f8fa;border-top:1px solid #e6e8ee;text-align:center;color:${MUTED};font-size:12px;line-height:1.6">
          <strong style="color:${INK}">TravelOz</strong><br/>
          <a href="${SITE_BASE_URL}" style="color:${MUTED};text-decoration:underline">${escapeHtml(
            SITE_LABEL,
          )}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Firma del vendedor al pie del cuerpo. Es la misma tarjeta de datos-email. */
function tarjetaVendedor(v: VendedorEmail): string {
  const wa = telefonoWa(v.tel);
  const foto = v.foto?.trim();
  const fotoAbs = foto?.startsWith("/") ? `${SITE_BASE_URL}${foto}` : foto;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:16px 0 4px">
      <tr>
        ${
          fotoAbs
            ? `<td width="56" style="padding:14px 0 14px 16px;vertical-align:middle"><img src="${escapeHtml(
                fotoAbs,
              )}" alt="" width="44" height="44" style="width:44px;height:44px;border-radius:50%;display:block;object-fit:cover" /></td>`
            : ""
        }
        <td style="padding:14px 16px;vertical-align:middle;line-height:1.5">
          <div style="color:${MUTED};font-size:12px">Tu asesor</div>
          <div style="color:${INK};font-size:16px;font-weight:700">${escapeHtml(v.nombre)}</div>
          ${
            v.cargo
              ? `<div style="color:${MUTED};font-size:12px">${escapeHtml(v.cargo)} · TravelOz</div>`
              : ""
          }
          ${
            wa
              ? `<a href="https://wa.me/${wa}" style="color:${ACCENT};text-decoration:none;font-size:13px">Escribirle por WhatsApp</a>`
              : ""
          }
        </td>
      </tr>
    </table>`;
}

/** "12 de marzo de 2027" a partir del ISO pelado que guarda el cotizador. */
function fechaISOLarga(iso: unknown): string | null {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const mes = MESES[Number(m[2]) - 1];
  if (!mes) return null;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}

function money(n: unknown): string {
  const v = Number(n);
  return `USD ${(Number.isFinite(v) ? Math.round(v) : 0).toLocaleString("es-UY")}`;
}

/** Nombre de una opción, con el fallback que ya usa la ficha del pasajero. */
function nombreOpcion(o: { nombre?: unknown }, i: number): string {
  const n = String(o?.nombre ?? "").trim();
  return n || `Opción ${i + 1}`;
}

// ---------------------------------------------------------------------------
// 1. Al pasajero — el link a su cotización
// ---------------------------------------------------------------------------

export interface CotizacionEmailInput {
  /** El contenido de la cotización, ya validado por Zod. */
  q: ContenidoPresupuesto;
  vendedor: VendedorEmail;
  /** URL pública del link (`${SITE_BASE_URL}/c/<token>`). */
  url: string;
  /** Horas de vigencia del link, para la nota del pie. Son hábiles. */
  vigenciaHoras: number;
  /**
   * Cuándo deja de abrir el link, ya calculado en horas hábiles. El email
   * escribe la fecha concreta: "48 horas" obliga al pasajero a hacer una
   * cuenta que además saltea el fin de semana.
   */
  expiraAt?: Date | null;
  /** Cuándo salió la primera de esta ronda. Solo lo usa el recordatorio. */
  enviadaAt?: Date | null;
  /**
   * Saludo ya renderizado ({nombre} y {link} resueltos). Sale del mensaje
   * automático de la cotización o de la plantilla del máster.
   */
  saludo?: string | null;
  /** Cambia el asunto y el encabezado; el cuerpo es el mismo. */
  esRecordatorio?: boolean;
}

/**
 * El email que abre el pasajero. El link es el protagonista: el resumen está
 * para que reconozca de qué viaje se trata sin abrir nada, no para reemplazar
 * la cotización.
 */
export function cotizacionEmail(input: CotizacionEmailInput): PlantillaEmail {
  const { q, vendedor, url, vigenciaHoras } = input;
  // Solo el destino final en el asunto y en la ficha: "Jamaica", no
  // "Caribe › Jamaica" (pedido del cliente, 26/08).
  const destino = destinoFinal(q.titulo?.destino) || "tu viaje";
  const nombre = String(q.cliente?.nombre ?? "").trim();
  const numero = String(q.numero ?? "").trim();

  const noches = (q.destinos ?? []).reduce((a, d) => a + (Number(d?.noches) || 0), 0);
  const salida = fechaISOLarga(q.fechaSalida);

  const opciones = q.soloVuelos ? [] : q.opciones ?? [];
  const filasOpciones = opciones
    .map((o, i) => {
      const precio = precioOpcion(o as never);
      return {
        label: nombreOpcion(o as { nombre?: unknown }, i),
        value: precio > 0 ? `${money(precio)} por persona` : "a confirmar",
      };
    })
    .slice(0, 6);

  const precioVuelo = Number(q.precioVuelo?.adulto) || 0;

  const resumen = fieldRows([
    { label: "Destino", value: destinoFinal(q.titulo?.destino) || null },
    { label: "Salida", value: salida },
    { label: "Noches", value: noches > 0 ? String(noches) : null },
    ...(q.soloVuelos
      ? [{ label: "Aéreo por adulto", value: precioVuelo > 0 ? money(precioVuelo) : null }]
      : filasOpciones),
    { label: "Cotización", value: numero || null },
  ]);

  const heading = input.esRecordatorio
    ? `Tu cotización de ${destino} sigue disponible`
    : `Tu cotización de ${destino}`;

  // La vigencia en fecha, no en horas. Si por lo que sea no llegó `expiraAt`
  // (una plantilla vieja, un test), el texto vuelve a las horas de siempre.
  const vence = input.expiraAt ? textoVencimiento(input.expiraAt) : "";
  const salio = input.enviadaAt ? textoDiaCorto(input.enviadaAt) : "";
  const notaVigencia = vence
    ? `Está disponible hasta el ${vence} (${REGLA_HABILES})`
    : `El link está disponible por ${vigenciaHoras} horas hábiles (${REGLA_HABILES})`;

  // El saludo del vendedor manda; si no cargó ninguno, uno neutro que no suena
  // a plantilla vacía.
  const saludoTxt = (input.saludo ?? "").trim();
  const saludoHtml = saludoTxt
    ? saludoTxt
        .split(/\n{2,}/)
        .map((parr) => P(escapeHtml(parr).replace(/\n/g, "<br/>")))
        .join("")
    : P(
        `Hola${nombre ? ` <strong>${escapeHtml(nombre)}</strong>` : ""}, te comparto la cotización de <strong>${escapeHtml(
          destino,
        )}</strong>.`,
      );

  // El recordatorio tiene texto propio: no repite el email inicial (ni su
  // resumen ni el mensaje automático del vendedor). Recuerda cuándo salió,
  // hasta cuándo sirve y deja el botón. Tres líneas.
  const recordatorioTxt = [
    `Hola${nombre ? ` ${nombre}` : ""}, te escribo por la cotización${numero ? ` ${numero}` : ""} que te mandé${salio ? ` el ${salio}` : ""}.`,
    vence ? `Sigue disponible hasta el ${vence}.` : "Sigue disponible.",
    "Cualquier duda me decís.",
  ].join(" ");

  const body = input.esRecordatorio
    ? `
    ${P(escapeHtml(recordatorioTxt))}
    <p style="margin:20px 0 0">${ctaButton(url, "Ver mi cotización")}</p>
    ${PMUTED(`La vigencia se cuenta en horas hábiles: ${escapeHtml(REGLA_HABILES)}. Si se te vence igual, escribile a ${escapeHtml(
      vendedor.nombre,
    )} y te lo renueva.`)}
    ${tarjetaVendedor(vendedor)}`
    : `
    ${saludoHtml}
    ${tabla(resumen)}
    <p style="margin:20px 0 0">${ctaButton(url, "Ver mi cotización")}</p>
    ${PMUTED(
      `Se abre desde el celular y desde la computadora. ${escapeHtml(notaVigencia)}; si se te vence, escribile a ${escapeHtml(
        vendedor.nombre,
      )} y te lo renueva.`,
    )}
    ${tarjetaVendedor(vendedor)}`;

  // `destino` sale del encabezado que escribe el vendedor: mismo tratamiento
  // que los otros dos asuntos.
  const subject = asunto(
    input.esRecordatorio
      ? `Recordatorio · tu cotización${numero ? ` ${numero}` : ""} sigue disponible`
      : `Tu cotización de ${destino}${numero ? ` · ${numero}` : ""}`,
  );

  const text = (
    input.esRecordatorio
      ? [
          recordatorioTxt,
          "",
          `Ver la cotización: ${url}`,
          "",
          vendedor.nombre,
          vendedor.email ?? "",
        ]
      : [
          saludoTxt ||
            `Hola${nombre ? ` ${nombre}` : ""}, te comparto la cotización de ${destino}.`,
          "",
          salida ? `Salida: ${salida}` : null,
          noches > 0 ? `Noches: ${noches}` : null,
          ...filasOpciones.map((f) => `${f.label}: ${f.value}`),
          "",
          `Ver la cotización: ${url}`,
          `${notaVigencia}.`,
          "",
          vendedor.nombre,
          vendedor.email ?? "",
        ]
  )
    .filter((l) => l !== null)
    .join("\n");

  return {
    subject,
    html: layout({
      heading,
      kicker: input.esRecordatorio ? "Recordatorio" : "Tu cotización",
      bodyHtml: body,
      preheader: `${destino}${salida ? ` · salida ${salida}` : ""}`,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. Al vendedor — el pasajero confirmó desde el link
// ---------------------------------------------------------------------------

export interface ConfirmacionEmailInput {
  numero: string;
  cliente: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  destino?: string | null;
  opcion: string;
  precio?: number | null;
  /** Momento de la confirmación, ya formateado en hora uruguaya. */
  cuando: string;
  /**
   * Los dos links permanentes del vendedor. Van como recordatorio del paso
   * siguiente: confirmada la cotización, lo que falta son los datos de los
   * pasajeros y la tarjeta. `null` cuando el vendedor no tiene link personal
   * o lo tiene apagado — ahí el bloque no se dibuja.
   */
  linksVendedor?: { pasajeros?: string | null; pago?: string | null } | null;
}

/**
 * Aviso al vendedor. Va con todo lo que necesita para levantar el teléfono sin
 * abrir el panel: quién, qué opción, cuánto y cómo ubicarlo.
 */
/**
 * Recordatorio del paso siguiente: los dos formularios del vendedor, listos
 * para copiar y mandarle al pasajero.
 */
function linksDatos(
  links: { pasajeros?: string | null; pago?: string | null } | null | undefined,
): string {
  const pasajeros = links?.pasajeros?.trim();
  const pago = links?.pago?.trim();
  if (!pasajeros && !pago) return "";

  const boton = (url: string, label: string, bg: string) =>
    `<td style="padding:0 8px 8px 0">${ctaButton(url, label, bg)}</td>`;

  return `
    <div style="margin:22px 0 0;padding:16px 18px;background-color:#f7f8fa;border-radius:12px">
      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};font-weight:600;margin-bottom:6px">Mandale al pasajero</div>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${INK}">
        Tus dos links personales. Lo que cargue el pasajero te llega a vos, a tu bandeja de Pasajeros y Pagos.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        ${pasajeros ? boton(pasajeros, "Datos de pasajeros", VIOLET) : ""}
        ${pago ? boton(pago, "Datos de tarjeta", ACCENT) : ""}
      </tr></table>
    </div>`;
}

export function confirmacionEmail(input: ConfirmacionEmailInput): PlantillaEmail {
  const destino = (input.destino ?? "").trim();
  const filas = fieldRows([
    { label: "Cliente", value: input.cliente },
    { label: "Teléfono", value: input.clienteTelefono },
    { label: "Email", value: input.clienteEmail },
    { label: "Destino", value: destino || null },
    { label: "Opción elegida", value: input.opcion },
    {
      label: "Precio",
      value: input.precio && input.precio > 0 ? `${money(input.precio)} por persona` : null,
    },
    { label: "Cotización", value: input.numero },
    { label: "Confirmada", value: input.cuando },
  ]);

  const body = `
    ${P(
      `<strong>${escapeHtml(input.cliente)}</strong> confirmó la cotización <strong>${escapeHtml(
        input.numero,
      )}</strong> desde el link público y eligió <strong>${escapeHtml(input.opcion)}</strong>.`,
    )}
    ${tabla(filas)}
    <p style="margin:20px 0 0">${ctaButton(`${SITE_BASE_URL}/backend/cotizador`, "Abrir el cotizador", VIOLET)}</p>
    ${linksDatos(input.linksVendedor)}
    ${PMUTED(
      "La cotización ya quedó en estado Confirmada. El siguiente paso es coordinar la seña y pedirle los datos de los pasajeros.",
    )}`;

  const links = input.linksVendedor;
  const text = [
    `${input.cliente} confirmó ${input.numero} desde el link.`,
    `Opción: ${input.opcion}`,
    input.precio && input.precio > 0 ? `Precio: ${money(input.precio)}` : null,
    destino ? `Destino: ${destino}` : null,
    input.clienteTelefono ? `Teléfono: ${input.clienteTelefono}` : null,
    input.clienteEmail ? `Email: ${input.clienteEmail}` : null,
    `Cuándo: ${input.cuando}`,
    "",
    `${SITE_BASE_URL}/backend/cotizador`,
    links?.pasajeros ? `Datos de pasajeros: ${links.pasajeros}` : null,
    links?.pago ? `Datos de tarjeta: ${links.pago}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: asunto(`Confirmó: ${input.cliente} · ${input.opcion} · ${input.numero}`),
    html: layout({
      heading: "Te confirmaron una cotización",
      kicker: "Desde el link",
      bodyHtml: body,
      preheader: `${input.cliente} eligió ${input.opcion}`,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 3. Al vendedor — el pasajero pidió una revisión
// ---------------------------------------------------------------------------

export interface RevisionEmailInput {
  numero: string;
  cliente: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  destino?: string | null;
  comentario?: string | null;
  cuando: string;
}

export function revisionEmail(input: RevisionEmailInput): PlantillaEmail {
  const destino = (input.destino ?? "").trim();
  const filas = fieldRows([
    { label: "Cliente", value: input.cliente },
    { label: "Teléfono", value: input.clienteTelefono },
    { label: "Email", value: input.clienteEmail },
    { label: "Destino", value: destino || null },
    { label: "Cotización", value: input.numero },
    { label: "Pedido", value: input.cuando },
  ]);

  const comentario = (input.comentario ?? "").trim();

  const body = `
    ${P(
      `<strong>${escapeHtml(input.cliente)}</strong> pidió una revisión de la cotización <strong>${escapeHtml(
        input.numero,
      )}</strong> desde el link público.`,
    )}
    ${
      comentario
        ? `<div style="margin:14px 0 0;padding:13px 15px;border-radius:12px;background:#f4f2fd;border:1px solid #e0d9f7;font-size:14px;line-height:1.6;color:${INK}">${escapeHtml(
            comentario,
          ).replace(/\n/g, "<br/>")}</div>`
        : PMUTED("No dejó ningún comentario: escribile para saber qué quiere cambiar.")
    }
    ${tabla(filas)}
    <p style="margin:20px 0 0">${ctaButton(`${SITE_BASE_URL}/backend/cotizador`, "Abrir el cotizador", VIOLET)}</p>`;

  const text = [
    `${input.cliente} pidió una revisión de ${input.numero}.`,
    comentario ? `Comentario: ${comentario}` : "Sin comentario.",
    destino ? `Destino: ${destino}` : null,
    input.clienteTelefono ? `Teléfono: ${input.clienteTelefono}` : null,
    input.clienteEmail ? `Email: ${input.clienteEmail}` : null,
    `Cuándo: ${input.cuando}`,
    "",
    `${SITE_BASE_URL}/backend/cotizador`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: asunto(`Pidió una revisión: ${input.cliente} · ${input.numero}`),
    html: layout({
      heading: "Te pidieron una revisión",
      kicker: "Desde el link",
      bodyHtml: body,
      preheader: comentario || `${input.cliente} quiere ajustar la cotización`,
    }),
    text,
  };
}
