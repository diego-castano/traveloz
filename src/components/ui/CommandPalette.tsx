"use client";

/**
 * CommandPalette — global ⌘K palette built on `cmdk`.
 *
 * Replaces the previous bespoke <SearchModal /> with a true command surface:
 *   1. Quick navigation between admin modules (always visible).
 *   2. Quick actions (Nuevo paquete / alojamiento / aereo, Limpiar filtros…).
 *   3. Recents (recently visited results) and live search across every entity
 *      (paquetes, aereos, alojamientos, traslados, seguros, circuitos).
 *
 * The previous /paquetes hint chip in the Topbar still dispatches the same
 * `Cmd/Ctrl+K` synthetic event, so this component picks the keystroke up
 * without any topbar changes required.
 */

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  Package,
  Plane,
  Hotel,
  Bus,
  ShieldCheck,
  Map as MapIcon,
  LayoutDashboard,
  Truck,
  Users,
  Bell,
  Settings,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePaquetes } from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useTraslados,
  useSeguros,
  useCircuitos,
} from "@/components/providers/ServiceProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentItem {
  id: string;
  type:
    | "paquete"
    | "aereo"
    | "alojamiento"
    | "traslado"
    | "seguro"
    | "circuito";
  title: string;
  subtitle: string;
  href: string;
}

const typeMeta: Record<
  RecentItem["type"],
  { icon: LucideIcon; color: string; label: string }
> = {
  paquete: { icon: Package, color: "#8B5CF6", label: "Paquetes" },
  aereo: { icon: Plane, color: "#3BBFAD", label: "Aereos" },
  alojamiento: { icon: Hotel, color: "#E74C5F", label: "Alojamientos" },
  traslado: { icon: Bus, color: "#6B8BAE", label: "Traslados" },
  seguro: { icon: ShieldCheck, color: "#C69C6D", label: "Seguros" },
  circuito: { icon: MapIcon, color: "#7C3AED", label: "Circuitos" },
};

// Module navigation entries — gated by `visibleModules` from the auth provider.
const navEntries: Array<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
}> = [
  { id: "dashboard", label: "Dashboard", href: "/backend/dashboard", icon: LayoutDashboard, hint: "g d" },
  { id: "paquetes", label: "Paquetes", href: "/backend/paquetes", icon: Package, hint: "g p" },
  { id: "aereos", label: "Aereos", href: "/backend/aereos", icon: Plane },
  { id: "alojamientos", label: "Alojamientos", href: "/backend/alojamientos", icon: Hotel },
  { id: "traslados", label: "Traslados", href: "/backend/traslados", icon: Bus },
  { id: "circuitos", label: "Circuitos", href: "/backend/circuitos", icon: MapIcon },
  { id: "seguros", label: "Seguros", href: "/backend/seguros", icon: ShieldCheck },
  { id: "proveedores", label: "Proveedores", href: "/backend/proveedores", icon: Truck },
  { id: "perfiles", label: "Perfiles y Roles", href: "/backend/perfiles", icon: Users },
  { id: "catalogos", label: "Catálogos", href: "/backend/catalogos", icon: Settings },
  { id: "notificaciones", label: "Notificaciones", href: "/backend/notificaciones", icon: Bell },
];

// Recents persisted across sessions.
const RECENTS_KEY = "traveloz.cmdk.recents.v1";
const RECENTS_LIMIT = 5;

function loadRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: RecentItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded → ignore */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PaletteMode = "root" | "create" | "settings";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recents, setRecents] = React.useState<RecentItem[]>(() => loadRecents());
  const [mode, setMode] = React.useState<PaletteMode>("root");
  const router = useRouter();
  const { canEdit, visibleModules } = useAuth();

  const paquetes = usePaquetes();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();

  // ⌘K / Ctrl+K listener
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset query and mode whenever the palette closes.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setMode("root");
    }
  }, [open]);

  // ---- Navigation ----------------------------------------------------------
  const filteredNav = React.useMemo(
    () => navEntries.filter((e) => visibleModules.includes(e.id)),
    [visibleModules],
  );

  function go(href: string, recent?: RecentItem) {
    if (recent) {
      const next = [recent, ...recents.filter((r) => r.id !== recent.id)].slice(
        0,
        RECENTS_LIMIT,
      );
      setRecents(next);
      saveRecents(next);
    }
    setOpen(false);
    router.push(href);
  }

  // ---- Quick search results (capped per type) ------------------------------
  // We pre-build a unified array for cmdk to filter against. cmdk handles
  // fuzzy matching and Re-ranking based on the input value, so we just need
  // to give it a `value` that contains useful keywords.
  const searchItems = React.useMemo(() => {
    type Item = RecentItem & { keywords: string[] };
    if (!open) return [] as Item[]; // skip the work while the palette is hidden
    const items: Item[] = [];
    const limitPerType = 8;
    let count = 0;

    for (const p of paquetes) {
      if (count >= limitPerType) break;
      items.push({
        id: p.id,
        type: "paquete",
        title: p.titulo,
        subtitle: `${p.destino ?? ""} · ${p.estado}`.replace(/^ ·\s*/, ""),
        href: `/backend/paquetes/${p.id}`,
        keywords: [p.titulo, p.destino ?? "", p.descripcion ?? ""].filter(Boolean),
      });
      count++;
    }
    count = 0;
    for (const a of aereos) {
      if (count >= limitPerType) break;
      items.push({
        id: a.id,
        type: "aereo",
        title: a.ruta,
        subtitle: [a.aerolinea, a.destino].filter(Boolean).join(" · "),
        href: `/backend/aereos/${a.id}`,
        keywords: [a.ruta, a.destino, a.aerolinea ?? ""].filter(Boolean),
      });
      count++;
    }
    count = 0;
    for (const a of alojamientos) {
      if (count >= limitPerType) break;
      items.push({
        id: a.id,
        type: "alojamiento",
        title: a.nombre,
        subtitle: `${a.categoria}★`,
        href: `/backend/alojamientos/${a.id}`,
        keywords: [a.nombre],
      });
      count++;
    }
    count = 0;
    for (const t of traslados) {
      if (count >= limitPerType) break;
      items.push({
        id: t.id,
        type: "traslado",
        title: t.nombre,
        subtitle: t.tipo,
        href: "/backend/traslados",
        keywords: [t.nombre, t.tipo],
      });
      count++;
    }
    count = 0;
    for (const s of seguros) {
      if (count >= limitPerType) break;
      items.push({
        id: s.id,
        type: "seguro",
        title: s.plan,
        subtitle: s.cobertura,
        href: "/backend/seguros",
        keywords: [s.plan, s.cobertura],
      });
      count++;
    }
    count = 0;
    for (const c of circuitos) {
      if (count >= limitPerType) break;
      items.push({
        id: c.id,
        type: "circuito",
        title: c.nombre,
        subtitle: `${c.noches} noches`,
        href: `/backend/circuitos/${c.id}`,
        keywords: [c.nombre],
      });
      count++;
    }

    return items;
  }, [open, paquetes, aereos, alojamientos, traslados, seguros, circuitos]);

  // ---- Render --------------------------------------------------------------
  // The whole UI is wrapped in Radix Dialog so we keep the project's overlay
  // and stacking behavior, but the inner shell is a `cmdk` <Command/> tree
  // for keyboard handling, filtering, and group rendering.
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[300]"
                style={{
                  background: "rgba(10,10,30,0.6)",
                  backdropFilter: "blur(10px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-[310] flex items-start justify-center px-4 pt-[12vh] pointer-events-none">
              <Dialog.Content forceMount asChild>
                <motion.div
                  className="pointer-events-auto w-full max-w-[640px] rounded-glass-lg overflow-hidden"
                  style={{
                    ...glassMaterials.liquidModal,
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                  initial={{ opacity: 0, scale: 0.92, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, filter: "blur(4px)" }}
                  transition={springs.gentle}
                >
                  <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Navegar entre módulos, ejecutar acciones rápidas o buscar entidades.
                  </Dialog.Description>

                  <Command
                    label="Paleta de comandos"
                    className="flex flex-col"
                    shouldFilter
                    onKeyDown={(e) => {
                      // Backspace on empty input pops the current sub-page.
                      if (
                        e.key === "Backspace" &&
                        !query &&
                        mode !== "root"
                      ) {
                        e.preventDefault();
                        setMode("root");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                      {mode !== "root" && (
                        <button
                          type="button"
                          onClick={() => setMode("root")}
                          className="flex h-6 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-neutral-200 hover:bg-white/10"
                          aria-label="Volver"
                        >
                          ←
                          <span className="capitalize">
                            {mode === "create" ? "Crear" : "Ajustes"}
                          </span>
                        </button>
                      )}
                      <Search className="h-5 w-5 shrink-0 text-brand-teal-400" />
                      <Command.Input
                        autoFocus
                        value={query}
                        onValueChange={setQuery}
                        placeholder={
                          mode === "create"
                            ? "Crear nuevo…"
                            : mode === "settings"
                              ? "Ajustes y configuración…"
                              : "Buscar módulos, acciones, paquetes, hoteles…"
                        }
                        className="flex-1 bg-transparent text-[15px] text-white placeholder:text-neutral-400 outline-none"
                      />
                      <kbd
                        className="hidden items-center rounded border px-1 py-px font-mono text-[10px] text-neutral-400 sm:flex"
                        style={{ borderColor: "rgba(255,255,255,0.18)" }}
                      >
                        ESC
                      </kbd>
                    </div>

                    <Command.List className="max-h-[420px] overflow-y-auto py-2">
                      <Command.Empty className="px-4 py-8 text-center text-sm text-neutral-400">
                        Sin resultados para &ldquo;{query}&rdquo;
                      </Command.Empty>

                      {/* Sub-page: Crear */}
                      {mode === "create" && canEdit && (
                        <Command.Group
                          heading="Crear nuevo"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                        >
                          {[
                            { label: "Nuevo paquete", href: "/backend/paquetes/nuevo", color: "#8B5CF6", icon: Package },
                            { label: "Nuevo alojamiento", href: "/backend/alojamientos/nuevo", color: "#E74C5F", icon: Hotel },
                            { label: "Nuevo aéreo", href: "/backend/aereos/nuevo", color: "#3BBFAD", icon: Plane },
                            { label: "Nuevo circuito", href: "/backend/circuitos/nuevo", color: "#7C3AED", icon: MapIcon },
                          ].map((it) => {
                            const Icon = it.icon;
                            return (
                              <Command.Item
                                key={it.href}
                                value={it.label}
                                onSelect={() => go(it.href)}
                                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                              >
                                <span
                                  className="flex h-7 w-7 items-center justify-center rounded-md"
                                  style={{ background: `${it.color}22` }}
                                >
                                  <Plus className="h-3.5 w-3.5" style={{ color: it.color }} />
                                </span>
                                <span className="flex-1 truncate">{it.label}</span>
                                <Icon className="h-3.5 w-3.5 text-neutral-500" />
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      )}

                      {/* Sub-page: Ajustes */}
                      {mode === "settings" && (
                        <Command.Group
                          heading="Ajustes"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                        >
                          <Command.Item
                            value="catalogos catalogo configuracion"
                            onSelect={() => go("/backend/catalogos")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                              <Settings className="h-3.5 w-3.5 text-white/80" />
                            </span>
                            <span className="flex-1 truncate">Catálogos (temporadas, países, etiquetas…)</span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="perfiles roles permisos"
                            onSelect={() => go("/backend/perfiles")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                              <Users className="h-3.5 w-3.5 text-white/80" />
                            </span>
                            <span className="flex-1 truncate">Perfiles y roles</span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="proveedores"
                            onSelect={() => go("/backend/proveedores")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                              <Truck className="h-3.5 w-3.5 text-white/80" />
                            </span>
                            <span className="flex-1 truncate">Proveedores</span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="notificaciones"
                            onSelect={() => go("/backend/notificaciones")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                              <Bell className="h-3.5 w-3.5 text-white/80" />
                            </span>
                            <span className="flex-1 truncate">Notificaciones</span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                        </Command.Group>
                      )}

                      {/* Recents (only shown with empty query) */}
                      {mode === "root" && !query && recents.length > 0 && (
                        <Command.Group
                          heading="Recientes"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                        >
                          {recents.map((r) => {
                            const meta = typeMeta[r.type];
                            const Icon = meta.icon;
                            return (
                              <Command.Item
                                key={`recent:${r.id}`}
                                value={`recent ${r.title} ${r.subtitle}`}
                                onSelect={() => go(r.href, r)}
                                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                              >
                                <span
                                  className="flex h-7 w-7 items-center justify-center rounded-md"
                                  style={{ background: `${meta.color}22` }}
                                >
                                  <Clock
                                    className="h-3.5 w-3.5"
                                    style={{ color: meta.color }}
                                  />
                                </span>
                                <span className="flex-1 truncate">{r.title}</span>
                                <span className="text-[11px] text-neutral-400">
                                  {meta.label}
                                </span>
                                <Icon className="h-3.5 w-3.5 text-neutral-500" />
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      )}

                      {/* Navigation */}
                      {mode === "root" && (
                      <Command.Group
                        heading="Navegación"
                        className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                      >
                        {filteredNav.map((entry) => {
                          const Icon = entry.icon;
                          return (
                            <Command.Item
                              key={`nav:${entry.id}`}
                              value={`ir ${entry.label} ${entry.id} navegar`}
                              onSelect={() => go(entry.href)}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                                <Icon className="h-3.5 w-3.5 text-white/80" />
                              </span>
                              <span className="flex-1 truncate">Ir a {entry.label}</span>
                              {entry.hint && (
                                <kbd
                                  className="rounded border px-1 py-px font-mono text-[10px] text-neutral-400"
                                  style={{ borderColor: "rgba(255,255,255,0.18)" }}
                                >
                                  {entry.hint}
                                </kbd>
                              )}
                              <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                      )}

                      {/* Sub-page entries (root only) */}
                      {mode === "root" && (
                        <Command.Group
                          heading="Más"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                        >
                          {canEdit && (
                            <Command.Item
                              value="crear nuevo create"
                              onSelect={() => {
                                setQuery("");
                                setMode("create");
                              }}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                                <Plus className="h-3.5 w-3.5 text-white/80" />
                              </span>
                              <span className="flex-1 truncate">Crear nuevo…</span>
                              <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                            </Command.Item>
                          )}
                          <Command.Item
                            value="ajustes configuracion settings"
                            onSelect={() => {
                              setQuery("");
                              setMode("settings");
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
                              <Settings className="h-3.5 w-3.5 text-white/80" />
                            </span>
                            <span className="flex-1 truncate">Ajustes y configuración…</span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                        </Command.Group>
                      )}

                      {/* Quick actions */}
                      {mode === "root" && canEdit && (
                        <Command.Group
                          heading="Acciones rápidas"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                        >
                          <Command.Item
                            value="nuevo paquete crear"
                            onSelect={() => go("/backend/paquetes/nuevo")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#8B5CF6]/20">
                              <Plus className="h-3.5 w-3.5 text-[#A78BFA]" />
                            </span>
                            <span className="flex-1 truncate">Nuevo paquete</span>
                            <Package className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="nuevo alojamiento hotel crear"
                            onSelect={() => go("/backend/alojamientos/nuevo")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E74C5F]/20">
                              <Plus className="h-3.5 w-3.5 text-[#F77B8B]" />
                            </span>
                            <span className="flex-1 truncate">Nuevo alojamiento</span>
                            <Hotel className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="nuevo aereo vuelo crear"
                            onSelect={() => go("/backend/aereos/nuevo")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3BBFAD]/20">
                              <Plus className="h-3.5 w-3.5 text-[#5DD3C2]" />
                            </span>
                            <span className="flex-1 truncate">Nuevo aéreo</span>
                            <Plane className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                          <Command.Item
                            value="nuevo circuito crear"
                            onSelect={() => go("/backend/circuitos/nuevo")}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#7C3AED]/20">
                              <Plus className="h-3.5 w-3.5 text-[#A78BFA]" />
                            </span>
                            <span className="flex-1 truncate">Nuevo circuito</span>
                            <MapIcon className="h-3.5 w-3.5 text-neutral-500" />
                          </Command.Item>
                        </Command.Group>
                      )}

                      {/* Search results: grouped by type so the user can spot
                          what comes from where without losing fuzzy ranking. */}
                      {mode === "root" &&
                        (["paquete", "aereo", "alojamiento", "traslado", "seguro", "circuito"] as const).map(
                        (type) => {
                          const items = searchItems.filter((i) => i.type === type);
                          if (items.length === 0) return null;
                          const meta = typeMeta[type];
                          const Icon = meta.icon;
                          return (
                            <Command.Group
                              key={type}
                              heading={meta.label}
                              className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-neutral-500"
                            >
                              {items.map((item) => (
                                <Command.Item
                                  key={`${type}:${item.id}`}
                                  value={`${item.title} ${item.subtitle} ${item.keywords.join(" ")}`}
                                  onSelect={() =>
                                    go(item.href, {
                                      id: item.id,
                                      type: item.type,
                                      title: item.title,
                                      subtitle: item.subtitle,
                                      href: item.href,
                                    })
                                  }
                                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white outline-none data-[selected=true]:bg-white/10"
                                >
                                  <span
                                    className="flex h-7 w-7 items-center justify-center rounded-md"
                                    style={{ background: `${meta.color}22` }}
                                  >
                                    <Icon
                                      className="h-3.5 w-3.5"
                                      style={{ color: meta.color }}
                                    />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm text-white">
                                      {item.title}
                                    </div>
                                    <div className="truncate text-[11px] text-neutral-400">
                                      {item.subtitle}
                                    </div>
                                  </div>
                                </Command.Item>
                              ))}
                            </Command.Group>
                          );
                        },
                      )}
                    </Command.List>

                    <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[10px] text-neutral-500">
                      <span>↑↓ Navegar</span>
                      <span>↵ Abrir</span>
                      <span>ESC Cerrar</span>
                    </div>
                  </Command>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
