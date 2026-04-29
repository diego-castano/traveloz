"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { colorForIndex, type GroupBucket } from "./metrics";

interface GroupDonutChartProps {
  data: GroupBucket[];
  /** Height of the SVG area in pixels. */
  height?: number;
  /** Maximum legend entries before "Otros" bucket is used. */
  maxLegendRows?: number;
  /** Total label rendered in the hole — defaults to "total". */
  totalLabel?: string;
}

export function GroupDonutChart({
  data,
  height = 220,
  maxLegendRows = 8,
  totalLabel = "total",
}: GroupDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Collapse tail into "Otros" for legend clarity
  const truncated =
    data.length > maxLegendRows
      ? [
          ...data.slice(0, maxLegendRows - 1),
          {
            key: "Otros",
            label: "Otros",
            count: data
              .slice(maxLegendRows - 1)
              .reduce((s, d) => s + d.count, 0),
          },
        ]
      : data;

  if (total === 0 || truncated.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-neutral-400"
        style={{ height }}
      >
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="flex items-center gap-5"
    >
      <div className="relative flex-shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={truncated}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              cornerRadius={4}
              animationDuration={700}
              animationEasing="ease-out"
              strokeWidth={0}
            >
              {truncated.map((_, i) => (
                <Cell key={i} fill={colorForIndex(i)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const datum = payload[0].payload as GroupBucket;
                const pct = ((datum.count / total) * 100).toFixed(0);
                return (
                  <div className="rounded-lg border border-hairline bg-white px-3 py-2 shadow-lg">
                    <p className="text-xs font-medium text-neutral-800">
                      {datum.label}
                    </p>
                    <p className="text-sm font-bold font-mono text-neutral-900">
                      {datum.count}{" "}
                      <span className="text-xs font-normal text-neutral-500">
                        ({pct}%)
                      </span>
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centered total */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold font-mono text-neutral-900"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {total}
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {totalLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {truncated.map((segment, i) => {
          const pct = (segment.count / total) * 100;
          return (
            <motion.div
              key={segment.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.15 + i * 0.04 }}
              className="flex items-center gap-2.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ background: colorForIndex(i) }}
              />
              <span className="text-xs text-neutral-600 flex-1 truncate">
                {segment.label}
              </span>
              <span className="text-xs font-mono font-bold text-neutral-800 tabular-nums">
                {segment.count}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 tabular-nums w-8 text-right">
                {pct.toFixed(0)}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
