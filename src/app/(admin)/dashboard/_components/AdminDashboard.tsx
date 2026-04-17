"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Package,
  Globe2,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Plus,
  Plane,
  Hotel,
  Bell,
  BarChart3,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  usePaquetes,
  useAllOpcionesHoteleras,
  usePackageState,
} from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import {
  usePaises,
  useRegiones,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  buildPaisResolver,
  groupPaquetesByRegion,
  countPaquetesSinOpcion,
  countServiciosConPreciosVencidos,
  paquetesProximosAVencer,
  relativeTime,
  getGreeting,
  formatFecha,
  colorForIndex,
} from "./metrics";

// ---------------------------------------------------------------------------
// KpiPill — rounded-full hero number with icon chip
// ---------------------------------------------------------------------------

interface KpiPillProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  href?: string;
  tone?: "primary" | "warning";
  delay?: number;
}

function KpiPill({
  label,
  value,
  icon: Icon,
  color,
  href,
  tone = "primary",
  delay = 0,
}: KpiPillProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.1,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [value, count, delay]);

  const bg = tone === "warning" ? `${color}10` : "#FFFFFF";
  const borderColor =
    tone === "warning" ? `${color}40` : "rgba(17,17,36,0.07)";

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={href ? { y: -3 } : undefined}
      className="group relative flex items-center gap-5 rounded-full border px-7 py-5 transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(17,17,36,0.15)]"
      style={{ background: bg, borderColor }}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          {label}
        </p>
        <motion.span
          className="mt-0.5 block font-mono text-[34px] font-bold leading-tight tabular-nums"
          style={{ color: tone === "warning" ? color : "#111124" }}
        >
          {rounded}
        </motion.span>
      </div>
    </motion.div>
  );

  if (href)
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  return inner;
}

// ---------------------------------------------------------------------------
// RegionPill — small inline chip with dot + label + count
// ---------------------------------------------------------------------------

