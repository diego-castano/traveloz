import type { Metadata } from "next";
import Providers from "@/components/providers/Providers";
import "./globals.css";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
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
