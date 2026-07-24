import type { Metadata } from "next";
import Providers from "@/components/providers/Providers";
import { getBaseUrl } from "@/lib/seo";
import "./globals.css";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
// `metadataBase` (desde APP_URL, con fallback al dominio actual) resuelve las
// URLs relativas (canonical, og:image, og:url) de cualquier ruta que no
// declare la suya. Las páginas públicas la fijan igual vía buildSeoMetadata;
// esto cubre el resto del árbol. El título/descripción de acá son el fallback
// del backend (que además va noindex).
export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "TravelOz Admin",
  description: "Panel de administracion TravelOz",
};

// ---------------------------------------------------------------------------
// Root Layout (server component -- providers are composed via client wrapper)
// ---------------------------------------------------------------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Root <body> stays unstyled. Each route group sets its own typography:
          - /backend wraps children in font-body (DM Sans) + admin shell.
          - /(public) loads site.css which sets body { font-family: Clarika }. */}
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
