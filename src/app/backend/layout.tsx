// Server Component layout. Mounts the admin shell (client) and the
// CacheWarmer (server) so unstable_cache buckets for paquetes / servicios /
// catálogos start warming up the moment any /backend/* page is requested,
// before the client-side providers fire their own fetches.

import type { ReactNode } from "react";
import { AdminShell } from "./_components/AdminShell";
import CacheWarmer from "./_components/CacheWarmer";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Fire-and-forget cache pre-warm — renders nothing visible. */}
      <CacheWarmer />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
