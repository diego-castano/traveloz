"use client";

import { useEffect, useMemo } from "react";
import { Package, Plane, Hotel } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data/DataTable";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  usePaquetes,
  usePackageState,
} from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
} from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { usePackageLoading } from "@/components/providers/PackageProvider";

// ---------------------------------------------------------------------------
// AnimatedCounter -- reusable inline component
// ---------------------------------------------------------------------------

interface AnimatedCounterProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function AnimatedCounter({ icon, label, value, color }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [count, value]);

  return (
    <div className="rounded-[12px] border border-hairline bg-white p-5">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{
            background: `linear-gradient(135deg, ${color}26, ${color}0d)`,
          }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">
            {label}
          </p>
          <motion.span className="text-3xl font-bold font-mono text-neutral-900">
            {rounded}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportesPage
// ---------------------------------------------------------------------------

export default function ReportesPage() {
  const { activeBrandId } = useBrand();

  // Brand-filtered primary data
  const paquetes = usePaquetes(); // already brand-filtered, no deletedAt
  const aereos = useAereos();     // already brand-filtered, no deletedAt
  const alojamientos = useAlojamientos(); // already brand-filtered, no deletedAt
  const packageState = usePackageState();
  const loading = usePackageLoading();

  // Brand-safe paquete IDs set (prevents cross-brand data leaks via junction tables)
  const paqueteIds = useMemo(
    () => new Set(paquetes.map((p) => p.id)),
    [paquetes],
  );

  // Brand-filtered junction records
  const brandPaqueteAereos = useMemo(
    () => packageState.paqueteAereos.filter((pa) => paqueteIds.has(pa.paqueteId)),
    [packageState.paqueteAereos, paqueteIds],
  );
  const brandPaqueteAlojamientos = useMemo(
    () =>
      packageState.paqueteAlojamientos.filter((pa) =>
        paqueteIds.has(pa.paqueteId),
      ),
    [packageState.paqueteAlojamientos, paqueteIds],
  );

  // ---------------------------------------------------------------------------
  // Stat card values
  // ---------------------------------------------------------------------------

  const paquetesActivosCount = useMemo(
    () => paquetes.filter((p) => p.estado === "ACTIVO").length,
    [paquetes],
  );

  const aereosCount = aereos.length;
  const alojamientosCount = alojamientos.length;

  // ---------------------------------------------------------------------------
  // Bar chart: Paquetes por Destino
  // ---------------------------------------------------------------------------

  const destinoChartData = useMemo(() => {
    // Build aereoId -> destino map
    const aereoMap: Record<string, string> = {};
    for (const a of aereos) {
      aereoMap[a.id] = a.destino;
    }

    // Count paquetes per destino (active only)
    const activePaquetes = paquetes.filter((p) => p.estado === "ACTIVO");
    const counts: Record<string, number> = {};

    for (const paquete of activePaquetes) {
      const firstAereoAssignment = brandPaqueteAereos.find(
        (pa) => pa.paqueteId === paquete.id,
      );
      const destino =
        firstAereoAssignment && aereoMap[firstAereoAssignment.aereoId]
          ? aereoMap[firstAereoAssignment.aereoId]
          : "Otro";
      counts[destino] = (counts[destino] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([destino, count]) => ({ destino, count }))
      .sort((a, b) => b.count - a.count);
  }, [paquetes, aereos, brandPaqueteAereos]);

  // ---------------------------------------------------------------------------
  // Hoteles mas usados table
  // ---------------------------------------------------------------------------

  const hotelesData = useMemo(() => {
    // Build alojamientoId -> nombre map
    const alojamientoMap: Record<string, string> = {};
    for (const a of alojamientos) {
      alojamientoMap[a.id] = a.nombre;
    }

    // Count occurrences of each alojamientoId
    const counts: Record<string, number> = {};
    for (const pa of brandPaqueteAlojamientos) {
      counts[pa.alojamientoId] = (counts[pa.alojamientoId] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([alojamientoId, count]) => ({
        nombre: alojamientoMap[alojamientoId] ?? "Desconocido",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [alojamientos, brandPaqueteAlojamientos]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <>
      <DataTablePageHeader
        title="Reportes"
        subtitle="Metricas y reportes del sistema"
      />

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <AnimatedCounter
          icon={<Package className="h-5 w-5" />}
          label="Paquetes Activos"
          value={paquetesActivosCount}
          color="#3BBFAD"
        />
        <AnimatedCounter
          icon={<Plane className="h-5 w-5" />}
          label="Aereos"
          value={aereosCount}
          color="#8B5CF6"
        />
        <AnimatedCounter
          icon={<Hotel className="h-5 w-5" />}
          label="Alojamientos"
          value={alojamientosCount}
          color="#E8913A"
        />
      </div>

      {/* Charts + Table Row */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Bar Chart: Paquetes por Destino (2/3 width on lg) */}
        <div className="flex-1 lg:basis-2/3">
          <div className="rounded-[12px] border border-hairline bg-white p-5">
            <p className="text-base font-semibold text-neutral-800 mb-3">
              Paquetes por Destino
            </p>
            {destinoChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-sm text-neutral-400">
                Sin datos para grafico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={destinoChartData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(26,26,46,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="destino"
                    tick={{ fill: "rgba(26,26,46,0.5)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(26,26,46,0.4)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.98)",
                      border: "1px solid rgba(17,17,36,0.07)",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "rgba(26,26,46,0.8)",
                    }}
                    cursor={{ fill: "rgba(59,191,173,0.06)" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="rgba(59,191,173,0.75)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hoteles Mas Usados Table (1/3 width on lg) */}
        <div className="lg:basis-1/3">
          <div className="rounded-[12px] border border-hairline bg-white">
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-semibold text-neutral-800">
                Hoteles Mas Usados
              </p>
            </div>
            {hotelesData.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-neutral-400 px-5 pb-5">
                Sin datos de hoteles
              </div>
            ) : (
              <DataTable>
                <DataTableHeader sticky={false}>
                  <DataTableRow header>
                    <DataTableHead>Hotel</DataTableHead>
                    <DataTableHead align="right">Paquetes</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {hotelesData.map((hotel, idx) => (
                    <DataTableRow
                      key={`${hotel.nombre}-${idx}`}
                      interactive={false}
                    >
                      <DataTableCell variant="primary">
                        {hotel.nombre}
                      </DataTableCell>
                      <DataTableCell variant="mono" align="right">
                        {hotel.count}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
