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
//
// Auth redirect: if not authenticated, redirect to /login synchronously
// (return null to prevent flash of admin content before redirect completes)
// ---------------------------------------------------------------------------

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AdminBackground } from "@/components/layout/AdminBackground";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Return null while not authenticated to prevent flash of admin content
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          <AdminBackground />
          <div className="relative z-[1] p-7">
            <PageTransitionWrapper>
              {children}
            </PageTransitionWrapper>
          </div>
        </main>
      </div>
    </div>
  );
}
