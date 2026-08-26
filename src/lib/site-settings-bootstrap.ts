// ---------------------------------------------------------------------------
// Bootstrap manifest for SiteSetting rows that must exist for a group to
// render completely in the backend, even on installations that were seeded
// before a given key was introduced.
//
// prisma/seed-public.ts spreads these entries into its SETTINGS array (single
// source of truth for the initial seed), and getSettingsByGroup upserts any
// manifest key missing from the DB on read — so a newly added key just shows
// up in /backend/web/<group> without anyone having to rerun the seed script
// against an already-deployed database.
//
// Keep this manifest limited to keys that need that self-healing behavior
// (currently: notificaciones_email_* y cotizador_*). Content-heavy groups
// (home, nosotros, etc.) don't need it — they're fully seeded up front and
// rarely gain new keys post-deploy.
// ---------------------------------------------------------------------------

export interface SiteSettingBootstrapEntry {
  key: string;
  value: string;
  group: string;
  label: string;
  /** Rendering hint for SettingsForm ("textarea", "url", …). Defaults to text. */
  type?: string;
}

export const NOTIFICACIONES_EMAIL_SETTINGS: SiteSettingBootstrapEntry[] = [
  {
    key: "notificaciones_email_contacto",
    value: "",
    group: "notificaciones",
    label: "Contacto general — emails que reciben /contact (separá varios con comas)",
  },
  {
    key: "notificaciones_email_corporativo",
    value: "",
    group: "notificaciones",
    label: "Corporativo — emails que reciben /corporativo",
  },
  {
    key: "notificaciones_email_cotizacion",
    value: "",
    group: "notificaciones",
    label: "Cotización — emails que reciben /cotizar",
  },
  {
    key: "notificaciones_email_paquete",
    value: "",
    group: "notificaciones",
    label: "Paquete (detalle) — emails que reciben el formulario de consulta del detalle de paquete",
  },
  {
    key: "notificaciones_email_trabaja",
    value: "",
    group: "notificaciones",
    label: "Trabajá con nosotros (RRHH) — emails que reciben /work-with-us",
  },
  {
    key: "notificaciones_email_newsletter",
    value: "",
    group: "notificaciones",
    label: "Newsletter — emails que reciben cada nueva suscripción al newsletter",
  },
  {
    // Destino del botón "Enviar a ADM" de la bóveda de pagos. SIN default a
    // propósito: vacío = el botón avisa que hay que configurarlo y no manda.
    // Es la única casilla que recibe datos de tarjeta completos.
    key: "notificaciones_email_adm",
    value: "",
    group: "notificaciones",
    label: "Administración (envío de datos de tarjeta)",
  },
];

// ---------------------------------------------------------------------------
// Cotizador — los cinco textos del máster que edita /backend/cotizador/ajustes.
// Espejo exacto de lo que sembró la migración 20260824120000_presupuestos y de
// AJUSTES_DEFAULT en presupuesto.actions.ts: si las tres versiones se separan,
// el vendedor ve un texto en la pantalla y otro en la cotización.
// ---------------------------------------------------------------------------

export const COTIZADOR_SETTINGS: SiteSettingBootstrapEntry[] = [
  {
    key: "cotizador_plantilla_mensaje",
    value: `Hola {nombre}, ¿cómo estás?

Según lo conversado, te envío la cotización solicitada.

En caso de que les interese la propuesta, solicitamos nos completen en el siguiente link la información de cada pasajero tal cual figura en el documento de viaje, y así comenzar el proceso de reserva:
{link}`,
    type: "textarea",
    group: "cotizador",
    label: "Mensaje que acompaña toda cotización (usá {nombre} y {link})",
  },
  {
    key: "cotizador_condiciones",
    value: `Precios en dólares americanos, según la tarifa y ocupación indicadas.
Valores sujetos a disponibilidad y confirmación al momento de la reserva.
Tarifa no incluye gastos personales ni excursiones no detalladas.
Cotización válida por {vigencia} horas.`,
    type: "textarea",
    group: "cotizador",
    label: "Condiciones al pie de la cotización (una por línea; {vigencia} = horas)",
  },
  {
    key: "cotizador_vigencia_default",
    value: "48",
    type: "text",
    group: "cotizador",
    label: "Vigencia por defecto del link, en horas",
  },
  {
    key: "cotizador_email_copia",
    value: "cotizaciones@traveloz.com.uy",
    type: "text",
    group: "cotizador",
    label: "Casilla que recibe copia de cada cotización enviada",
  },
  {
    key: "cotizador_factor_default",
    value: "0.88",
    type: "text",
    group: "cotizador",
    label: "Factor por defecto para el precio de venta (venta = neto ÷ factor)",
  },
];

/** Manifest lookup by group, used by getSettingsByGroup to self-heal missing keys. */
export const SITE_SETTINGS_BOOTSTRAP: Record<string, SiteSettingBootstrapEntry[]> = {
  notificaciones: NOTIFICACIONES_EMAIL_SETTINGS,
  cotizador: COTIZADOR_SETTINGS,
};
