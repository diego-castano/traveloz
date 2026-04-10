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
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
