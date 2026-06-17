// ---------------------------------------------------------------------------
// Layout del route group (landing) — cotizadores por marca.
//
// Aislado a propósito: NO carga el header/footer del sitio principal ni links
// de navegación. El branding y el footer mínimo los pone cada landing. Así,
// mientras el sitio de TravelOz está en "Próximamente", estos landings se
// pueden usar sin que el visitante salga a otra parte del sitio.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  // Los landings no deben indexarse mientras se prueban.
  robots: { index: false, follow: false },
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-neutral-900">{children}</div>;
}
