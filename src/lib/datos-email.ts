// ---------------------------------------------------------------------------
// Emails de los formularios de datos (pasajeros y pago).
//
// Cinco plantillas:
//   1. solicitudDatosEmail   → al pasajero: "completá tus datos acá".
//   2. envioPasajerosEmail   → al vendedor: el grupo completo que llegó.
//   3. avisoPagoEmail        → al vendedor: AVISO de que hay tarjeta cargada.
//   4. recordatorioPagoEmail → al vendedor: le queda 1 día antes de la purga.
//   5. datosPagoAdmEmail     → a Administración: la tarjeta COMPLETA.
//
// REGLA DURA de las plantillas 1-4: el número de tarjeta, el CVV y el
// documento del titular NUNCA salen por email. Solo viajan pasajero, titular,
// emisor y los últimos 4 - lo mismo que queda en claro en la DB. Para ver el
// resto hay que entrar al panel con sesión.
//
// La 5 es la ÚNICA excepción y es una decisión explícita del cliente
// (26/08/2026): Administración no tiene usuario en el sistema y hoy recibe la
// tarjeta a mano, por WhatsApp o reenviando el mail del vendedor. El botón
// "Enviar a ADM" reemplaza ese reenvío manual por un envío auditado a una
// casilla configurada en el panel. Se manda a un único destino
// (notificaciones_email_adm) y queda asentado en AuditLog con quién, cuándo y
// con qué número de file.
//
// El marco visual replica el `brandedLayout` de email.ts (que no está
// exportado) siguiendo el mismo camino que cotizador-email.ts: HTML armado
// localmente, inline-CSS email-safe, tablas de 560px. Si algún día se exporta
// brandedLayout, estas cuatro plantillas se pueden colgar de él sin tocar sus
// firmas.
// ---------------------------------------------------------------------------

import { telefonoWa } from "@/lib/telefono";
import { TEXTO_HORAS_BOVEDA } from "@/lib/datos-constantes";
import { nombrePago } from "@/lib/datos-nombre";

const ACCENT = "#F43E55";
const INK = "#23232b";
const MUTED = "#8a8f98";

// Mismo criterio que email.ts / cotizador-email.ts: la env manda, y si falta
// preferimos el apex definitivo antes que exponer la URL interna de Railway.
export const SITE_BASE_URL = (
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://traveloz.com.uy"
).replace(/\/+$/, "");

// email-logo.png (no header-logo.webp): el proxy de Gmail rompe el alpha del
// webp y Outlook directamente no lo soporta.
const LOGO_URL = `${SITE_BASE_URL}/email-logo.png`;
const SITE_LABEL = SITE_BASE_URL.replace(/^https?:\/\//, "");

/** Remitente de los avisos. Subdominio verificado en Resend. */
export const DATOS_FROM = "TravelOz <notificaciones@app.traveloz.com.uy>";

/**
 * Todo texto que entra a un `subject` pasa por acá.
 *
 * Un asunto es una cabecera SMTP de una sola línea: un \r o un \n metido en
 * el número de file o en el nombre del pasajero es, en el peor caso, header
 * injection, y en el mejor un asunto partido al medio. El corte a 120
 * caracteres es lo que muestran Gmail y Outlook sin recortar con "…".
 */
export function asuntoSeguro(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 120)
    .trim();
}

export interface Plantilla {
  subject: string;
  html: string;
  text: string;
  /**
   * El cuerpo no puede terminar en un log. Viaja con la plantilla (y no como
   * memoria del call site) para que quien la mande no tenga que acordarse:
   * hoy solo lo marca `datosPagoAdmEmail`, que es el único email del sistema
   * con el número de tarjeta y el CVV adentro. `sendEmail` lo lee y silencia
   * el preview de la rama sin RESEND_API_KEY.
   */
  sensible?: boolean;
}

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

const P = (html: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK}">${html}</p>`;
const PMUTED = (html: string) =>
  `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${MUTED}">${html}</p>`;

function ctaButton(url: string, label: string, bg: string = ACCENT): string {
  return `<a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;line-height:1">${escapeHtml(
    label,
  )}</a>`;
}

