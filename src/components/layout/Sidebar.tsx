"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  createContext,
  useContext,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
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
  Truck,
  ChevronsLeft,
  X,
  Globe,
  ListChecks,
  Inbox,
} from "lucide-react";
import { Tooltip } from "radix-ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { springs } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Sidebar context -- allows Topbar (and others) to control mobile sidebar
// ---------------------------------------------------------------------------

interface SidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
  mobileOpen: false,
  setMobileOpen: () => {},
  isMobile: false,
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile sidebar on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ isMobile, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

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
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/backend/dashboard" },
      { id: "paquetes", label: "Paquetes", icon: Package, href: "/backend/paquetes" },
    ],
  },
  {
    group: "servicios",
    label: "Servicios",
    items: [
      { id: "aereos", label: "Aéreos", icon: Plane, href: "/backend/aereos" },
      { id: "alojamientos", label: "Alojamientos", icon: Hotel, href: "/backend/alojamientos" },
      { id: "traslados", label: "Traslados", icon: Bus, href: "/backend/traslados" },
      { id: "circuitos", label: "Circuitos", icon: Ship, href: "/backend/circuitos" },
      { id: "seguros", label: "Seguros", icon: ShieldCheck, href: "/backend/seguros" },
      { id: "servicios", label: "Servicios incluidos", icon: ListChecks, href: "/backend/catalogos/servicios" },
    ],
  },
  {
    group: "web",
    label: "Web",
    items: [
      { id: "web", label: "Frontend", icon: Globe, href: "/backend/web" },
      { id: "leads", label: "Leads", icon: Inbox, href: "/backend/leads" },
    ],
  },
  {
    group: "sistema",
    label: "Sistema",
    items: [
      { id: "proveedores", label: "Proveedores", icon: Truck, href: "/backend/proveedores" },
      { id: "perfiles", label: "Perfiles y Roles", icon: Users, href: "/backend/perfiles" },
      { id: "catalogos", label: "Catálogos", icon: Settings, href: "/backend/catalogos" },
      { id: "notificaciones", label: "Notificaciones", icon: Bell, href: "/backend/notificaciones" },
    ],
  },
];

// Etiquetas legibles por rol (footer de usuario)
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  MARKETING: "Marketing",
};

