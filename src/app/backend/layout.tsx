"use client";

// ---------------------------------------------------------------------------
// Admin Layout -- Composes all Phase 2 layout components into the admin shell
// Source: design.json patterns.layout
//
// Components composed:
//   - Sidebar: fixed left navigation with role filtering and brand gradient
//   - Topbar: sticky top bar with breadcrumb, brand selector, user menu
//   - AdminBackground: color orbs + SVG noise backdrop
//   - PageTransitionWrapper: AnimatePresence page transitions
//   - SidebarProvider: shared mobile sidebar state for Topbar hamburger
//
// Auth redirect: if not authenticated, redirect to /login synchronously
// (return null to prevent flash of admin content before redirect completes)
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar, SidebarProvider } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AdminBackground } from "@/components/layout/AdminBackground";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { DensityProvider } from "@/components/ui/data/Density";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);

  // /backend/login renders its own self-contained UI -- no Sidebar/Topbar
  // shell, no auth gate (the page itself handles "already authenticated"
  // redirect to /backend/dashboard).
  const isLoginRoute = pathname === "/backend/login";

  // Only redirect once the session is definitively unauthenticated.
  // During "loading" we must stay put, otherwise a hard reload races with
  // hydration and punts the user to /login → / → /dashboard.
  useEffect(() => {
    if (status === "unauthenticated" && !isLoginRoute) {
      router.push("/backend/login");
    }
  }, [status, router, isLoginRoute]);

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

  // Login route bypasses the admin shell entirely.
  if (isLoginRoute) {
    return <div className="font-body antialiased">{children}</div>;
  }

  // Hold render until NextAuth has resolved the session one way or another
  if (status !== "authenticated") {
    return null;
  }

  return (
    <SidebarProvider>
      <DensityProvider>
        <div className="font-body flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main
              ref={mainRef}
              className="relative flex-1 overflow-y-auto"
              style={{ overflowAnchor: "none" }}
            >
              <AdminBackground />
              <div className="relative z-[1] p-4 md:p-7">
                <PageTransitionWrapper>{children}</PageTransitionWrapper>
              </div>
            </main>
          </div>
        </div>
      </DensityProvider>
    </SidebarProvider>
  );
}
