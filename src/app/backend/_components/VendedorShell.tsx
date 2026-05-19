"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { interactions } from "@/components/lib/animations";

/**
 * Vendor-only shell — no sidebar, no breadcrumb, no command palette.
 * Mirrors the mockup at /mockups/vendedor.html: full-width container with a
 * sticky frosted topbar that carries only the logo, the "VENDEDORES" label
 * and the user pill (with a dropdown for switch-user / logout).
 *
 * The vendor never navigates to other modules, so collapsing the chrome
 * keeps the focus on the package table where the actual work happens.
 */
export function VendedorShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "V";

  function updateMenuPos() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
  }

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/backend/login");
  }

  return (
    <div className="font-body flex min-h-screen flex-col bg-[#F7F8FA]">
      {/* ─── Topbar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-[#E8EAEE]"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.webp" alt="TravelOz" className="h-8 w-auto" />
          <p className="m-0 text-[13px] font-medium tracking-wide text-neutral-500">
            VENDEDORES
          </p>

          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              if (menuOpen) {
                setMenuOpen(false);
                return;
              }
              updateMenuPos();
              setMenuOpen(true);
            }}
            className="ml-auto flex items-center gap-2 rounded-full bg-[#F5F3FF] px-3 py-1.5 text-[12px] font-semibold text-[#8B5CF6] transition hover:bg-[#EDE9FE]"
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#8B5CF6] text-[10px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden sm:inline">{user?.name ?? "Vendedor"}</span>
            <ChevronDown
              size={12}
              className={`text-[#8B5CF6]/70 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </header>

      {/* ─── Main container ─────────────────────────────────── */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8 pb-32">
          {children}
        </div>
      </main>

      {/* ─── User menu portal ───────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {menuOpen && menuPos && (
              <motion.div
                ref={menuRef}
                role="menu"
                {...interactions.dropdownOpen}
                className="fixed min-w-[220px] overflow-hidden rounded-[12px] border border-[#E8EAEE] bg-white p-1.5 shadow-[0_18px_48px_-18px_rgba(17,17,36,0.35)]"
                style={{ top: menuPos.top, right: menuPos.right, zIndex: 10000 }}
              >
                <div className="border-b border-[#E8EAEE] bg-neutral-50/70 px-3 py-2.5">
                  <p className="text-sm font-medium text-neutral-700">{user?.name}</p>
                  <p className="text-xs text-neutral-400">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-100"
                >
                  <User size={14} />
                  Cambiar de usuario
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
