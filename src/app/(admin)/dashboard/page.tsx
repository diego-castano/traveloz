"use client";

import { useEffect, useMemo } from "react";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import Link from "next/link";
import {
  Package,
  Plane,
  Hotel,
  Calendar,
  DollarSign,
  Unlink,
  Plus,
  Bell,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, StatIcon } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePaquetes, usePackageState } from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useTraslados,
} from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { usePackageLoading } from "@/components/providers/PackageProvider";
import { calcularVenta } from "@/lib/utils";
import type { BadgeProps } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

// ---------------------------------------------------------------------------
// Animated stat counter component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  href?: string;
}

function StatCard({ icon: Icon, label, value, color, href }: StatCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  const inner = (
    <Card variant="stat" interactive={!!href}>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <StatIcon style={{ background: `${color}20`, color }}>
            <Icon size={20} strokeWidth={1.75} />
          </StatIcon>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">
              {label}
            </p>
            <motion.span className="text-3xl font-bold font-mono text-neutral-900 block">
              {rounded}
            </motion.span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH} h`;
  if (diffD === 1) return "Hace 1 dia";
  return `Hace ${diffD} dias`;
}

// ---------------------------------------------------------------------------
// Estado badge variant mapping
// ---------------------------------------------------------------------------

const estadoVariantMap: Record<string, BadgeProps["variant"]> = {
  ACTIVO: "active",
  BORRADOR: "draft",
  INACTIVO: "inactive",
};

const estadoLabelMap: Record<string, string> = {
  ACTIVO: "Activo",
  BORRADOR: "Borrador",
  INACTIVO: "Inactivo",
};

// ---------------------------------------------------------------------------
// Alert card component
// ---------------------------------------------------------------------------

interface AlertCardProps {
  severity: "warning" | "critical";
  icon: LucideIcon;
  count: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

function AlertCard({
  severity,
  icon: Icon,
  count,
  title,
  description,
  href,
  actionLabel,
}: AlertCardProps) {
  const isWarning = severity === "warning";
  const accent = isWarning ? "#E8913A" : "#CC2030";
  const bg = isWarning ? "rgba(254,245,235,0.35)" : "rgba(255,224,227,0.35)";
  const border = isWarning ? "rgba(232,145,58,0.35)" : "rgba(204,32,48,0.35)";

  return (
    <Link href={href}>
      <motion.div
        className="relative rounded-glass-lg overflow-hidden cursor-pointer h-full"
        style={{
          background: bg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${border}`,
          borderLeft: `3px solid ${accent}`,
        }}
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-glass-sm flex items-center justify-center"
              style={{ background: `${accent}15`, color: accent }}
            >
              <Icon size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: accent }}
                >
                  {count}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  {title}
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                {description}
              </p>
              <p
                className="text-xs font-medium mt-2 flex items-center gap-1"
                style={{ color: accent }}
              >
                {actionLabel} <ChevronRight size={12} />
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SVG donut chart component
// ---------------------------------------------------------------------------

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({
  segments,
  size = 110,
}: {
  segments: DonutSegment[];
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments
          .filter((s) => s.value > 0)
          .map((segment, i) => {
            const pct = segment.value / total;
            const length = pct * circumference;
            const gap = 3;
            const dashLen = Math.max(0, length - gap);
            const rotation = (accumulated / total) * 360 - 90;
            accumulated += segment.value;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeLinecap="round"
                transform={`rotate(${rotation} ${center} ${center})`}
                style={{ opacity: 0.85 }}
              />
            );
          })}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="text-xl font-bold font-mono"
          fill="#1a1a2e"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="text-[10px] font-medium uppercase"
          fill="#9ca3af"
        >
          total
        </text>
      </svg>
      <div className="space-y-2">
        {segments
          .filter((s) => s.value > 0)
          .map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: segment.color }}
              />
              <span className="text-xs text-neutral-500">{segment.label}</span>
              <span className="text-xs font-mono font-bold text-neutral-800">
                {segment.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick action button
// ---------------------------------------------------------------------------

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
}

