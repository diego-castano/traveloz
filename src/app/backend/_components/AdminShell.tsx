"use client";

/**
 * Client shell for the admin layout — extracted from the original
 * `backend/layout.tsx` so the layout itself can be a Server Component and
 * mount the `<CacheWarmer />` server-only sibling. The shell keeps every
 * client behaviour the layout had before: auth gate, scroll reset, sidebar
 * provider, page transition wrapper.
 */

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar, SidebarProvider } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AdminBackground } from "@/components/layout/AdminBackground";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { DensityProvider } from "@/components/ui/data/Density";
import { useAuth } from "@/components/providers/AuthProvider";
import { esRutaCotizador } from "../cotizador/tipos";
import { VendedorShell } from "./VendedorShell";
import { PrimerLoginGate } from "./PrimerLoginGate";

export function AdminShell({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession();
  const { isVendedor } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);

  // Public backend routes render their own self-contained UI — no Sidebar/
  // Topbar shell, no auth gate. These match the middleware allow-list.
  const isPublicBackendRoute =
    pathname === "/backend/login" ||
    pathname === "/backend/forgot-password" ||
    pathname === "/backend/reset-password";

  // El cotizador es una herramienta a pantalla completa: trae su propio fondo,
  // su propia barra y overlays `position:fixed` (drawers, modales, la hoja de
  // impresión). Va sin el padding del shell, sin el AdminBackground y —clave—
  // sin PageTransitionWrapper: ese motion.div deja `filter:blur(0px)` puesto,
  // y un filtro en un ancestro convierte a los `fixed` en absolutos.
  const esCotizador = esRutaCotizador(pathname);

  // Only redirect once the session is definitively unauthenticated.
  // During "loading" we must stay put, otherwise a hard reload races with
  // hydration and punts the user to /login → / → /dashboard.
  useEffect(() => {
    if (status === "unauthenticated" && !isPublicBackendRoute) {
      router.push("/backend/login");
    }
  }, [status, router, isPublicBackendRoute]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    // Reset multiple times to beat browser scroll anchoring and route transition timing.
    const reset = () => {
      main.scrollTo({ top: 0, left: 0, behavior: "auto" });
      main.scrollTop = 0;
      main.scrollLeft = 0;
    };

    reset();
    const frame1 = requestAnimationFrame(reset);
    const frame2 = requestAnimationFrame(() => requestAnimationFrame(reset));
    const timer1 = window.setTimeout(reset, 50);
    const timer2 = window.setTimeout(reset, 200);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, [pathname]);

  // Public routes (login / forgot-password / reset-password) bypass the
  // admin shell entirely.
  if (isPublicBackendRoute) {
    return <div className="font-body antialiased">{children}</div>;
  }

  // Hold render until NextAuth has resolved the session one way or another
  if (status !== "authenticated") {
    return null;
  }

  // Primer ingreso: entró con la contraseña temporal que le pasó un admin y
  // todavía no eligió qué hacer. Hasta que resuelva no ve nada del panel —
  // ni el shell de admin ni el de vendedor. El propio gate apaga el flag (en
  // la DB y en el JWT vía update()), y en cuanto el token vuelve con
  // mustChangePassword=false esta condición deja de cumplirse y el panel
  // aparece sin recargar. Las rutas públicas del backend (login /
  // forgot-password / reset-password) ya retornaron más arriba.
  if (session?.user?.mustChangePassword === true) {
    return <PrimerLoginGate />;
  }

  // VENDEDOR role bypasses the admin chrome (sidebar + breadcrumb + command
  // palette) entirely. The vendor only ever lands on the dashboard table and
  // the mockup at /mockups/vendedor.html is the spec — no other navigation
  // means no need for the broader admin shell.
  if (isVendedor) {
    return (
      <DensityProvider>
        <VendedorShell>{children}</VendedorShell>
      </DensityProvider>
    );
  }

  return (
    <SidebarProvider>
      <DensityProvider>
        <div className="font-body flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
            <Topbar />
            <main
              ref={mainRef}
              className="relative flex-1 overflow-y-auto print:static print:overflow-visible"
              style={{ overflowAnchor: "none" }}
            >
              {esCotizador ? (
                children
              ) : (
                <>
                  <AdminBackground />
                  <div className="relative z-[1] p-4 md:p-7">
                    <PageTransitionWrapper>{children}</PageTransitionWrapper>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </DensityProvider>
    </SidebarProvider>
  );
}
