// Emails de Traveloz Collection: HTML con tablas (600 px), texto plano
// aparte. Sin dependencias de red. Estética del mockup: header azul noche con
// el wordmark en texto, tinta oscura, acentos dorados, serif para los títulos.

export const FROM_COLLECTION = "Traveloz Collection <notificaciones@app.traveloz.com.uy>";
export const SITIO_COLLECTION = "https://collection.traveloz.com.uy";

const NAVY = "#04071F";
const INK = "#32373B";
const SLATE = "#4A5859";
const GOLD = "#F4B860";
const LINE = "#DCDCDC";
const BASE = "#F0F0F0";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface Dato {
  etiqueta: string;
  valor: string;
}

interface Salida {
  subject: string;
  html: string;
  text: string;
}

function boton(url: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${INK}" style="background:${INK};border-radius:2px"><a href="${esc(url)}" style="display:inline-block;padding:16px 28px;font:600 13px/1 ${SANS};letter-spacing:0.12em;text-transform:uppercase;color:${BASE};text-decoration:none">${esc(texto)}</a></td></tr></table>`;
}

function botonSecundario(url: string, texto: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;padding:14px 22px;border:1px solid ${INK};border-radius:2px;font:600 12px/1 ${SANS};letter-spacing:0.12em;text-transform:uppercase;color:${INK};text-decoration:none">${esc(texto)}</a>`;
}

function eyebrow(texto: string): string {
  return `<span style="display:inline-block;width:24px;height:1px;background:${GOLD};vertical-align:middle;margin-right:12px"></span><span style="font:600 12px/16px ${SANS};letter-spacing:0.12em;text-transform:uppercase;color:${SLATE};vertical-align:middle">${esc(texto)}</span>`;
}

function titulo(texto: string): string {
  return `<h1 style="margin:16px 0 0;font:400 32px/38px ${SERIF};color:${INK}">${esc(texto)}</h1>`;
}

function parrafo(texto: string): string {
  return `<p style="margin:16px 0 0;font:400 16px/26px ${SANS};color:${SLATE}">${esc(texto)}</p>`;
}

