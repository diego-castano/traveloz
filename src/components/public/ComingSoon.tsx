// ---------------------------------------------------------------------------
// Pantalla "Próximamente" del sitio principal.
//
// Se muestra a los visitantes anónimos cuando el modo Coming Soon está activo
// (SiteSetting coming_soon_activo). Los usuarios logueados (equipo) la saltean
// y ven el sitio real, así también funciona el live-preview del admin.
//
// Sin links de navegación: el objetivo es no exponer el sitio todavía.
// ---------------------------------------------------------------------------

export function ComingSoon({
  titulo,
  mensaje,
}: {
  titulo?: string | null;
  mensaje?: string | null;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        background: "linear-gradient(160deg,#0d0d1a 0%,#1a1a2e 60%,#2a1a3e 100%)",
        color: "#fff",
      }}
    >
      {/* Logo del template (asset estático). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/header-logo.webp"
        alt="TravelOz"
        style={{ height: 54, width: "auto", marginBottom: 36, filter: "brightness(0) invert(1)" }}
      />
      <h1
        style={{
          fontSize: "clamp(32px,6vw,56px)",
          fontWeight: 700,
          margin: "0 0 16px",
          letterSpacing: "-0.02em",
        }}
      >
        {titulo?.trim() || "Muy pronto"}
      </h1>
      <p
        style={{
          maxWidth: 480,
          fontSize: 17,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.72)",
          margin: 0,
        }}
      >
        {mensaje?.trim() ||
          "Estamos preparando algo grande para que viajes mejor. Volvé en unos días."}
      </p>
      <div
        style={{
          marginTop: 40,
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        TravelOz · Uruguay
      </div>
    </main>
  );
}
