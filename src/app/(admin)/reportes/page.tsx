"use client";

import { useEffect, useMemo } from "react";
import { Package, Plane, Hotel } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardHeader,
  CardContent,
  StatIcon,
} from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { glassMaterials } from "@/components/lib/glass";
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
    <Card variant="stat">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <StatIcon style={{ background: `linear-gradient(135deg, ${color}26, ${color}0d)` }}>
            <span style={{ color }}>{icon}</span>
          </StatIcon>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">
              {label}
            </p>
            <motion.span className="text-3xl font-bold font-mono text-neutral-900">
              {rounded}
            </motion.span>
          </div>
        </div>
      </CardContent>
    </Card>
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
      <PageHeader title="Reportes" subtitle="Metricas y reportes del sistema" />

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
          <Card variant="default">
            <CardHeader>
              <p className="text-base font-semibold text-neutral-800">
                Paquetes por Destino
              </p>
            </CardHeader>
            <CardContent>
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
                        ...glassMaterials.frosted,
                        border: "none",
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
            </CardContent>
          </Card>
        </div>

        {/* Hoteles Mas Usados Table (1/3 width on lg) */}
        <div className="lg:basis-1/3">
          <Card variant="default">
            <CardHeader>
              <p className="text-base font-semibold text-neutral-800">
                Hoteles Mas Usados
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {hotelesData.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-neutral-400 px-5 pb-5">
                  Sin datos de hoteles
                </div>
              ) : (
                <Table className="rounded-none shadow-none border-0 animate-none">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Paquetes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotelesData.map((hotel, idx) => (
                      <TableRow key={`${hotel.nombre}-${idx}`}>
                        <TableCell className="font-medium text-neutral-800">
                          {hotel.nombre}
                        </TableCell>
                        <TableCell variant="id" className="font-mono font-semibold text-neutral-700">
                          {hotel.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