function tablaDatos(datos: Dato[]): string {
  const filas = datos
    .filter((d) => d.valor.trim())
    .map(
      (d) =>
        `<tr><td width="150" valign="top" style="padding:12px 0;border-bottom:1px solid ${LINE};font:600 12px/22px ${SANS};letter-spacing:0.12em;text-transform:uppercase;color:${SLATE}">${esc(d.etiqueta)}</td><td valign="top" style="padding:12px 0 12px 16px;border-bottom:1px solid ${LINE};font:400 15px/22px ${SANS};color:${INK}">${esc(d.valor).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filas}</table>`;
}

function marco(opts: { preheader: string; cuerpo: string; pie: string }): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"></head>
<body style="margin:0;padding:0;background:${BASE}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BASE}">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BASE}" style="background:${BASE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:600px;background:#FFFFFF">
<tr><td align="center" bgcolor="${NAVY}" style="background:${NAVY};padding:28px 32px"><span style="font:300 18px/1 ${SANS};letter-spacing:0.02em;color:#DCDCDC">traveloz</span> <span style="font:italic 400 22px/1 ${SERIF};color:#FFFFFF">collection</span></td></tr>
<tr><td style="padding:40px 40px 32px">${opts.cuerpo}</td></tr>
<tr><td bgcolor="${NAVY}" style="background:${NAVY};padding:24px 40px;font:400 13px/20px ${SANS};color:#DCDCDC">${opts.pie}</td></tr>
</table></td></tr></table></body></html>`;
}

const enlacePie = (url: string, texto: string) =>
  `<a href="${esc(url)}" style="color:#DCDCDC;text-decoration:underline">${esc(texto)}</a>`;

// ---------------------------------------------------------------------------
// EM02: confirmación al viajero
// ---------------------------------------------------------------------------
export function emailConfirmacionConsulta(o: {
  nombre: string;
  numero: string;
  /** "Tu especialista en Asia" si hay; si no, el equipo. */
  especialista?: { nombre: string; fotoUrl?: string | null; whatsappUrl?: string | null } | null;
  resumen: Dato[];
  horario: string;
}): Salida {
  const primero = o.nombre.trim().split(/\s+/)[0] || o.nombre;
  const quien = o.especialista ? o.especialista.nombre : "Tu especialista de Traveloz Collection";
  const pasos = [
    `${quien} lee tu consulta y piensa la propuesta a tu medida.`,
    "Te escribe por el canal que elegiste para afinar los detalles.",
    "Te enviamos una propuesta con el recorrido, los hoteles y el presupuesto.",
  ];
  const listaPasos = pasos
    .map(
      (p, i) =>
        `<tr><td width="36" valign="top" style="padding:12px 0;border-top:1px solid ${LINE};font:400 20px/24px ${SERIF};color:${INK}">0${i + 1}</td><td style="padding:12px 0;border-top:1px solid ${LINE};font:400 15px/24px ${SANS};color:${SLATE}">${esc(p)}</td></tr>`,
    )
    .join("");
  const foto = o.especialista?.fotoUrl
    ? `<td width="72" valign="middle" style="padding-right:16px"><img src="${esc(o.especialista.fotoUrl)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:50%;object-fit:cover"></td>`
    : "";
  const bloqueEspecialista = o.especialista
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px"><tr>${foto}<td valign="middle"><div style="font:400 20px/26px ${SERIF};color:${INK}">${esc(o.especialista.nombre)}</div><div style="font:400 14px/20px ${SANS};color:${SLATE}">Equipo Traveloz Collection</div></td></tr></table>`
    : "";
  const cta = o.especialista?.whatsappUrl
    ? `<div style="margin-top:28px">${boton(o.especialista.whatsappUrl, "Escribir a tu especialista")}</div>`
    : "";

  const cuerpo = `${eyebrow(`Consulta ${o.numero}`)}
${titulo(`Gracias, ${primero}. Ya estamos pensando tu viaje.`)}
${parrafo(`Recibimos tu consulta. ${o.especialista ? `${o.especialista.nombre} te` : "Un especialista te"} escribe a la brevedad (${o.horario || "en horario de oficina"}). Esto es lo que nos contaste.`)}
<div style="margin-top:24px;background:${BASE};padding:8px 20px">${tablaDatos(o.resumen)}</div>
<div style="margin-top:36px;font:400 22px/28px ${SERIF};color:${INK}">Lo que sigue</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">${listaPasos}</table>
${bloqueEspecialista}${cta}
<p style="margin:24px 0 0;font:400 14px/22px ${SANS};color:${SLATE}">¿Querés cambiar algo? Respondé este email y le llega directo al equipo.</p>`;

  const pie = `<div>Montevideo${o.horario ? ` · ${esc(o.horario)}` : ""}</div><div style="margin-top:8px">Recibís este email porque hiciste una consulta en collection.traveloz.com.uy. ¿No fuiste vos? Avisanos respondiendo este mensaje.</div>`;

  const text = [
    `Consulta ${o.numero}`,
    "",
    `Gracias, ${primero}. Ya estamos pensando tu viaje.`,
    `${o.especialista ? o.especialista.nombre : "Un especialista de Traveloz Collection"} te escribe a la brevedad${o.horario ? ` (${o.horario})` : ""}.`,
    "",
    ...o.resumen.filter((d) => d.valor.trim()).map((d) => `${d.etiqueta}: ${d.valor}`),
    "",
    "Lo que sigue:",
    ...pasos.map((p, i) => `0${i + 1}. ${p}`),
    ...(o.especialista?.whatsappUrl ? ["", `Escribir a tu especialista: ${o.especialista.whatsappUrl}`] : []),
    "",
    "¿Querés cambiar algo? Respondé este email y le llega directo al equipo.",
  ].join("\n");

  return {
    subject: `Recibimos tu consulta ${o.numero}`,
    html: marco({ preheader: `Consulta ${o.numero}: ya estamos pensando tu viaje.`, cuerpo, pie }),
    text,
  };
}

