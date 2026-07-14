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
// (currently: notificaciones_email_*). Content-heavy groups (home, nosotros,
// etc.) don't need it — they're fully seeded up front and rarely gain new
// keys post-deploy.
// ---------------------------------------------------------------------------

export interface SiteSettingBootstrapEntry {
  key: string;
  value: string;
  group: string;
  label: string;
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
];

/** Manifest lookup by group, used by getSettingsByGroup to self-heal missing keys. */
export const SITE_SETTINGS_BOOTSTRAP: Record<string, SiteSettingBootstrapEntry[]> = {
  notificaciones: NOTIFICACIONES_EMAIL_SETTINGS,
};
