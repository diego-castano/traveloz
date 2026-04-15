"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "motion/react";
import { colorForIndex, type GroupBucket } from "./metrics";

interface DestinoBarChartProps {
  data: GroupBucket[];
  /** Max rows to show — rest are collapsed into "Otros". */
  maxRows?: number;
  /** If true, clicking a bar navigates to /paquetes filtered by country. */
  clickable?: boolean;
}

export function DestinoBarChart({
  data,
  maxRows = 10,
  clickable = true,
}: DestinoBarChartProps) {
  const router = useRouter();

  // Collapse the tail into "Otros" so the chart stays readable at small sizes
  const truncated =
    data.length > maxRows
      ? [
          ...data.slice(0, maxRows - 1),
          {
            key: "Otros",
            label: "Otros",
            count: data
              .slice(maxRows - 1)
              .reduce((sum, d) => sum + d.count, 0),
          },
        ]
      : data;

  const chartHeight = Math.max(240, truncated.length * 32 + 40);

  function handleBarClick(data: { label?: string } | null) {
    if (!clickable || !data?.label || data.label === "Otros") return;
    router.push(`/paquetes?destino=${encodeURIComponent(data.label)}`);
  }

  if (truncated.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-neutral-400">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{ width: "100%", height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={truncated}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
          barCategoryGap={6}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#8A8DB5" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "#1A1A2E", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={110}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(139,92,246,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum = payload[0].payload as GroupBucket;
              return (
                <div
                  className="rounded-lg border border-hairline bg-white px-3 py-2 shadow-lg"
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  <p className="text-xs font-medium text-neutral-800">
                    {datum.label}
                  </p>
                  <p className="text-sm font-bold font-mono text-neutral-900">
                    {datum.count}{" "}
                    <span className="text-xs font-normal text-neutral-500">
                      {datum.count === 1 ? "paquete" : "paquetes"}
                    </span>
                  </p>
                  {clickable && datum.label !== "Otros" && (
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Click para ver
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar
            dataKey="count"
            radius={[0, 6, 6, 0]}
            onClick={handleBarClick as any}
            style={clickable ? { cursor: "pointer" } : undefined}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {truncated.map((_, i) => (
              <Cell key={i} fill={colorForIndex(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