// ---------------------------------------------------------------------------
// EM05: aviso interno
// ---------------------------------------------------------------------------
export function emailAvisoConsulta(o: {
  numero: string;
  nombre: string;
  /** Experiencia consultada o "Contactanos". */
  origen: string;
  datos: Dato[];
  mensaje: string;
  mailtoUrl: string;
  whatsappUrl?: string | null;
  panelUrl: string;
  crmTexto?: string;
}): Salida {
  const botones = [
    botonSecundario(o.mailtoUrl, "Responder por email"),
    o.whatsappUrl ? botonSecundario(o.whatsappUrl, "Responder por WhatsApp") : "",
  ]
    .filter(Boolean)
    .join(" &nbsp; ");
  const mensaje = o.mensaje.trim()
    ? `<div style="margin-top:24px"><div style="font:600 12px/16px ${SANS};letter-spacing:0.12em;text-transform:uppercase;color:${SLATE}">Mensaje</div><p style="margin:8px 0 0;font:400 15px/24px ${SANS};color:${INK}">${esc(o.mensaje).replace(/\n/g, "<br>")}</p></div>`
    : "";

  const cuerpo = `${eyebrow(`Nueva consulta ${o.numero}`)}
${titulo(`${o.nombre} consultó por ${o.origen}`)}
<div style="margin-top:24px">${tablaDatos(o.datos)}</div>
${mensaje}
<div style="margin-top:28px">${botones}</div>
<p style="margin:20px 0 0;font:400 14px/22px ${SANS};color:${SLATE}"><a href="${esc(o.panelUrl)}" style="color:${INK}">Abrir en el panel de Collection</a>${o.crmTexto ? ` · ${esc(o.crmTexto)}` : ""}</p>`;
  const pie = `<div>Aviso interno de Traveloz Collection. Respondé a la persona antes de que termine el día hábil.</div>`;

  const text = [
    `Nueva consulta ${o.numero}: ${o.nombre} consultó por ${o.origen}`,
    "",
    ...o.datos.filter((d) => d.valor.trim()).map((d) => `${d.etiqueta}: ${d.valor}`),
    ...(o.mensaje.trim() ? ["", "Mensaje:", o.mensaje.trim()] : []),
    "",
    `Responder por email: ${o.mailtoUrl}`,
    ...(o.whatsappUrl ? [`Responder por WhatsApp: ${o.whatsappUrl}`] : []),
    `Panel: ${o.panelUrl}`,
  ].join("\n");

  return {
    subject: `Nueva consulta ${o.numero}: ${o.nombre} · ${o.origen}`,
    html: marco({ preheader: `${o.nombre} · ${o.origen}`, cuerpo, pie }),
    text,
  };
}

// ---------------------------------------------------------------------------
// EM03: confirmar newsletter (doble opt-in)
// ---------------------------------------------------------------------------
export function emailConfirmarNewsletter(o: { confirmUrl: string; bajaUrl: string }): Salida & {
  unsubscribeUrl: string;
} {
  const cuerpo = `${eyebrow("Newsletter")}
${titulo("Un paso más.")}
${parrafo("Confirmá tu email y empezás a recibir una carta por mes: un destino, un relato y una idea para tu próximo viaje.")}
<div style="margin-top:28px">${boton(o.confirmUrl, "Confirmar suscripción")}</div>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${LINE};font:400 13px/20px ${SANS};color:${SLATE}">Si no te suscribiste, ignorá este mensaje y no te escribimos más.</p>`;
  const pie = `<div>Montevideo · Una marca de Traveloz · ${enlacePie(o.bajaUrl, "Darte de baja")}</div>`;
  return {
    subject: "Un paso más para recibir Collection",
    html: marco({ preheader: "Confirmá tu email para recibir la carta mensual.", cuerpo, pie }),
    text: `Un paso más.\n\nConfirmá tu email y empezás a recibir una carta por mes de Traveloz Collection.\n\nConfirmar suscripción: ${o.confirmUrl}\n\nSi no te suscribiste, ignorá este mensaje.\n\nDarte de baja: ${o.bajaUrl}`,
    unsubscribeUrl: o.bajaUrl,
  };
}