// Ancho expandido / colapsado (px)
const W_EXPANDED = 256;
const W_COLLAPSED = 68;

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { visibleModules, user } = useAuth();
  const { activeBrand } = useBrand();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, mobileOpen, setMobileOpen } = useSidebar();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();

  // Filter nav groups by role-visible modules
  const filteredGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => visibleModules.includes(item.id)),
        }))
        .filter((group) => group.items.length > 0),
    [visibleModules],
  );

  // Detect active nav item
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  // On mobile, the sidebar is always "expanded" when open (never collapsed)
  const effectiveCollapsed = isMobile ? false : collapsed;
  const effectiveWidth = isMobile
    ? mobileOpen ? W_EXPANDED : 0
    : collapsed ? W_COLLAPSED : W_EXPANDED;

  const prefetchRoute = (href: string) => {
    if (href === pathname || prefetchedRoutesRef.current.has(href)) return;
    prefetchedRoutesRef.current.add(href);
    router.prefetch(href);
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[99]"
            style={{
              background: "rgba(10,10,30,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{
          width: effectiveWidth,
          x: isMobile && !mobileOpen ? -W_EXPANDED : 0,
        }}
        transition={reduceMotion ? { duration: 0 } : springs.gentle}
        className={cn(
          "h-dvh flex-shrink-0 overflow-hidden flex flex-col",
          isMobile ? "fixed left-0 top-0 z-[100]" : "relative z-[100]",
        )}
        style={{
          background: activeBrand.sidebarGradient,
          backdropFilter: `blur(${activeBrand.sidebarBlur})`,
          WebkitBackdropFilter: `blur(${activeBrand.sidebarBlur})`,
          borderRight: "1px solid rgba(139,92,246,0.1)",
        }}
      >
        {/* Subtle top accent — no pulsing animation */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 60%)",
          }}
        />

        {/* ----------------------------------------------------------------- */}
        {/* Logo area */}
        {/* ----------------------------------------------------------------- */}
        <div
          className={cn(
            "relative flex h-16 flex-shrink-0 items-center justify-between",
            effectiveCollapsed ? "px-3 justify-center" : "px-5",
          )}
        >
          {effectiveCollapsed ? (
            /* Collapsed: isotipo cuadrado */
            <Image
              src="/site/img/isotipo.png"
              alt="TravelOz"
              width={34}
              height={34}
              className="rounded-lg object-contain"
              unoptimized
            />
          ) : (
            /* Expanded: logo completo */
            <Image
              src="/header-logo.webp"
              alt="TravelOz"
              width={148}
              height={20}
              className="object-contain"
              unoptimized
            />
          )}

          {/* Mobile close button */}
          {isMobile && mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Nav section (scrollable) */}
        {/* ----------------------------------------------------------------- */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-1">
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.group}>
              {/* Group separation: label when expanded, hairline when collapsed */}
              {effectiveCollapsed ? (
                groupIndex > 0 && (
                  <div className="mx-auto my-3 h-px w-7 bg-white/10" />
                )
              ) : (
                <div
                  className={cn(
                    "mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45",
                    groupIndex === 0 ? "mt-2" : "mt-6",
                  )}
                >
                  {group.label}
                </div>
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        "group relative flex items-center rounded-lg text-[13.5px] font-medium transition-colors duration-150",
                        effectiveCollapsed
                          ? "justify-center px-0 py-2.5"
                          : "gap-3 px-3 py-2",
                        active
                          ? "text-white"
                          : "text-white/60 hover:bg-white/[0.05] hover:text-white/95",
                      )}
                      onMouseEnter={() => prefetchRoute(item.href)}
                      onFocus={() => prefetchRoute(item.href)}
                    >
                      {/* Active pill: glides between items on route change */}
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={
                            reduceMotion ? { duration: 0 } : springs.snappy
                          }
                          className="absolute inset-0 rounded-lg bg-white/[0.09]"
                          style={{
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          {/* Rail de acento de marca */}
                          <span
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                            style={{ background: "#A78BFA" }}
                          />
                        </motion.span>
                      )}
                      <Icon
                        size={17}
                        strokeWidth={1.75}
                        className={cn(
                          "relative flex-shrink-0 transition-transform duration-150",
                          !reduceMotion && "group-hover:scale-[1.08]",
                        )}
                      />
                      {!effectiveCollapsed && (
                        <span className="relative truncate">{item.label}</span>
                      )}
                    </Link>
                  );

                  // When collapsed, wrap in Tooltip
                  if (effectiveCollapsed) {
                    return (
                      <Tooltip.Root key={item.id}>
                        <Tooltip.Trigger asChild>{linkContent}</Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="right"
                            sideOffset={8}
                            className="z-[200] rounded-lg px-3 py-1.5 text-xs text-white"
                            style={{
                              background: "rgba(26,26,46,0.94)",
                              backdropFilter: "blur(12px)",
                              WebkitBackdropFilter: "blur(12px)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                            }}
                          >
                            {item.label}
                            <Tooltip.Arrow
                              style={{ fill: "rgba(26,26,46,0.94)" }}
                            />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    );
                  }

                  return <div key={item.id}>{linkContent}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* Footer: usuario + colapso — ancla el fondo del sidebar             */}
        {/* ----------------------------------------------------------------- */}
        <div className="relative flex-shrink-0 border-t border-white/[0.07] px-3 py-3">
          {effectiveCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar name={user?.name} size="sm" />
              {!isMobile && (
                <button
                  onClick={() => setCollapsed(false)}
                  aria-label="Expandir menú"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                >
                  <motion.span
                    animate={{ rotate: 180 }}
                    transition={reduceMotion ? { duration: 0 } : springs.snappy}
                    className="flex"
                  >
                    <ChevronsLeft size={17} strokeWidth={1.75} />
                  </motion.span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar name={user?.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight text-white/90">
                  {user?.name ?? "Usuario"}
                </p>
                <p className="truncate text-[11px] leading-tight text-white/45">
                  {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}
                </p>
              </div>
              {!isMobile && (
                <button
                  onClick={() => setCollapsed(true)}
                  aria-label="Colapsar menú"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                >
                  <motion.span
                    animate={{ rotate: 0 }}
                    transition={reduceMotion ? { duration: 0 } : springs.snappy}
                    className="flex"
                  >
                    <ChevronsLeft size={17} strokeWidth={1.75} />
                  </motion.span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </Tooltip.Provider>
  );
}