/** Filas etiqueta/valor. Las vacías se omiten solas. */
function fieldRows(campos: { label: string; value: string | null | undefined }[]): string {
  return campos
    .filter((c) => c.value != null && String(c.value).trim() !== "")
    .map(
      (c, i) => `
        <tr>
          <td style="padding:9px 0;${i ? `border-top:1px solid #edeef2;` : ""}color:${MUTED};font-size:13px;line-height:1.4;vertical-align:top;width:38%">${escapeHtml(
            c.label,
          )}</td>
          <td style="padding:9px 0 9px 16px;${i ? `border-top:1px solid #edeef2;` : ""}color:${INK};font-size:14px;line-height:1.5;vertical-align:top;font-weight:500">${escapeHtml(
            String(c.value),
          ).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");
}

function layout(opts: { heading: string; kicker?: string; bodyHtml: string; preheader?: string }): string {
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

/** Fecha larga en español rioplatense (Montevideo). */
export function fechaLarga(d: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Montevideo",
  }).format(d);
}

// ---------------------------------------------------------------------------
// 1. Solicitud al pasajero - "completá tus datos"
// ---------------------------------------------------------------------------

export interface VendedorPublico {
  nombre: string;
  fotoUrl?: string | null;
  whatsapp?: string | null;
}

export function solicitudDatosEmail(opts: {
  tipo: "PASAJEROS" | "PAGO";
  vendedor: VendedorPublico;
  /** URL completa del formulario, ya con ?s=<token>. */
  link: string;
  destinatarioNombre?: string | null;
  destino?: string | null;
  referencia?: string | null;
}): Plantilla {
  const esPago = opts.tipo === "PAGO";
  const que = esPago ? "los datos de pago" : "los datos de los pasajeros";
  const heading = esPago ? "Completá tus datos de pago" : "Completá los datos de los pasajeros";
  const saludo = opts.destinatarioNombre?.trim()
    ? `Hola <strong>${escapeHtml(opts.destinatarioNombre.trim())}</strong>`
    : "Hola";

  // Tarjeta del asesor: el pasajero tiene que ver a quién le está mandando sus
  // datos, tanto en el email como en la página.
  const wa = telefonoWa(opts.vendedor.whatsapp);
  const foto = opts.vendedor.fotoUrl?.trim();
  const fotoAbsoluta = foto?.startsWith("/") ? `${SITE_BASE_URL}${foto}` : foto;
  const asesor = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:6px 0 4px">
      <tr>
        ${
          fotoAbsoluta
            ? `<td width="56" style="padding:14px 0 14px 16px;vertical-align:middle"><img src="${escapeHtml(
                fotoAbsoluta,
              )}" alt="" width="44" height="44" style="width:44px;height:44px;border-radius:50%;display:block;object-fit:cover" /></td>`
            : ""
        }
        <td style="padding:14px 16px;vertical-align:middle;line-height:1.5">
          <div style="color:${MUTED};font-size:12px">Tu asesor</div>
          <div style="color:${INK};font-size:16px;font-weight:700">${escapeHtml(
            opts.vendedor.nombre,
          )}</div>
          ${
            wa
              ? `<a href="https://wa.me/${wa}" style="color:${ACCENT};text-decoration:none;font-size:13px">Escribirle por WhatsApp</a>`
              : ""
          }
        </td>
      </tr>
    </table>`;

  const datos = fieldRows([
    { label: "Destino", value: opts.destino },
    { label: "Referencia", value: opts.referencia },
  ]);

  const body = `
    ${P(`${saludo}, necesitamos ${que} para avanzar con tu reserva.`)}
    ${asesor}
    ${datos ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px">${datos}</table>` : ""}
    <p style="margin:20px 0 0">${ctaButton(opts.link, esPago ? "Cargar datos de pago" : "Cargar datos de pasajeros")}</p>
    ${
      esPago
        ? PMUTED(
            `El formulario es seguro: los datos de la tarjeta se guardan cifrados y se eliminan automáticamente a las ${TEXTO_HORAS_BOVEDA}.`,
          )
        : PMUTED("Vas a necesitar el documento de cada pasajero a mano para adjuntarlo.")
    }
    ${PMUTED("Si no esperabas este email, ignoralo.")}`;

  return {
    subject: esPago ? "Completá tus datos de pago · TravelOz" : "Completá los datos de los pasajeros · TravelOz",
    html: layout({ heading, kicker: "TravelOz", bodyHtml: body, preheader: `${opts.vendedor.nombre} te pide ${que}` }),
    text: [
      `${opts.destinatarioNombre?.trim() ? `Hola ${opts.destinatarioNombre.trim()},` : "Hola,"}`,
      "",
      `Necesitamos ${que} para avanzar con tu reserva.`,
      `Tu asesor: ${opts.vendedor.nombre}${wa ? ` · WhatsApp: https://wa.me/${wa}` : ""}`,
      opts.destino ? `Destino: ${opts.destino}` : "",
      opts.referencia ? `Referencia: ${opts.referencia}` : "",
      "",
      `Completá el formulario acá: ${opts.link}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 2. Envío de pasajeros → al vendedor
// ---------------------------------------------------------------------------

export interface PasajeroEmail {
  /** "Nombre y apellido" completo en los envíos nuevos. */
  nombres: string;
  /** "" en los nuevos; los viejos lo traen cargado. */
  apellidos?: string | null;
  fechaNacimiento?: string | null;
  documento: string;
  pasaporte?: string | null;
  email: string;
  telefono: string;
  direccion?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  /** Links al proxy protegido (/api/image/...). Requieren sesión del panel. */
  adjuntos: { label: string; url: string }[];
  respuestas: { etiqueta: string; valor: string }[];
}

/** Nombre visible del pasajero (un campo en los nuevos, dos en los viejos). */
function nombreDe(p: PasajeroEmail): string {
  return `${p.nombres} ${p.apellidos ?? ""}`.replace(/\s+/g, " ").trim();
}

export function envioPasajerosEmail(opts: {
  vendedorNombre: string;
  pasajeros: PasajeroEmail[];
  /** Ya no se le pide al pasajero: llega solo si la solicitud lo traía. */
  destino: string | null;
  referencia?: string | null;
  factura?: { rut: string; razonSocial: string; email: string; direccion?: string | null } | null;
  /** URL del envío en el panel. */
  linkAdmin: string;
  fecha?: string;
}): Plantilla {
  const cantidad = opts.pasajeros.length;
  const plural = cantidad === 1 ? "1 pasajero" : `${cantidad} pasajeros`;

  const bloques = opts.pasajeros
    .map((p, i) => {
      const filas = fieldRows([
        { label: "Documento de viaje", value: p.documento },
        // Los envíos viejos pueden traerlo; los nuevos no lo piden.
        { label: "Pasaporte", value: p.pasaporte },
        { label: "Fecha de nacimiento", value: p.fechaNacimiento },
        { label: "Email", value: p.email },
        { label: "Teléfono", value: p.telefono },
        { label: "Dirección", value: p.direccion },
        { label: "Ciudad", value: p.ciudad },
        { label: "País", value: p.pais },
        ...p.respuestas.map((r) => ({ label: r.etiqueta, value: r.valor })),
      ]);
      const adjuntos = p.adjuntos
        .map(
          (a) =>
            `<a href="${escapeHtml(a.url)}" style="display:inline-block;margin:6px 8px 0 0;color:${ACCENT};text-decoration:none;font-size:13px;border:1px solid #f0d4d8;border-radius:8px;padding:6px 12px">${escapeHtml(
              a.label,
            )}</a>`,
        )
        .join("");
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:12px;margin:0 0 12px">
          <tr><td style="padding:14px 16px 6px">
            <div style="font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:${MUTED};font-weight:600">Pasajero ${i + 1}</div>
            <div style="font-size:17px;font-weight:700;color:${INK};line-height:1.35;margin-top:2px">${escapeHtml(
              nombreDe(p),
            )}</div>
          </td></tr>
          <tr><td style="padding:0 16px 8px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
          </td></tr>
          ${
            adjuntos
              ? `<tr><td style="padding:0 16px 14px">
            <div style="color:${MUTED};font-size:12px">Archivos (se abren con tu sesión del panel)</div>${adjuntos}
          </td></tr>`
              : ""
          }
        </table>`;
    })
    .join("");

  const facturaHtml = opts.factura
    ? `<div style="font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:${MUTED};font-weight:600;margin:18px 0 6px">Facturación con RUT</div>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fieldRows([
         { label: "RUT", value: opts.factura.rut },
         { label: "Razón social", value: opts.factura.razonSocial },
         { label: "Email", value: opts.factura.email },
         { label: "Dirección", value: opts.factura.direccion },
       ])}</table>`
    : "";

  const cabecera = fieldRows([
    { label: "Destino", value: opts.destino },
    { label: "Referencia", value: opts.referencia },
    { label: "Recibido", value: opts.fecha },
  ]);

  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.vendedorNombre)}</strong>, te llegaron los datos de <strong>${plural}</strong>.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:6px 0 16px"><tr><td style="padding:6px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cabecera}</table>
    </td></tr></table>
    ${bloques}
    ${facturaHtml}
    <p style="margin:20px 0 0">${ctaButton(opts.linkAdmin, "Ver el envío en el panel", INK)}</p>`;

  // Sin destino (el caso normal desde el 26/08/2026) el asunto se identifica
  // por el titular del grupo, que es lo que el vendedor reconoce.
  const referencia = opts.destino?.trim() || nombreDe(opts.pasajeros[0]!) || "nuevo envío";

  const text = [
    `Datos de ${plural} · ${referencia}`,
    opts.referencia ? `Referencia: ${opts.referencia}` : "",
    opts.fecha ? `Recibido: ${opts.fecha}` : "",
    "",
    ...opts.pasajeros.flatMap((p, i) => [
      `· Pasajero ${i + 1}: ${nombreDe(p)}`,
      `  Documento de viaje: ${p.documento}`,
      p.pasaporte ? `  Pasaporte: ${p.pasaporte}` : "",
      p.fechaNacimiento ? `  Nacimiento: ${p.fechaNacimiento}` : "",
      `  Email: ${p.email}`,
      `  Teléfono: ${p.telefono}`,
      ...p.respuestas.map((r) => `  ${r.etiqueta}: ${r.valor}`),
      "",
    ]),
    opts.factura
      ? `Facturación con RUT: ${opts.factura.rut} · ${opts.factura.razonSocial} (${opts.factura.email})`
      : "",
    "",
    `Ver el envío en el panel: ${opts.linkAdmin}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: asuntoSeguro(`Datos de pasajeros · ${referencia} · ${plural}`),
    html: layout({
      heading: `Datos de pasajeros · ${referencia}`,
      kicker: "Nuevo envío",
      bodyHtml: body,
      preheader: `${plural} · ${referencia}`,
    }),
    text,
  };
}

// ---------------------------------------------------------------------------
// 3 y 4. Pago: aviso inmediato y recordatorio.
// NUNCA llevan número ni CVV - solo titular, emisor y últimos 4.
// ---------------------------------------------------------------------------

export interface AvisoPagoOpts {
  vendedorNombre: string;
  /** Pasajero al que corresponde el pago. Es la identidad del registro. */
  pasajeroNombre?: string | null;
  pasajeroDocumento?: string | null;
  /** Titular impreso en la tarjeta. Puede no ser el pasajero. */
  titular: string;
  emisor?: string | null;
  ultimos4: string;
  expiraAt: Date;
  /** URL de la bóveda en el panel. */
  linkAdmin: string;
  destino?: string | null;
  referencia?: string | null;
}

function tarjetaBox(opts: AvisoPagoOpts): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:6px 0 4px"><tr><td style="padding:8px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fieldRows([
      { label: "Pasajero", value: opts.pasajeroNombre },
      { label: "Documento del pasajero", value: opts.pasajeroDocumento },
      { label: "Titular de la tarjeta", value: opts.titular },
      { label: "Tarjeta", value: `${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}` },
      { label: "Destino", value: opts.destino },
      { label: "Referencia", value: opts.referencia },
      { label: "Disponible hasta", value: fechaLarga(opts.expiraAt) },
    ])}</table>
  </td></tr></table>`;
}

const SIN_DATOS_SENSIBLES =
  "Por seguridad, el número completo y el código de seguridad no viajan por email: se ven una sola vez dentro del panel, con tu sesión iniciada.";

export function avisoPagoEmail(opts: AvisoPagoOpts): Plantilla {
  // El registro se identifica por el PASAJERO. Los pagos viejos (sin
  // pasajeroNombre) caen al titular, que era la identidad de antes.
  const quien = nombrePago({ pasajeroNombre: opts.pasajeroNombre, titular: opts.titular });
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.vendedorNombre)}</strong>, se cargaron datos de pago de <strong>${escapeHtml(quien)}</strong> en tu link.`)}
    ${tarjetaBox(opts)}
    ${P(
      `Los datos quedan disponibles hasta el <strong>${escapeHtml(
        fechaLarga(opts.expiraAt),
      )}</strong> · ${TEXTO_HORAS_BOVEDA}. Después se borran solos y no hay forma de recuperarlos.`,
    )}
    <p style="margin:20px 0 0">${ctaButton(opts.linkAdmin, "Abrir la bóveda")}</p>
    ${PMUTED(SIN_DATOS_SENSIBLES)}`;

  return {
    subject: asuntoSeguro(`Datos de pago cargados · ${quien} · •••• ${opts.ultimos4}`),
    html: layout({
      heading: `Datos de pago de ${quien}`,
      kicker: "Bóveda de pagos",
      bodyHtml: body,
      preheader: `${quien} · ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
    }),
    text: [
      `Hola ${opts.vendedorNombre},`,
      "",
      `Se cargaron datos de pago de ${quien} en tu link.`,
      opts.pasajeroNombre ? `Pasajero: ${opts.pasajeroNombre}` : "",
      `Titular de la tarjeta: ${opts.titular}`,
      `Tarjeta: ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
      opts.destino ? `Destino: ${opts.destino}` : "",
      opts.referencia ? `Referencia: ${opts.referencia}` : "",
      `Disponible hasta: ${fechaLarga(opts.expiraAt)} (${TEXTO_HORAS_BOVEDA}).`,
      "",
      `Abrir la bóveda: ${opts.linkAdmin}`,
      "",
      SIN_DATOS_SENSIBLES,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * Recordatorio 24 h antes de la purga. La agenda la maneja otro módulo (se
 * programa contra Resend y se guarda el id en DatosPagoCifrado.recordatorioResendId);
 * acá solo vive la plantilla.
 */
export function recordatorioPagoEmail(opts: AvisoPagoOpts): Plantilla {
  const body = `
    ${P(
      `Hola <strong>${escapeHtml(opts.vendedorNombre)}</strong>, te queda <strong>1 día</strong> para usar estos datos de pago.`,
    )}
    ${tarjetaBox(opts)}
    ${P(
      `Después del <strong>${escapeHtml(
        fechaLarga(opts.expiraAt),
      )}</strong> se borran automáticamente. Si todavía los necesitás, gestionalos hoy o pedile al pasajero que los cargue de nuevo.`,
    )}
    <p style="margin:20px 0 0">${ctaButton(opts.linkAdmin, "Abrir la bóveda")}</p>
    ${PMUTED(SIN_DATOS_SENSIBLES)}`;

  const quien = nombrePago({ pasajeroNombre: opts.pasajeroNombre, titular: opts.titular });

  return {
    subject: asuntoSeguro(`Te queda 1 día · datos de pago de ${quien} (•••• ${opts.ultimos4})`),
    html: layout({
      heading: `Los datos de pago de ${quien} vencen mañana`,
      kicker: "Bóveda de pagos",
      bodyHtml: body,
      preheader: `Vencen el ${fechaLarga(opts.expiraAt)}`,
    }),
    text: [
      `Hola ${opts.vendedorNombre},`,
      "",
      `Te queda 1 día para usar los datos de pago de ${quien}.`,
      opts.pasajeroNombre ? `Pasajero: ${opts.pasajeroNombre}` : "",
      `Titular de la tarjeta: ${opts.titular}`,
      `Tarjeta: ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
      `Se borran el ${fechaLarga(opts.expiraAt)}.`,
      "",
      `Abrir la bóveda: ${opts.linkAdmin}`,
      "",
      SIN_DATOS_SENSIBLES,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 5. Envío a Administración - la ÚNICA plantilla que lleva la tarjeta entera.
//
// Por qué acá sí van los datos completos, cuando la regla de las otras cuatro
// es la contraria: las otras van al VENDEDOR, que tiene usuario y abre la
// bóveda con su PIN; el email es solo un aviso con link. Administración no
// tiene usuario en el sistema, y el flujo real de la agencia hoy es que el
// vendedor le pasa la tarjeta a mano (WhatsApp, o reenviando el mail). Este
// envío reemplaza ese reenvío manual: mismo contenido, una sola casilla
// configurada por el admin, y auditado en AuditLog con quién y cuándo.
//
// Decisión del cliente del 26/08/2026. No se puede disparar sin sesión de
// vendedor/admin con scope sobre el registro, y no borra la tarjeta: sigue
// viva en la bóveda hasta que se cumplan las HORAS_BOVEDA.
// ---------------------------------------------------------------------------

export interface DatosPagoAdmOpts {
  /** Número de expediente que tipea el vendedor. Va en el asunto. */
  numeroFile: string;
  /** Quién lo mandó (nombre y email del vendedor de la sesión). */
  enviadoPorNombre: string;
  enviadoPorEmail: string;
  pasajeroNombre: string;
  pasajeroDocumento?: string | null;
  titular: string;
  documentoTitular?: string | null;
  emisor?: string | null;
  ultimos4: string;
  numero: string;
  vencimiento: string;
  cvv: string;
  cuotas?: string | null;
  destino?: string | null;
  referencia?: string | null;
  extras?: { etiqueta: string; valor: string }[];
}

/** El número agrupado de a 4 se lee y se tipea mucho mejor. */
function agruparPan(numero: string): string {
  const d = numero.replace(/\D/g, "");
  return d.replace(/(.{4})/g, "$1 ").trim() || numero;
}

export function datosPagoAdmEmail(opts: DatosPagoAdmOpts): Plantilla {
  const filas = fieldRows([
    { label: "Nº de file", value: opts.numeroFile },
    { label: "Pasajero", value: opts.pasajeroNombre },
    { label: "Documento del pasajero", value: opts.pasajeroDocumento },
    { label: "Destino", value: opts.destino },
    { label: "Referencia", value: opts.referencia },
  ]);

  const tarjeta = fieldRows([
    { label: "Titular de la tarjeta", value: opts.titular },
    { label: "Documento del titular", value: opts.documentoTitular },
    { label: "Tarjeta", value: opts.emisor ?? "Tarjeta" },
    { label: "Número", value: agruparPan(opts.numero) },
    { label: "Vencimiento", value: opts.vencimiento },
    { label: "Código de seguridad", value: opts.cvv },
    { label: "Cuotas", value: opts.cuotas },
    ...(opts.extras ?? []).map((e) => ({ label: e.etiqueta, value: e.valor })),
  ]);

  const body = `
    ${P(
      `<strong>${escapeHtml(opts.enviadoPorNombre)}</strong> te manda los datos de pago del file <strong>${escapeHtml(
        opts.numeroFile,
      )}</strong>.`,
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:6px 0 14px"><tr><td style="padding:8px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
    </td></tr></table>
    <div style="font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:${MUTED};font-weight:600;margin:0 0 6px">Tarjeta</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:12px"><tr><td style="padding:8px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tarjeta}</table>
    </td></tr></table>
    ${PMUTED(
      `Procesá el cobro y borrá este email cuando termines. Los datos también se eliminan solos de la bóveda a las ${TEXTO_HORAS_BOVEDA} de cargados. Cualquier duda, respondé y le llega a ${escapeHtml(
        opts.enviadoPorEmail,
      )}.`,
    )}`;

  return {
    sensible: true,
    subject: asuntoSeguro(`Datos de pago · file ${opts.numeroFile} · ${opts.pasajeroNombre}`),
    html: layout({
      heading: `Datos de pago · file ${opts.numeroFile}`,
      kicker: "Administración",
      bodyHtml: body,
      preheader: `${opts.pasajeroNombre} · ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
    }),
    text: [
      `${opts.enviadoPorNombre} te manda los datos de pago del file ${opts.numeroFile}.`,
      "",
      `Nº de file: ${opts.numeroFile}`,
      `Pasajero: ${opts.pasajeroNombre}`,
      opts.pasajeroDocumento ? `Documento del pasajero: ${opts.pasajeroDocumento}` : "",
      opts.destino ? `Destino: ${opts.destino}` : "",
      opts.referencia ? `Referencia: ${opts.referencia}` : "",
      "",
      "TARJETA",
      `Titular: ${opts.titular}`,
      opts.documentoTitular ? `Documento del titular: ${opts.documentoTitular}` : "",
      `Tarjeta: ${opts.emisor ?? "Tarjeta"}`,
      `Número: ${agruparPan(opts.numero)}`,
      `Vencimiento: ${opts.vencimiento}`,
      `Código de seguridad: ${opts.cvv}`,
      opts.cuotas ? `Cuotas: ${opts.cuotas}` : "",
      ...(opts.extras ?? []).map((e) => `${e.etiqueta}: ${e.valor}`),
      "",
      `Enviado por ${opts.enviadoPorNombre} (${opts.enviadoPorEmail}).`,
      `Borrá este email cuando termines de procesar el cobro.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
