"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Plane,
  Hotel,
  Bus,
  Ship,
  ShieldCheck,
  Users,
  Settings,
  Bell,
  BarChart3,
  Truck,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Tooltip } from "radix-ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { springs } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Navigation data structure
// Source: design.json components.sidebar.navItems
// ---------------------------------------------------------------------------
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface NavGroup {
  group: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    group: "general",
    label: "General",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { id: "paquetes", label: "Paquetes", icon: Package, href: "/paquetes" },
    ],
  },
  {
    group: "servicios",
    label: "Servicios",
    items: [
      { id: "aereos", label: "Aereos", icon: Plane, href: "/aereos" },
      { id: "alojamientos", label: "Alojamientos", icon: Hotel, href: "/alojamientos" },
      { id: "traslados", label: "Traslados", icon: Bus, href: "/traslados" },
      { id: "circuitos", label: "Circuitos y Cruceros", icon: Ship, href: "/circuitos" },
      { id: "seguros", label: "Seguros", icon: ShieldCheck, href: "/seguros" },
    ],
  },
  {
    group: "sistema",
    label: "Sistema",
    items: [
      { id: "proveedores", label: "Proveedores", icon: Truck, href: "/proveedores" },
      { id: "perfiles", label: "Perfiles y Roles", icon: Users, href: "/perfiles" },
      { id: "catalogos", label: "Catalogos", icon: Settings, href: "/catalogos" },
      { id: "notificaciones", label: "Notificaciones", icon: Bell, href: "/notificaciones" },
      { id: "reportes", label: "Reportes", icon: BarChart3, href: "/reportes" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { visibleModules } = useAuth();
  const { activeBrand } = useBrand();
  const pathname = usePathname();

  // Filter nav groups by role-visible modules
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => visibleModules.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);

  // Detect active nav item
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <motion.aside
        animate={{ width: collapsed ? 64 : 252 }}
        transition={springs.gentle}
        className="relative z-[100] h-screen flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          background: activeBrand.sidebarGradient,
          backdropFilter: `blur(${activeBrand.sidebarBlur})`,
          WebkitBackdropFilter: `blur(${activeBrand.sidebarBlur})`,
          borderRight: "1px solid rgba(139,92,246,0.1)",
        }}
      >
        {/* Pulsing glow overlay */}
        <div className="pointer-events-none absolute inset-0 animate-sidebar-glow" />

        {/* Top glow radial gradient */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{ background: activeBrand.sidebarTopGlow }}
        />

        {/* ----------------------------------------------------------------- */}
        {/* Logo area */}
        {/* ----------------------------------------------------------------- */}
        <div className="relative flex h-[60px] flex-shrink-0 items-center px-4">
          {collapsed ? (
            /* Collapsed: isotipo cuadrado */
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
              <Image
                src="/header-logo.webp"
                alt="Traveloz"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
          ) : (
            /* Expanded: logo completo */
            <Image
              src="/header-logo.webp"
              alt="Traveloz"
              width={140}
              height={36}
              className="object-contain"
            />
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Nav section (scrollable) */}
        {/* ----------------------------------------------------------------- */}
        <nav className="relative flex-1 overflow-y-auto py-2 px-3">
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.group}>
              {/* Group divider (not before first group) */}
              {groupIndex > 0 && (
                <div
                  className="mx-3 my-1"
                  style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
                />
              )}

              {/* Group label (only when expanded) */}
              {!collapsed && (
                <div
                  className="mb-2 mt-4 px-3 text-[10px] font-medium uppercase"
                  style={{
                    letterSpacing: "1.8px",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {group.label}
                </div>
              )}

              {/* Nav items */}
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] text-[13px] transition-all duration-200 cursor-pointer group",
                      collapsed
                        ? "justify-center px-0 py-2.5"
                        : "px-3 py-2.5",
                    )}
                    style={{
                      color: active
                        ? "rgba(255,255,255,1)"
                        : "rgba(255,255,255,0.55)",
                      background: active
                        ? "rgba(139,92,246,0.2)"
                        : undefined,
                      border: active
                        ? "1px solid rgba(139,92,246,0.15)"
                        : "1px solid transparent",
                      boxShadow: active
                        ? "inset 0 0 16px rgba(139,92,246,0.12), 0 0 12px rgba(139,92,246,0.08)"
                        : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color =
                          "rgba(255,255,255,0.9)";
                        e.currentTarget.style.transform =
                          "translateX(2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color =
                          "rgba(255,255,255,0.55)";
                        e.currentTarget.style.transform =
                          "translateX(0)";
                      }
                    }}
                  >
                    <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );

                // When collapsed, wrap in Tooltip
                if (collapsed) {
                  return (
                    <Tooltip.Root key={item.id}>
                      <Tooltip.Trigger asChild>
                        {linkContent}
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="right"
                          sideOffset={8}
                          className="z-[200] rounded-lg px-3 py-1.5 text-xs text-white"
                          style={{
                            background: "rgba(26,26,46,0.92)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow:
                              "0 8px 24px rgba(0,0,0,0.3)",
                          }}
                        >
                          {item.label}
                          <Tooltip.Arrow
                            style={{ fill: "rgba(26,26,46,0.92)" }}
                          />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  );
                }

                return <div key={item.id}>{linkContent}</div>;
              })}
            </div>
          ))}
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* Collapse toggle button */}
        {/* ----------------------------------------------------------------- */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="relative flex h-12 w-full items-center justify-center transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.2)";
          }}
        >
          {collapsed ? (
            <ChevronsRight size={18} strokeWidth={1.75} />
          ) : (
            <ChevronsLeft size={18} strokeWidth={1.75} />
          )}
        </button>
      </motion.aside>
    </Tooltip.Provider>
  );
}
