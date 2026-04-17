"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Package as PackageIcon, ArrowRight } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { formatCurrency } from "@/lib/utils";
import type {
  Paquete,
  PaqueteFoto,
  Temporada,
  TipoPaquete,
} from "@/lib/types";

/**
 * PaqueteGridCard — photo-first card for the admin paquetes grid view.
 *
 * Admin variant differs from the vendedor card by:
 *  - estado badge in top-right (Activo / Borrador / Inactivo)
 *  - optional neto + factor line under the price (role-gated)
 *  - hover shows a "→ Ver" affordance
 *
 * The whole card is a <Link> so keyboard navigation + middle-click open work.
 */

interface Pricing {
  min: number | null;
  max: number | null;
  netoFijos: number;
  opcionFactors: number[];
}

interface PaqueteGridCardProps {
  paquete: Paquete;
  foto?: PaqueteFoto;
  destino: string;
  regionNombre?: string;
  temporada?: Temporada;
  tipo?: TipoPaquete;
  pricing: Pricing;
  canSeePricing: { neto: boolean; markup: boolean; venta: boolean };
  index: number;
}

const estadoStyles = {
  ACTIVO: {
    bg: "rgba(59,191,173,0.92)",
    text: "#ffffff",
    label: "Activo",
  },
  BORRADOR: {
    bg: "rgba(232,145,58,0.92)",
    text: "#ffffff",
    label: "Borrador",
  },
  INACTIVO: {
    bg: "rgba(107,111,153,0.92)",
    text: "#ffffff",
    label: "Inactivo",
  },
} as const;

export function PaqueteGridCard({
  paquete,
  foto,
  destino,
  regionNombre,
  temporada,
  tipo,
  pricing,
  canSeePricing,
  index,
}: PaqueteGridCardProps) {
  const cover = foto?.url;
  const estadoStyle = estadoStyles[paquete.estado] ?? estadoStyles.ACTIVO;

  // Format the main price: range when multiple opciones, single when one
  const priceDisplay =
    pricing.min === null
      ? formatCurrency(paquete.precioVenta)
      : pricing.max !== null && pricing.min !== pricing.max
        ? `${formatCurrency(pricing.min)} — ${formatCurrency(pricing.max)}`
        : formatCurrency(pricing.min);

  // Factor display: range when multiple opciones with different factors
  const factorDisplay = (() => {
    if (!canSeePricing.markup || pricing.opcionFactors.length === 0) return null;
    if (pricing.opcionFactors.length === 1) {
      return pricing.opcionFactors[0].toFixed(2);
    }
    const min = Math.min(...pricing.opcionFactors);
    const max = Math.max(...pricing.opcionFactors);
    return min === max ? min.toFixed(2) : `${min.toFixed(2)}–${max.toFixed(2)}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={`/paquetes/${paquete.id}`} className="block h-full">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-hairline bg-white transition-shadow hover:shadow-[0_10px_30px_-16px_rgba(17,17,36,0.22)]"
        >
          {/* Photo */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-50">
            {cover ? (
              <img
                src={cover}
                alt={foto?.alt ?? paquete.titulo}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <PackageIcon size={36} strokeWidth={1.25} />
              </div>
            )}

            {/* Gradient for text contrast */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

            {/* Estado badge — top right */}
            <div className="absolute right-3 top-3">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                style={{
                  background: estadoStyle.bg,
                  color: estadoStyle.text,
                }}
              >
                {estadoStyle.label}
              </span>
            </div>

            {/* Temporada badge — top left */}
            {temporada && (
              <div className="absolute left-3 top-3">
                <span className="rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-700 shadow-sm backdrop-blur-sm">
                  {temporada.nombre.replace(/\s*\(.*\)/, "").trim()}
                </span>
              </div>
            )}

            {/* Destino (breadcrumb Region \u203A Pais) — bottom */}
            <div className="absolute inset-x-3 bottom-2 flex items-center gap-1.5 text-[11px] font-medium text-white">
              <MapPin size={11} strokeWidth={2.25} />
              <span className="truncate">
                {regionNombre && regionNombre !== destino && (
                  <>
                    <span className="text-white/70">{regionNombre}</span>
                    <span className="mx-1 text-white/50">{"\u203A"}</span>
                  </>
                )}
                {destino}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col p-4">
            <div className="flex-1">
              <h3 className="line-clamp-2 font-display text-[14px] font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-[#8B5CF6]">
                {paquete.titulo}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-[10.5px] text-neutral-400">
                {tipo && (
                  <span className="font-medium uppercase tracking-wider">
                    {tipo.nombre}
                  </span>
                )}
                {tipo && paquete.noches > 0 && <span>·</span>}
                {paquete.noches > 0 && (
                  <span>
                    {paquete.noches}{" "}
                    {paquete.noches === 1 ? "noche" : "noches"}
                  </span>
                )}
              </div>
            </div>

            {canSeePricing.venta !== false && (
              <div className="mt-3 flex items-end justify-between border-t border-hairline pt-3">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-semibold uppercase tracking-widest text-neutral-400">
                    {pricing.max !== null &&
                    pricing.min !== null &&
                    pricing.min !== pricing.max
                      ? "Desde"
                      : "Precio"}
                  </p>
                  <p
                    className={cn(
                      "font-mono font-bold leading-tight text-neutral-900 tabular-nums",
                      pricing.max !== null &&
                        pricing.min !== null &&
                        pricing.min !== pricing.max
                        ? "text-[13px]"
                        : "text-[16px]",
                    )}
                  >
                    {priceDisplay}
                  </p>
                  {(canSeePricing.neto || canSeePricing.markup) && (
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-neutral-400 tabular-nums">
                      {canSeePricing.neto && (
                        <>
                          neto {formatCurrency(pricing.netoFijos)}
                        </>
                      )}
                      {canSeePricing.neto && factorDisplay && <span>·</span>}
                      {factorDisplay && <>factor {factorDisplay}</>}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8B5CF6] opacity-0 transition-opacity group-hover:opacity-100">
                  Ver <ArrowRight size={11} strokeWidth={2.5} />
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
