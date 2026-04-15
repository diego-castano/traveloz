"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Package,
  FileText,
  Layers,
  Globe2,
  DollarSign,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Plus,
  Plane,
  Hotel,
  Bell,
  BarChart3,
  Sparkles,
  Clock,
} from "lucide-react";
import { usePaquetes, useAllOpcionesHoteleras, usePackageState } from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useTraslados,
  useSeguros,
  useCircuitos,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import {
  useTemporadas,
  useTiposPaquete,
  usePaises,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { DestinoBarChart } from "./DestinoBarChart";
import { GroupDonutChart } from "./GroupDonutChart";
import {
  buildPaisResolver,
  groupPaquetesByPais,
  groupPaquetesByTemporada,
  groupPaquetesByTipo,
  countPaquetesSinOpcion,
  countServiciosConPreciosVencidos,
  paquetesProximosAVencer,
  buildActivityFeed,
  relativeTime,
  getGreeting,
  formatFecha,
} from "./metrics";

// ---------------------------------------------------------------------------
// StatCard — animated counter on mount
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  href?: string;
  delay?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  delay = 0,
}: StatCardProps) {
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

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={href ? { y: -3 } : undefined}
      className="group relative overflow-hidden rounded-[14px] border border-hairline bg-white p-5 transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(17,17,36,0.12)]"
    >
      {/* Accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity group-hover:opacity-100"
        style={{ background: color }}
      />
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `${color}14`, color }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {label}
          </p>
          <motion.span className="mt-1 block font-mono text-[28px] font-bold leading-tight text-neutral-900 tabular-nums">
            {rounded}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
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
  const border = isWarning ? "rgba(232,145,58,0.25)" : "rgba(239,68,68,0.25)";

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
// Activity type → icon + color
// ---------------------------------------------------------------------------

const activityMeta: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  paquete: { icon: Package, color: "#8B5CF6", label: "Paquete" },
  aereo: { icon: Plane, color: "#2B8AFF", label: "Aéreo" },
  alojamiento: { icon: Hotel, color: "#E8913A", label: "Hotel" },
  traslado: { icon: Calendar, color: "#10B981", label: "Traslado" },
  seguro: { icon: FileText, color: "#EF4444", label: "Seguro" },
  circuito: { icon: Layers, color: "#6366F1", label: "Circuito" },
};

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "").split(" ")[0];
  const initials = useMemo(
    () =>
      (user?.name ?? "")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "??",
    [user],
  );

  // ---- Providers ----
  const paquetes = usePaquetes();
  const opciones = useAllOpcionesHoteleras();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();
  const temporadas = useTemporadas();
  const tipos = useTiposPaquete();
  const paises = usePaises();

  // ---- Active paquetes subset (charts only include activos) ----
  const paquetesActivos = useMemo(
    () => paquetes.filter((p) => p.estado === "ACTIVO"),
    [paquetes],
  );
  const paquetesBorrador = useMemo(
    () => paquetes.filter((p) => p.estado === "BORRADOR"),
    [paquetes],
  );

  // ---- Country resolver (paquete → dominant país via linked alojamientos) ----
  const paisResolver = useMemo(
    () =>
      buildPaisResolver(
        packageState.paqueteAlojamientos,
        alojamientos,
        paises,
      ),
    [packageState.paqueteAlojamientos, alojamientos, paises],
  );

  // ---- Stat cards ----
  const totalServicios =
    aereos.length +
    alojamientos.length +
    traslados.length +
    seguros.length +
    circuitos.length;

  const destinosCubiertos = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetesActivos) {
      const pid = paisResolver.paisIdFor(p.id);
      if (pid) set.add(pid);
    }
    return set.size;
  }, [paquetesActivos, paisResolver]);

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
    [aereos, serviceState.preciosAereo, alojamientos, serviceState.preciosAlojamiento],
  );
  const proximosAVencer = useMemo(
    () => paquetesProximosAVencer(paquetes),
    [paquetes],
  );

  // ---- Chart data ----
  const destinoData = useMemo(
    () => groupPaquetesByPais(paquetesActivos, paisResolver),
    [paquetesActivos, paisResolver],
  );
  const temporadaData = useMemo(
    () => groupPaquetesByTemporada(paquetesActivos, temporadas),
    [paquetesActivos, temporadas],
  );
  const tipoData = useMemo(
    () => groupPaquetesByTipo(paquetesActivos, tipos),
    [paquetesActivos, tipos],
  );

  // ---- Activity feed ----
  const activity = useMemo(
    () =>
      buildActivityFeed({
        paquetes,
        aereos,
        alojamientos,
        traslados,
        seguros,
        circuitos,
        limit: 8,
      }),
    [paquetes, aereos, alojamientos, traslados, seguros, circuitos],
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
  if (proximosAVencer.length > 0) {
    alerts.push({
      severity: "warning",
      icon: Clock,
      count: proximosAVencer.length,
      title:
        proximosAVencer.length === 1
          ? "paquete vence en 14 días"
          : "paquetes vencen en 14 días",
      description: proximosAVencer.map((p) => p.titulo).slice(0, 3).join(", "),
      href: "/paquetes",
      actionLabel: "Ver paquetes",
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert, i) => (
            <AlertCard key={i} {...alert} delay={0.1 + i * 0.05} />
          ))}
        </div>
      )}

      {/* =================== 3. Stats row (4 cards) =================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Paquetes Activos"
          value={paquetesActivos.length}
          color="#3BBFAD"
          href="/paquetes"
          delay={0}
        />
        <StatCard
          icon={FileText}
          label="Paquetes Borrador"
          value={paquetesBorrador.length}
          color="#E8913A"
          href="/paquetes"
          delay={0.05}
        />
        <StatCard
          icon={Layers}
          label="Total Servicios"
          value={totalServicios}
          color="#8B5CF6"
          delay={0.1}
        />
        <StatCard
          icon={Globe2}
          label="Destinos cubiertos"
          value={destinosCubiertos}
          color="#2B8AFF"
          delay={0.15}
        />
      </div>

      {/* =================== 4. Charts row =================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Destinos (horizontal bar) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-[14px] border border-hairline bg-white p-5"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">
                Paquetes por destino
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Países cubiertos por los paquetes activos
              </p>
            </div>
            <Globe2 size={14} className="text-neutral-300" />
          </header>
          <DestinoBarChart data={destinoData} maxRows={10} />
        </motion.section>

        {/* Temporada (donut) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="rounded-[14px] border border-hairline bg-white p-5"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">
                Paquetes por temporada
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Distribución según temporada configurada
              </p>
            </div>
            <Calendar size={14} className="text-neutral-300" />
          </header>
          <GroupDonutChart data={temporadaData} height={220} />
        </motion.section>
      </div>

      {/* =================== 5. Activity + Quick actions + Tipo donut =================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Activity feed (2/3) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="rounded-[14px] border border-hairline bg-white p-5 lg:col-span-2"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">
                Actividad reciente
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Últimos paquetes y servicios editados
              </p>
            </div>
          </header>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              Sin actividad reciente
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {activity.map((item, i) => {
                const meta = activityMeta[item.type];
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.35 + i * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 py-3"
                    >
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: `${meta.color}14`, color: meta.color }}
                      >
                        <Icon size={15} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-neutral-800 group-hover:text-[#8B5CF6] transition-colors">
                          {item.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-400">
                          <span
                            className="font-mono font-semibold uppercase tracking-wider"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span>·</span>
                          <span>{initials}</span>
                          <span>{item.isNew ? "creó" : "editó"}</span>
                          <span>·</span>
                          <span>{relativeTime(item.updatedAt)}</span>
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-neutral-300 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* Right column: Quick actions + Tipo donut */}
        <div className="space-y-4">
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

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.4 }}
            className="rounded-[14px] border border-hairline bg-white p-5"
          >
            <h2 className="mb-4 text-[15px] font-semibold text-neutral-900">
              Paquetes por tipo
            </h2>
            <GroupDonutChart data={tipoData} height={180} maxLegendRows={6} />
          </motion.section>
        </div>
      </div>
    </div>
  );
}