function QuickAction({ icon: Icon, label, href, color }: QuickActionProps) {
  return (
    <Link href={href}>
      <motion.div
        className="flex items-center gap-3 px-3 py-2.5 rounded-glass-md cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="w-7 h-7 rounded-glass-sm flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const paquetes = usePaquetes();
  const packageState = usePackageState();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const { user } = useAuth();
  const { activeBrandId } = useBrand();
  const loading = usePackageLoading();

  // Paquete IDs for the current brand (non-deleted) -- used for cross-refs
  const brandPaqueteIds = useMemo(
    () => new Set(paquetes.map((p) => p.id)),
    [paquetes],
  );

  // ---- Stat 1: Paquetes Activos ----
  const activePaquetesCount = useMemo(
    () => paquetes.filter((p) => p.estado === "ACTIVO").length,
    [paquetes],
  );

  // ---- Stat 2: Paquetes por vencer (validezHasta within 7 days) ----
  const porVencer = useMemo(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return paquetes.filter((p) => {
      if (p.estado !== "ACTIVO") return false;
      const hasta = new Date(p.validezHasta);
      return hasta <= in7days && hasta >= now;
    });
  }, [paquetes]);

  // ---- Stat 3: Paquetes con precio manual ----
  const precioCustom = useMemo(
    () =>
      paquetes.filter((p) => {
        const expected = calcularVenta(p.netoCalculado, p.markup);
        return p.precioVenta !== expected;
      }),
    [paquetes],
  );

  // ---- Stat 4: Servicios sin asignar a ningun paquete ----
  const unassignedServices = useMemo(() => {
    const usedAereoIds = new Set(
      packageState.paqueteAereos
        .filter((pa) => brandPaqueteIds.has(pa.paqueteId))
        .map((pa) => pa.aereoId),
    );
    const unusedAereos = aereos.filter((a) => !usedAereoIds.has(a.id));

    const usedAlojIds = new Set(
      packageState.paqueteAlojamientos
        .filter((pa) => brandPaqueteIds.has(pa.paqueteId))
        .map((pa) => pa.alojamientoId),
    );
    const unusedAloj = alojamientos.filter((a) => !usedAlojIds.has(a.id));

    const usedTrasIds = new Set(
      packageState.paqueteTraslados
        .filter((pt) => brandPaqueteIds.has(pt.paqueteId))
        .map((pt) => pt.trasladoId),
    );
    const unusedTras = traslados.filter((t) => !usedTrasIds.has(t.id));

    return {
      aereos: unusedAereos,
      alojamientos: unusedAloj,
      traslados: unusedTras,
      total: unusedAereos.length + unusedAloj.length + unusedTras.length,
    };
  }, [aereos, alojamientos, traslados, packageState, brandPaqueteIds]);

  // ---- Donut chart: paquetes by estado ----
  const estadoCounts = useMemo(() => {
    const activos = paquetes.filter((p) => p.estado === "ACTIVO").length;
    const borradores = paquetes.filter((p) => p.estado === "BORRADOR").length;
    const inactivos = paquetes.filter((p) => p.estado === "INACTIVO").length;
    return { activos, borradores, inactivos };
  }, [paquetes]);

  // ---- Recent activity: last 6 paquetes sorted by updatedAt ----
  const recentPaquetes = useMemo(
    () =>
      [...paquetes]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6),
    [paquetes],
  );

  // ---- Build alert items (only shown when count > 0) ----
  const alerts = useMemo(() => {
    const items: AlertCardProps[] = [];

    if (porVencer.length > 0) {
      items.push({
        severity: "warning",
        icon: Calendar,
        count: porVencer.length,
        title:
          porVencer.length === 1
            ? "paquete vence esta semana"
            : "paquetes vencen esta semana",
        description: porVencer.map((p) => p.titulo).join(", "),
        href: "/paquetes",
        actionLabel: "Ver paquetes",
      });
    }

    if (precioCustom.length > 0) {
      items.push({
        severity: "warning",
        icon: DollarSign,
        count: precioCustom.length,
        title:
          precioCustom.length === 1
            ? "paquete con precio manual"
            : "paquetes con precio manual",
        description: "Precio de venta sobreescrito manualmente",
        href: "/paquetes",
        actionLabel: "Revisar precios",
      });
    }

    if (unassignedServices.total > 0) {
      const parts: string[] = [];
      if (unassignedServices.aereos.length > 0)
        parts.push(
          `${unassignedServices.aereos.length} aereo${unassignedServices.aereos.length > 1 ? "s" : ""}`,
        );
      if (unassignedServices.alojamientos.length > 0)
        parts.push(
          `${unassignedServices.alojamientos.length} alojamiento${unassignedServices.alojamientos.length > 1 ? "s" : ""}`,
        );
      if (unassignedServices.traslados.length > 0)
        parts.push(
          `${unassignedServices.traslados.length} traslado${unassignedServices.traslados.length > 1 ? "s" : ""}`,
        );

      items.push({
        severity: "critical",
        icon: Unlink,
        count: unassignedServices.total,
        title:
          unassignedServices.total === 1
            ? "servicio sin asignar"
            : "servicios sin asignar",
        description: parts.join(", ") + " cargados sin paquete",
        href: "/aereos",
        actionLabel: "Ver servicios",
      });
    }

    return items;
  }, [porVencer, precioCustom, unassignedServices]);

  // ---- User info for greeting ----
  const firstName = user?.name.split(" ")[0] ?? "";
  const initials = useMemo(
    () =>
      user?.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() ?? "??",
    [user],
  );

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <div>
      {/* ----------------------------------------------------------------- */}
      {/* Greeting                                                           */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-display text-[26px] font-bold text-neutral-900 tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">
          Resumen general del sistema
        </p>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Alerts -- only rendered when there are actionable items             */}
      {/* ----------------------------------------------------------------- */}
      {alerts.length > 0 && (
        <motion.div
          className="mb-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <AlertCard {...alert} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Stat cards row                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Package}
          label="Paquetes Activos"
          value={activePaquetesCount}
          color="#3BBFAD"
          href="/paquetes"
        />
        <StatCard
          icon={Calendar}
          label="Por Vencer"
          value={porVencer.length}
          color="#E8913A"
        />
        <StatCard
          icon={DollarSign}
          label="Precio Custom"
          value={precioCustom.length}
          color="#8B5CF6"
        />
        <StatCard
          icon={Unlink}
          label="Sin Asignar"
          value={unassignedServices.total}
          color="#2B8AFF"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Two-column layout: Activity feed + Quick actions / Donut            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* -- Left: Activity feed (2/3 width on lg) -- */}
        <div className="lg:flex-[2]">
          <Card variant="default">
            <CardHeader>
              <h2 className="text-base font-semibold text-neutral-800">
                Actividad Reciente
              </h2>
            </CardHeader>
            <CardContent>
              {recentPaquetes.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">
                  Sin actividad reciente
                </p>
              ) : (
                <div className="space-y-1">
                  {recentPaquetes.map((paquete) => {
                    const isNew = paquete.createdAt === paquete.updatedAt;
                    return (
                      <Link
                        key={paquete.id}
                        href={`/paquetes/${paquete.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 hover:bg-white/20 rounded-md px-2 -mx-2 transition-colors">
                          {/* User avatar */}
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide"
                            style={{
                              background: "rgba(139,92,246,0.1)",
                              color: "#8B5CF6",
                            }}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-800">
                              <span className="font-semibold">{initials}</span>{" "}
                              <span className="text-neutral-500">
                                {isNew ? "creo" : "edito"}
                              </span>{" "}
                              <span className="font-medium">
                                {paquete.titulo}
                              </span>
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {relativeTime(paquete.updatedAt)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              estadoVariantMap[paquete.estado] ?? "draft"
                            }
                            size="sm"
                          >
                            {estadoLabelMap[paquete.estado] ?? paquete.estado}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* -- Right column (1/3 width on lg) -- */}
        <div className="lg:flex-[1] space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-base font-semibold text-neutral-800 mb-3">
              Acciones Rapidas
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
                label="Nuevo aereo"
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
          </div>

          {/* Donut chart: Paquetes por Estado */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-800">
                  Paquetes por Estado
                </h2>
                <Link
                  href="/reportes"
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Ver reportes
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <DonutChart
                segments={[
                  {
                    label: "Activos",
                    value: estadoCounts.activos,
                    color: "#3BBFAD",
                  },
                  {
                    label: "Borradores",
                    value: estadoCounts.borradores,
                    color: "#6B6F99",
                  },
                  {
                    label: "Inactivos",
                    value: estadoCounts.inactivos,
                    color: "#C4C6D9",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
