"use client";

import { Clock } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { describirVencimiento } from "@/lib/date";

/**
 * VencimientoBadge — pastilla "Vence 3 sep · en 6 días".
 *
 * Pedido de Gero (27/08): al entrar desde el dashboard con `?alerta=por-vencer`
 * el listado tiene que decir CUÁNDO vence cada paquete. Por eso sólo se renderiza
 * con esa alerta activa; en el uso normal del listado no aparece.
 *
 * Ámbar por defecto, rojo si vence hoy o mañana.
 */
export function VencimientoBadge({
  validezHasta,
  className,
}: {
  validezHasta?: string | null;
  className?: string;
}) {
  const info = describirVencimiento(validezHasta);
  if (!info) return null;

  const color = info.urgente ? "#EF4444" : "#E8913A";

  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
      style={{ background: `${color}14`, color }}
      title={`Validez hasta ${validezHasta}`}
    >
      <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
      {info.texto}
    </span>
  );
}
