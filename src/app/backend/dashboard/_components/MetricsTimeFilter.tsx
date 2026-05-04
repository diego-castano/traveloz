"use client";

/**
 * Server-aggregated KPI strip for the AdminDashboard.
 *
 * Shows real Prisma-counted metrics (not derived from the in-memory provider)
 * for a configurable time range (30 / 90 / 365 days, year-to-date, all time)
 * and renders period-over-period deltas. Caches at the server via the
 * `getDashboardMetrics` action's `unstable_cache`, so flipping ranges only
 * costs a network call when the bucket isn't warm.
 */

import { useEffect, useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar, RefreshCw } from "lucide-react";
import {
  getDashboardMetrics,
  type DashboardMetrics,
  type RangeKey,
} from "@/actions/dashboard.actions";

const RANGE_LABEL: Record<RangeKey, string> = {
  "30d": "30 días",
  "90d": "90 días",
  "365d": "365 días",
  ytd: "YTD",
  all: "Todo",
};

const RANGE_ORDER: RangeKey[] = ["30d", "90d", "365d", "ytd", "all"];

export function MetricsTimeFilter() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const next = await getDashboardMetrics(range);
        setData(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red");
      }
    });
  }, [range]);

  return (
    <section className="rounded-[14px] border border-hairline bg-white p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-neutral-900">Actividad por período</h2>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Conteos calculados en la base de datos · comparados con el período anterior
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-neutral-50 p-1">
          <Calendar size={11} className="ml-2 text-neutral-400" />
          {RANGE_ORDER.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-[#8B5CF6] text-white shadow-[0_2px_6px_-2px_rgba(139,92,246,0.55)]"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                aria-pressed={active}
              >
                {RANGE_LABEL[r]}
              </button>
            );
          })}
          {isPending && (
            <RefreshCw
              size={11}
              className="ml-1 mr-1 animate-spin text-neutral-400"
              aria-label="Cargando"
            />
          )}
        </div>
      </header>

      {error ? (
        <p className="rounded-[10px] border border-[#EF4444]/20 bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#B91C1C]">
          {error}
        </p>
      ) : !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[80px] animate-pulse rounded-[12px] bg-neutral-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Paquetes creados"
            value={data.current.creados}
            delta={data.delta.creadosPct}
            previousValue={data.previous?.creados}
          />
          <KpiCard
            label="Publicados (cambios a Activo)"
            value={data.current.publicados}
            delta={data.delta.publicadosPct}
            previousValue={data.previous?.publicados}
          />
          <KpiCard
            label="Por vencer (próximos 14 d)"
            value={data.current.porVencer14d}
            tone={data.current.porVencer14d > 0 ? "warning" : "neutral"}
          />
        </div>
      )}
    </section>
  );
}

function KpiCard({
  label,
  value,
  delta,
  previousValue,
  tone = "neutral",
}: {
  label: string;
  value: number;
  delta?: number | null;
  previousValue?: number;
  tone?: "neutral" | "warning";
}) {
  const isUp = (delta ?? 0) > 0;
  const isFlat = (delta ?? 0) === 0;
  const arrow = delta == null ? Minus : isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const ArrowIcon = arrow;
  const trendColor =
    delta == null || isFlat
      ? "#6B6F99"
      : isUp
        ? "#10B981"
        : "#EF4444";

  return (
    <div
      className="flex flex-col gap-1 rounded-[12px] border px-4 py-3.5"
      style={{
        borderColor: tone === "warning" ? "rgba(232,145,58,0.25)" : "rgba(17,17,36,0.07)",
        background: tone === "warning" ? "#FEF7EC" : "#FFFFFF",
      }}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-bold leading-none tabular-nums text-neutral-900">
          {value.toLocaleString("es-AR")}
        </span>
        {delta != null && (
          <span
            className="flex items-center gap-0.5 text-[12px] font-semibold"
            style={{ color: trendColor }}
          >
            <ArrowIcon size={11} strokeWidth={2.5} />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {previousValue != null && (
        <p className="text-[11px] text-neutral-400">
          Período anterior: <span className="font-mono tabular-nums">{previousValue}</span>
        </p>
      )}
    </div>
  );
}
