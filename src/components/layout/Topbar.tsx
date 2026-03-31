"use client";

import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { glassMaterials } from "@/components/lib/glass";
import { interactions } from "@/components/lib/animations";
import { ChevronDown, LogOut, User, Building2, Check, Search, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/Sidebar";
import { SearchModal } from "@/components/ui/SearchModal";
import { useState } from "react";

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
  const { user, isVendedor, logout } = useAuth();
  const { activeBrand, activeBrandId, brands, switchBrand } = useBrand();
  const breadcrumbItems = generateBreadcrumbs(pathname);

  const { isMobile, setMobileOpen } = useSidebar();
  const [brandOpen, setBrandOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

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
        {/* Brand selector dropdown (Radix DropdownMenu)                       */}
        {/* ----------------------------------------------------------------- */}
        <DropdownMenu.Root open={brandOpen} onOpenChange={setBrandOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-white/30"
              style={{
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <Building2 size={14} className="text-neutral-500" />
              {activeBrand.name}
              <ChevronDown
                size={12}
                className="text-neutral-400 transition-transform data-[state=open]:rotate-180"
              />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              forceMount
              sideOffset={8}
              align="end"
              asChild
            >
              <AnimatePresence>
                {brandOpen && (
                  <motion.div
                    {...interactions.dropdownOpen}
                    className="min-w-[180px] rounded-xl p-1.5 shadow-elevation-16"
                    style={{
                      ...glassMaterials.frosted,
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    }}
                  >
                    {brands.map((brand) => (
                      <DropdownMenu.Item
                        key={brand.id}
                        onSelect={() => switchBrand(brand.id)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[rgba(59,191,173,0.06)]"
                      >
                        <span className="flex-1 text-neutral-700">
                          {brand.name}
                        </span>
                        {brand.id === activeBrandId && (
                          <Check size={14} className="text-brand-teal-500" />
                        )}
                      </DropdownMenu.Item>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* ----------------------------------------------------------------- */}
        {/* "Solo lectura" badge for VENDEDOR role -- AUTH-06 requirement       */}
        {/* ----------------------------------------------------------------- */}
        {isVendedor && <Badge variant="draft">Solo lectura</Badge>}

        {/* ----------------------------------------------------------------- */}
        {/* User menu dropdown                                                  */}
        {/* ----------------------------------------------------------------- */}
        <DropdownMenu.Root open={userOpen} onOpenChange={setUserOpen}>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 outline-none">
              <Avatar name={user?.name} size="sm" />
              <span className="hidden text-sm font-medium text-neutral-600 md:block">
                {user?.name}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              forceMount
              sideOffset={8}
              align="end"
              asChild
            >
              <AnimatePresence>
                {userOpen && (
                  <motion.div
                    {...interactions.dropdownOpen}
                    className="min-w-[200px] rounded-xl p-1.5 shadow-elevation-16"
                    style={{
                      ...glassMaterials.frosted,
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    }}
                  >
                    {/* User info header */}
                    <div className="border-b border-neutral-100 px-3 py-2">
                      <p className="text-sm font-medium text-neutral-700">
                        {user?.name}
                      </p>
                      <p className="text-xs text-neutral-400">{user?.email}</p>
                    </div>

                    {/* Logout */}
                    <DropdownMenu.Item
                      onSelect={() => logout()}
                      className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 outline-none transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <LogOut size={14} />
                      Cerrar sesion
                    </DropdownMenu.Item>
                  </motion.div>
                )}
              </AnimatePresence>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

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
