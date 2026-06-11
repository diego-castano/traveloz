"use client";

import { useEffect } from "react";

/**
 * Último recurso: se renderiza si crashea el RootLayout (donde error.tsx ya
 * no alcanza). Debe declarar su propio <html>/<body> y no depender de ningún
 * provider ni CSS del layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
          <h2 style={{ fontSize: 18, margin: "0 0 8px", color: "#262626" }}>
            Error del sistema
          </h2>
          <p style={{ fontSize: 14, color: "#737373", margin: "0 0 24px" }}>
            Ocurrió un error inesperado. Por favor, intentá de nuevo.
            {error.digest ? (
              <span
                style={{
                  display: "block",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#a3a3a3",
                }}
              >
                Ref: {error.digest}
              </span>
            ) : null}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#171717",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
