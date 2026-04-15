"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Package,
  Globe2,
  Sparkles,
  Calendar,
  ArrowRight,
  MapPin,
} from "lucide-react";
import {
  usePaquetes,
  usePackageState,
} from "@/components/providers/PackageProvider";
import { useAlojamientos } from "@/components/providers/ServiceProvider";
import {
  useTemporadas,
  usePaises,
} from "@/components/providers/CatalogProvider";
import { DestinoBarChart } from "./DestinoBarChart";
import {
  buildPaisResolver,
  groupPaquetesByPais,
  countNuevosEstaSemana,
  currentTemporada,
  getGreeting,
  formatFecha,
  colorForIndex,
} from "./metrics";
import { formatCurrency } from "@/lib/utils";
import type { Paquete, PaqueteFoto, Temporada } from "@/lib/types";

// ---------------------------------------------------------------------------
// Stat card (simpler variant — no href, soft background)
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: StatCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const isNumeric = typeof value === "number";

  useEffect(() => {
    if (!isNumeric) return;
    const controls = animate(count, value as number, {
      duration: 1.1,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [value, count, delay, isNumeric]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[14px] border border-hairline bg-white p-5"
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
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
          {isNumeric ? (
            <motion.span className="mt-1 block font-mono text-[28px] font-bold leading-tight text-neutral-900 tabular-nums">
              {rounded}
            </motion.span>
          ) : (
            <span className="mt-1 block truncate font-display text-[18px] font-bold leading-tight text-neutral-900">
              {value}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PaqueteCard — photo-first card for the vendedor grid
// ---------------------------------------------------------------------------

interface PaqueteCardProps {
  paquete: Paquete;
  foto?: PaqueteFoto;
  destino: string;
  temporada?: Temporada;
  index: number;
}

function PaqueteCard({
  paquete,
  foto,
  destino,
  temporada,
  index,
}: PaqueteCardProps) {
  const cover = foto?.url;
  const temporadaColor = colorForIndex(
    (temporada?.orden ?? 0) % 10,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 + index * 0.04 }}
    >
      <Link href={`/paquetes/${paquete.id}`} className="block">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="group overflow-hidden rounded-[14px] border border-hairline bg-white transition-shadow hover:shadow-[0_10px_30px_-16px_rgba(17,17,36,0.22)]"
        >
          {/* Photo area */}
          <div
            className="relative aspect-[16/10] w-full overflow-hidden"
            style={{
              background: cover
                ? undefined
                : `linear-gradient(135deg, ${temporadaColor}22 0%, ${temporadaColor}08 100%)`,
            }}
          >
            {cover ? (
              <img
                src={cover}
                alt={foto?.alt ?? paquete.titulo}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <Package size={40} strokeWidth={1.25} />
              </div>
            )}

            {/* Gradient overlay + destino badge */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

            {temporada && (
              <div className="absolute left-3 top-3">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm"
                  style={{
                    background: `${temporadaColor}E6`,
                  }}
                >
                  {temporada.nombre.replace(/\s*\(.*\)/, "").trim()}
                </span>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-2 flex items-center gap-1.5 text-[11px] font-medium text-white">
              <MapPin size={11} strokeWidth={2.25} />
              <span className="truncate">{destino}</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            <h3 className="line-clamp-2 font-display text-[14px] font-semibold leading-tight text-neutral-900 group-hover:text-[#8B5CF6] transition-colors">
              {paquete.titulo}
            </h3>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  Desde
                </p>
                <p className="font-mono text-[18px] font-bold leading-tight text-neutral-900 tabular-nums">
                  {paquete.precioVenta > 0
                    ? formatCurrency(paquete.precioVenta)
                    : "—"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8B5CF6] opacity-0 transition-opacity group-hover:opacity-100">
                Ver <ArrowRight size={11} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VendedorDashboard
// ---------------------------------------------------------------------------

export default function VendedorDashboard() {
  const paquetes = usePaquetes();
  const packageState = usePackageState();
  const alojamientos = useAlojamientos();
  const paises = usePaises();
  const temporadas = useTemporadas();

  const paquetesActivos = useMemo(
    () => paquetes.filter((p) => p.estado === "ACTIVO"),
    [paquetes],
  );

  // ---- País resolver ----
  const paisResolver = useMemo(
    () =>
      buildPaisResolver(
        packageState.paqueteAlojamientos,
        alojamientos,
        paises,
      ),
    [packageState.paqueteAlojamientos, alojamientos, paises],
  );

  // ---- Stats ----
  const destinosCount = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetesActivos) {
      const pid = paisResolver.paisIdFor(p.id);
      if (pid) set.add(pid);
    }
    return set.size;
  }, [paquetesActivos, paisResolver]);

  const nuevosEstaSemana = useMemo(
    () => countNuevosEstaSemana(paquetesActivos),
    [paquetesActivos],
  );

  const tempActual = useMemo(
    () => currentTemporada(temporadas),
    [temporadas],
  );

  // ---- Latest 8 paquetes (by createdAt desc) ----
  const temporadaById = useMemo(() => {
    const m = new Map<string, Temporada>();
    for (const t of temporadas) m.set(t.id, t);
    return m;
  }, [temporadas]);

  const fotosByPaquete = useMemo(() => {
    const m = new Map<string, PaqueteFoto>();
    const sorted = [...packageState.paqueteFotos].sort(
      (a, b) => a.orden - b.orden,
    );
    for (const f of sorted) {
      if (!m.has(f.paqueteId)) m.set(f.paqueteId, f);
    }
    return m;
  }, [packageState.paqueteFotos]);

  const latestPaquetes = useMemo(
    () =>
      [...paquetesActivos]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )
        .slice(0, 8),
    [paquetesActivos],
  );

  // ---- Destino chart ----
  const destinoData = useMemo(
    () => groupPaquetesByPais(paquetesActivos, paisResolver),
    [paquetesActivos, paisResolver],
  );

  return (
    <div className="space-y-6">
      {/* =================== 1. Greeting =================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-baseline justify-between gap-2"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-neutral-900">
            {getGreeting()}
          </h1>
          <p className="mt-0.5 text-[13px] text-neutral-400">{formatFecha()}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1"
        >
          <Sparkles size={12} className="text-[#3BBFAD]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Panel Vendedor
          </span>
        </motion.div>
      </motion.div>

      {/* =================== 2. Stats row =================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Paquetes Disponibles"
          value={paquetesActivos.length}
          color="#3BBFAD"
          delay={0}
        />
        <StatCard
          icon={Globe2}
          label="Destinos"
          value={destinosCount}
          color="#8B5CF6"
          delay={0.05}
        />
        <StatCard
          icon={Sparkles}
          label="Nuevos esta semana"
          value={nuevosEstaSemana}
          color="#E8913A"
          delay={0.1}
        />
        <StatCard
          icon={Calendar}
          label="Temporada actual"
          value={
            tempActual?.nombre.replace(/\s*\(.*\)/, "").trim() ?? "—"
          }
          color="#2B8AFF"
          delay={0.15}
        />
      </div>

      {/* =================== 3. Latest packages grid =================== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">
              Últimos paquetes agregados
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Los más recientes para cotizar
            </p>
          </div>
          <Link
            href="/paquetes"
            className="flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] hover:underline"
          >
            Ver todos <ArrowRight size={11} strokeWidth={2.5} />
          </Link>
        </header>

        {latestPaquetes.length === 0 ? (
          <div className="rounded-[14px] border border-hairline bg-white p-12 text-center">
            <Package
              size={32}
              strokeWidth={1.25}
              className="mx-auto mb-3 text-neutral-300"
            />
            <p className="text-sm text-neutral-400">
              No hay paquetes activos aún
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latestPaquetes.map((p, i) => (
              <PaqueteCard
                key={p.id}
                paquete={p}
                foto={fotosByPaquete.get(p.id)}
                destino={
                  paisResolver.paisNombreFor(p.id) ??
                  p.destino ??
                  "—"
                }
                temporada={
                  p.temporadaId ? temporadaById.get(p.temporadaId) : undefined
                }
                index={i}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* =================== 4. Destino chart =================== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-[14px] border border-hairline bg-white p-5"
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">
              Paquetes por destino
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Cantidad de paquetes disponibles por país
            </p>
          </div>
          <Globe2 size={14} className="text-neutral-300" />
        </header>
        <DestinoBarChart data={destinoData} maxRows={10} clickable />
      </motion.section>
    </div>
  );
}
