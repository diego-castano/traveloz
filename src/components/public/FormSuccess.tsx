"use client";

// ---------------------------------------------------------------------------
// FormSuccess — tarjeta de confirmación que reemplaza al formulario tras un
// envío exitoso (en vez de dejar el form relleno con un mensajito abajo, que
// confundía y —en el form de paquete, sin botón deshabilitado— dejaba mandar
// varios leads). Un solo look para todos los forms públicos, con dos variantes
// según el fondo donde vive:
//   - "onGradient": sobre el degradado violeta (cotizar / contacto). Panel
//     translúcido, texto y check blancos.
//   - "onLight":    sobre fondo claro o tarjeta blanca (corporativo / sidebar
//     de paquete). Panel claro con acento coral, texto oscuro.
// El check se dibuja con una animación de stroke (respeta prefers-reduced-motion).
// Estilos en site.css → `.form-success`.
// ---------------------------------------------------------------------------

export function FormSuccess({
  variant = "onLight",
  title = "¡Consulta enviada!",
  text = "Gracias por escribirnos. Te vamos a contactar a la brevedad.",
  compact = false,
  accent = "coral",
}: {
  variant?: "onGradient" | "onLight";
  title?: string;
  text?: string;
  /** Versión más chica, para espacios reducidos (ej. sidebar del paquete). */
  compact?: boolean;
  /** Color del check en la variante onLight. Por defecto coral (marca);
   *  "violet" para páginas de línea violeta (ej. corporativo). */
  accent?: "coral" | "violet";
}) {
  return (
    <div
      className={`form-success form-success--${variant}${
        compact ? " form-success--compact" : ""
      }${accent === "violet" ? " form-success--accentViolet" : ""}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="form-success__check"
        viewBox="0 0 52 52"
        aria-hidden="true"
      >
        <circle
          className="form-success__circle"
          cx="26"
          cy="26"
          r="24"
          fill="none"
        />
        <path
          className="form-success__tick"
          fill="none"
          d="M14 27 l8 8 l16 -18"
        />
      </svg>
      <h3 className="form-success__title">{title}</h3>
      <p className="form-success__text">{text}</p>
    </div>
  );
}
