// ---------------------------------------------------------------------------
// Emails de los formularios de datos (pasajeros y pago).
//
// Cuatro plantillas:
//   1. solicitudDatosEmail   → al pasajero: "completá tus datos acá".
//   2. envioPasajerosEmail   → al vendedor: el grupo completo que llegó.
//   3. avisoPagoEmail        → al vendedor: AVISO de que hay tarjeta cargada.
//   4. recordatorioPagoEmail → al vendedor: le queda 1 día antes de la purga.
//
// REGLA DURA de las plantillas de pago: el número de tarjeta, el CVV y el
// documento del titular NUNCA salen por email. Solo viajan titular, emisor y
// los últimos 4 - lo mismo que queda en claro en la DB. Para ver el resto hay
// que entrar al panel con sesión.
//
// El marco visual replica el `brandedLayout` de email.ts (que no está
// exportado) siguiendo el mismo camino que cotizador-email.ts: HTML armado
// localmente, inline-CSS email-safe, tablas de 560px. Si algún día se exporta
// brandedLayout, estas cuatro plantillas se pueden colgar de él sin tocar sus
// firmas.
// ---------------------------------------------------------------------------

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

export interface Plantilla {
  subject: string;
  html: string;
  text: string;
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
  const wa = (opts.vendedor.whatsapp ?? "").replace(/[^\d]/g, "");
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
            "El formulario es seguro: los datos de la tarjeta se guardan cifrados y se eliminan automáticamente a las 72 horas.",
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
  nombres: string;
  apellidos: string;
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

export function envioPasajerosEmail(opts: {
  vendedorNombre: string;
  pasajeros: PasajeroEmail[];
  destino: string;
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
        { label: "Documento", value: p.documento },
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
              `${p.nombres} ${p.apellidos}`,
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

  const text = [
    `Datos de ${plural} · ${opts.destino}`,
    opts.referencia ? `Referencia: ${opts.referencia}` : "",
    opts.fecha ? `Recibido: ${opts.fecha}` : "",
    "",
    ...opts.pasajeros.flatMap((p, i) => [
      `· Pasajero ${i + 1}: ${p.nombres} ${p.apellidos}`,
      `  Documento: ${p.documento}`,
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
    subject: `Datos de pasajeros · ${opts.destino} · ${plural}`,
    html: layout({
      heading: `Datos de pasajeros · ${opts.destino}`,
      kicker: "Nuevo envío",
      bodyHtml: body,
      preheader: `${plural} para ${opts.destino}`,
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
      { label: "Titular", value: opts.titular },
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
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.vendedorNombre)}</strong>, se cargaron datos de pago en tu link.`)}
    ${tarjetaBox(opts)}
    ${P(
      `Los datos quedan disponibles hasta el <strong>${escapeHtml(
        fechaLarga(opts.expiraAt),
      )}</strong> · 72 horas. Después se borran solos y no hay forma de recuperarlos.`,
    )}
    <p style="margin:20px 0 0">${ctaButton(opts.linkAdmin, "Abrir la bóveda")}</p>
    ${PMUTED(SIN_DATOS_SENSIBLES)}`;

  return {
    subject: `Datos de pago cargados · ${opts.titular} · •••• ${opts.ultimos4}`,
    html: layout({
      heading: "Tenés datos de pago para gestionar",
      kicker: "Bóveda de pagos",
      bodyHtml: body,
      preheader: `${opts.titular} · ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
    }),
    text: [
      `Hola ${opts.vendedorNombre},`,
      "",
      "Se cargaron datos de pago en tu link.",
      `Titular: ${opts.titular}`,
      `Tarjeta: ${opts.emisor ?? "Tarjeta"} •••• ${opts.ultimos4}`,
      opts.destino ? `Destino: ${opts.destino}` : "",
      opts.referencia ? `Referencia: ${opts.referencia}` : "",
      `Disponible hasta: ${fechaLarga(opts.expiraAt)} (72 horas).`,
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

  return {
    subject: `Te queda 1 día · datos de pago de ${opts.titular} (•••• ${opts.ultimos4})`,
    html: layout({
      heading: "Estos datos de pago vencen mañana",
      kicker: "Bóveda de pagos",
      bodyHtml: body,
      preheader: `Vencen el ${fechaLarga(opts.expiraAt)}`,
    }),
    text: [
      `Hola ${opts.vendedorNombre},`,
      "",
      "Te queda 1 día para usar estos datos de pago.",
      `Titular: ${opts.titular}`,
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
