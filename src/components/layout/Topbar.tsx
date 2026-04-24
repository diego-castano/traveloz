"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/providers/AuthProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { glassMaterials } from "@/components/lib/glass";
import { interactions } from "@/components/lib/animations";
import { ChevronDown, LogOut, User, Search, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/Sidebar";
import { SearchModal } from "@/components/ui/SearchModal";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Breadcrumb generation helper
// Maps pathname segments to Spanish labels for navigation context
// ---------------------------------------------------------------------------

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  paquetes: "Paquetes",
  aereos: "Aereos",
  alojamientos: "Alojamientos",
  traslados: "Traslados",
  circuitos: "Circuitos",
  seguros: "Seguros",
  proveedores: "Proveedores",
  catalogos: "Catalogos",
  perfiles: "Perfiles",
  notificaciones: "Notificaciones",
  reportes: "Reportes",
};

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  // Root path -> Dashboard only
  if (segments.length === 0) {
    return [{ label: "Dashboard" }];
  }

  const items: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  segments.forEach((segment, index) => {
    const label = segmentLabels[segment] ?? "Detalle";
    const isLast = index === segments.length - 1;
    const href = isLast ? undefined : "/" + segments.slice(0, index + 1).join("/");
    items.push({ label, href });
  });

  return items;
}

// ---------------------------------------------------------------------------
// Topbar component
// Source: design.json components.topbar -- 54px height, frosted glass, sheen accent
// ---------------------------------------------------------------------------

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isVendedor, logout } = useAuth();
  const breadcrumbItems = generateBreadcrumbs(pathname);

  const { isMobile, setMobileOpen } = useSidebar();
  const [userOpen, setUserOpen] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const updateUserMenuPosition = () => {
    const rect = userTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setUserMenuPosition({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    if (!userOpen) return;

    updateUserMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (userTriggerRef.current?.contains(target)) return;
      if (userMenuRef.current?.contains(target)) return;
      setUserOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateUserMenuPosition);
    window.addEventListener("scroll", updateUserMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateUserMenuPosition);
      window.removeEventListener("scroll", updateUserMenuPosition, true);
    };
  }, [userOpen]);

  const handleSwitchUser = async () => {
    setUserOpen(false);
    await logout();
    router.push("/login");
  };

  const handleLogout = async () => {
    setUserOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header
      className="sticky top-0 z-[20] flex h-[54px] items-center justify-between px-4 md:px-6"
      style={{
        ...glassMaterials.frosted,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.25)",
      }}
    >
      {/* Left section: Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-white/30 transition-colors md:hidden"
          >
            <Menu className="w-5 h-5 text-neutral-600" />
          </button>
        )}
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Right section: Brand selector + Solo lectura badge + User menu */}
      <div className="flex items-center gap-3">
        {/* ----------------------------------------------------------------- */}
        {/* Global search trigger (Cmd+K)                                      */}
        {/* ----------------------------------------------------------------- */}
        <button
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            )
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-xs">Buscar...</span>
          <kbd className="hidden md:flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-neutral-400 bg-white/50">
            ⌘K
          </kbd>
        </button>

        {/* ----------------------------------------------------------------- */}
        {/* "Solo lectura" badge for VENDEDOR role -- AUTH-06 requirement       */}
        {/* ----------------------------------------------------------------- */}
        {isVendedor && <Badge variant="draft">Solo lectura</Badge>}

        {/* ----------------------------------------------------------------- */}
        {/* User menu dropdown                                                  */}
        {/* ----------------------------------------------------------------- */}
        <button
          ref={userTriggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={userOpen}
          onClick={() => {
            if (userOpen) {
              setUserOpen(false);
              return;
            }
            updateUserMenuPosition();
            setUserOpen(true);
          }}
          className="group flex items-center gap-2 rounded-full border border-hairline bg-white px-2 py-1 shadow-[0_8px_24px_-18px_rgba(17,17,36,0.45)] outline-none transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50"
        >
          <Avatar name={user?.name} size="sm" />
          <span className="hidden text-sm font-medium text-neutral-600 md:block">
            {user?.name}
          </span>
          <ChevronDown
            size={14}
            className={`hidden text-neutral-400 transition-transform md:block ${
              userOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {userOpen && userMenuPosition && (
              <motion.div
                ref={userMenuRef}
                id="topbar-user-menu"
                role="menu"
                {...interactions.dropdownOpen}
                className="fixed min-w-[220px] overflow-hidden rounded-[12px] border border-hairline bg-white p-1.5 shadow-[0_18px_48px_-18px_rgba(17,17,36,0.35)]"
                style={{
                  top: userMenuPosition.top,
                  right: userMenuPosition.right,
                  zIndex: 10000,
                }}
              >
                {/* User info header */}
                <div className="border-b border-hairline bg-neutral-50/70 px-3 py-2.5">
                  <p className="text-sm font-medium text-neutral-700">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-400">{user?.email}</p>
                </div>

                {/* Switch user */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void handleSwitchUser();
                  }}
                  className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-neutral-100 focus:bg-neutral-100"
                >
                  <User size={14} />
                  Cambiar de usuario
                </button>

                {/* Logout */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ------------------------------------------------------------------- */}
      {/* Bottom accent line with sheen-slide animation                        */}
      {/* Source: design.json components.topbar.bottomAccent                    */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="absolute inset-x-0 bottom-0 h-px animate-sheen-slide"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.1) 20%, rgba(59,191,173,0.1) 50%, rgba(139,92,246,0.08) 80%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Global search modal (Cmd+K) */}
      <SearchModal />
    </header>
  );
}
