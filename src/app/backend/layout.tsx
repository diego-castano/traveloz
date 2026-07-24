// Server Component layout. Mounts the admin shell (client) and the
// CacheWarmer (server) so unstable_cache buckets for paquetes / servicios /
// catálogos start warming up the moment any /backend/* page is requested,
// before the client-side providers fire their own fetches.

import type { ReactNode } from "react";
import { AdminShell } from "./_components/AdminShell";
import CacheWarmer from "./_components/CacheWarmer";
import { VersionWatcher } from "./_components/VersionWatcher";

// El panel de administración y su login (/backend, /backend/login, …) nunca
// deben indexarse. robots.txt ya los bloquea, pero el meta noindex es la
// segunda barrera: cubre el caso de que una URL de /backend se enlace o filtre
// igual. Se hereda a todas las rutas hijas del grupo.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Fire-and-forget cache pre-warm — renders nothing visible. */}
      <CacheWarmer />
      {/* Avisa (sin interrumpir) cuando hay un deploy nuevo. */}
      <VersionWatcher />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