function RegionPill({
  label,
  count,
  color,
  href,
  delay = 0,
}: {
  label: string;
  count: number;
  color: string;
  href: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className="block">
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="group flex items-center gap-2 rounded-full border px-4 py-2 transition-colors"
          style={{
            borderColor: `${color}35`,
            background: `${color}0D`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
          />
          <span className="text-[13px] font-medium text-neutral-800 group-hover:text-neutral-900">
            {label}
          </span>
          <span
            className="font-mono text-[13px] font-bold tabular-nums"
            style={{ color }}
          >
            {count}
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// EstadoBadge — inline status chip for paquetes
// ---------------------------------------------------------------------------

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ACTIVO: { label: "Activo", color: "#10B981" },
    BORRADOR: { label: "Borrador", color: "#E8913A" },
    INACTIVO: { label: "Inactivo", color: "#6B7280" },
  };
  const m = map[estado] ?? { label: estado, color: "#6B7280" };
  return (
    <span
      className="font-mono font-semibold uppercase tracking-wider"
      style={{ color: m.color }}
    >
      {m.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AlertCard — severity-coded, only rendered when count > 0
// ---------------------------------------------------------------------------

interface AlertCardProps {
  severity: "warning" | "critical";
  icon: LucideIcon;
  count: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  delay?: number;
}

function AlertCard({
  severity,
  icon: Icon,
  count,
  title,
  description,
  href,
  actionLabel,
  delay = 0,
}: AlertCardProps) {
  const isWarning = severity === "warning";
  const accent = isWarning ? "#E8913A" : "#EF4444";
  const bg = isWarning ? "#FEF7EC" : "#FEF2F2";
  const border = isWarning
    ? "rgba(232,145,58,0.25)"
    : "rgba(239,68,68,0.25)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link href={href} className="block">
        <motion.div
          className="group relative overflow-hidden rounded-[14px] p-4 transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(17,17,36,0.18)]"
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderLeft: `3px solid ${accent}`,
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.995 }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px]"
              style={{ background: `${accent}18`, color: accent }}
            >
              <Icon size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono text-[24px] font-bold leading-none"
                  style={{ color: accent }}
                >
                  {count}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  {title}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-neutral-500">
                {description}
              </p>
              <p
                className="mt-2 flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5"
                style={{ color: accent }}
              >
                {actionLabel}
                <ChevronRight size={12} strokeWidth={2.5} />
              </p>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuickAction button
// ---------------------------------------------------------------------------

function QuickAction({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        className="group flex items-center gap-3 rounded-[10px] border border-hairline bg-white px-3 py-2.5 transition-colors hover:border-neutral-200"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: `${color}14`, color }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>
        <span className="flex-1 text-sm font-medium text-neutral-700">
          {label}
        </span>
        <ChevronRight
          size={14}
          className="text-neutral-300 transition-transform group-hover:translate-x-0.5"
        />
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "").split(" ")[0];

  // ---- Providers ----
  const paquetes = usePaquetes();
  const opciones = useAllOpcionesHoteleras();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const paises = usePaises();
  const regiones = useRegiones();

  // ---- Country resolver (paquete → dominant país → region) ----
  const paisResolver = useMemo(
    () =>
      buildPaisResolver(
        packageState.paqueteAlojamientos,
        alojamientos,
        paises,
        regiones,
      ),
    [packageState.paqueteAlojamientos, alojamientos, paises, regiones],
  );

  // ---- Region buckets ----
  const regionData = useMemo(
    () => groupPaquetesByRegion(paquetes, paisResolver, regiones),
    [paquetes, paisResolver, regiones],
  );

  // ---- Últimos 5 paquetes ----
  const ultimosPaquetes = useMemo(
    () =>
      [...paquetes]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [paquetes],
  );

  // ---- Alerts ----
  const sinOpcionCount = useMemo(
    () => countPaquetesSinOpcion(paquetes, opciones),
    [paquetes, opciones],
  );
  const vencidosCount = useMemo(
    () =>
      countServiciosConPreciosVencidos(
        aereos,
        serviceState.preciosAereo,
        alojamientos,
        serviceState.preciosAlojamiento,
      ),
    [
      aereos,
      serviceState.preciosAereo,
      alojamientos,
      serviceState.preciosAlojamiento,
    ],
  );
  const proximosAVencer = useMemo(
    () => paquetesProximosAVencer(paquetes),
    [paquetes],
  );

  // ---- Alert list (only show with count > 0) ----
  const alerts: AlertCardProps[] = [];
  if (sinOpcionCount > 0) {
    alerts.push({
      severity: "critical",
      icon: DollarSign,
      count: sinOpcionCount,
      title:
        sinOpcionCount === 1
          ? "paquete sin opción hotelera"
          : "paquetes sin opción hotelera",
      description:
        "Paquetes activos a los que les falta configurar la opción hotelera.",
      href: "/paquetes",
      actionLabel: "Completar configuración",
    });
  }
  if (vencidosCount > 0) {
    alerts.push({
      severity: "warning",
      icon: AlertTriangle,
      count: vencidosCount,
      title:
        vencidosCount === 1
          ? "servicio con precios vencidos"
          : "servicios con precios vencidos",
      description:
        "Aéreos o alojamientos cuyo último período de precio ya pasó. Actualizá las tarifas.",
      href: "/aereos",
      actionLabel: "Actualizar precios",
    });
  }

  return (
    <div className="space-y-6">
      {/* =================== 1. Greeting + Date =================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-baseline justify-between gap-2"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-neutral-900">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-400">{formatFecha()}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1"
        >
          <Sparkles size={12} className="text-[#8B5CF6]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Panel Admin
          </span>
        </motion.div>
      </motion.div>

      {/* =================== 2. Alerts (conditional) =================== */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {alerts.map((alert, i) => (
            <AlertCard key={i} {...alert} delay={0.1 + i * 0.05} />
          ))}
        </div>
      )}

      {/* =================== 3. KPI pills — Total + Por Vencer =================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiPill
          icon={Package}
          label="Total Paquetes"
          value={paquetes.length}
          color="#3BBFAD"
          href="/paquetes"
          delay={0}
        />
        <KpiPill
          icon={Clock}
          label="Paquetes por Vencer"
          value={proximosAVencer.length}
          color="#E8913A"
          href="/paquetes?filter=porVencer"
          tone="warning"
          delay={0.05}
        />
      </div>

      {/* =================== 4. Region pills row =================== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-[14px] border border-hairline bg-white p-5"
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">
              Paquetes por región
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Distribución global por región geográfica
            </p>
          </div>
          <Globe2 size={14} className="text-neutral-300" />
        </header>

        {regionData.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            Sin paquetes cargados
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {regionData.map((r, i) => (
              <RegionPill
                key={r.key}
                label={r.label}
                count={r.count}
                color={colorForIndex(i)}
                href={
                  r.regionId ? `/paquetes?region=${r.regionId}` : "/paquetes"
                }
                delay={0.15 + i * 0.03}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* =================== 5. Últimos 5 paquetes + Acciones rápidas =================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Últimos 5 paquetes (2/3) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="rounded-[14px] border border-hairline bg-white p-5 lg:col-span-2"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">
                Últimos 5 paquetes
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Los paquetes creados más recientemente
              </p>
            </div>
            <Link
              href="/paquetes"
              className="text-[11px] font-semibold uppercase tracking-wider text-[#8B5CF6] hover:underline"
            >
              Ver todos
            </Link>
          </header>

          {ultimosPaquetes.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              Sin paquetes cargados todavía
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {ultimosPaquetes.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.35 + i * 0.04 }}
                >
                  <Link
                    href={`/paquetes/${p.id}`}
                    className="group flex items-center gap-3 py-3"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#8B5CF6]/10 text-[#8B5CF6]">
                      <Package size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-neutral-800 group-hover:text-[#8B5CF6] transition-colors">
                        {p.titulo}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-400">
                        <EstadoBadge estado={p.estado} />
                        <span>·</span>
                        <span>
                          {paisResolver.paisNombreFor(p.id) ?? "Sin destino"}
                        </span>
                        <span>·</span>
                        <span>{relativeTime(p.createdAt)}</span>
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-neutral-300 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* Acciones rápidas (1/3) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="rounded-[14px] border border-hairline bg-white p-5"
        >
          <h2 className="mb-3 text-[15px] font-semibold text-neutral-900">
            Acciones rápidas
          </h2>
          <div className="space-y-2">
            <QuickAction
              icon={Plus}
              label="Nuevo paquete"
              href="/paquetes/nuevo"
              color="#3BBFAD"
            />
            <QuickAction
              icon={Plane}
              label="Nuevo aéreo"
              href="/aereos/nuevo"
              color="#8B5CF6"
            />
            <QuickAction
              icon={Hotel}
              label="Nuevo alojamiento"
              href="/alojamientos/nuevo"
              color="#E8913A"
            />
            <QuickAction
              icon={Bell}
              label="Notificar vendedores"
              href="/notificaciones"
              color="#2B8AFF"
            />
            <QuickAction
              icon={BarChart3}
              label="Ver reportes"
              href="/reportes"
              color="#6366F1"
            />
          </div>
        </motion.section>
      </div>

      {/* =================== 6. Placeholder futuro: marketing insights =================== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
        className="rounded-[14px] border border-dashed border-hairline bg-neutral-50/50 p-8 text-center"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-300 shadow-sm">
          <BarChart3 size={18} strokeWidth={1.5} />
        </div>
        <h3 className="mt-3 text-[14px] font-semibold text-neutral-500">
          Próximamente: insights de marketing
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-[12px] text-neutral-400">
          Cuando el sitio web esté integrado, acá vas a ver los paquetes más
          solicitados, los más clickeados, y qué destinos están traccionando.
        </p>
      </motion.section>
    </div>
  );
}
