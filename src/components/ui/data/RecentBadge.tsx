"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { isRecent } from "@/lib/recency";

/**
 * RecentBadge — small "Reciente" pill that auto-renders only when the given
 * createdAt is inside the recency window (default 24h). Use it next to a row
 * title to help operators spot the item they just added.
 *
 *   <span>{paquete.titulo}</span>
 *   <RecentBadge createdAt={paquete.createdAt} />
 */
export function RecentBadge({
  createdAt,
  windowMs,
  className,
}: {
  createdAt: Date | string | null | undefined;
  windowMs?: number;
  className?: string;
}) {
  if (!isRecent(createdAt, windowMs)) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-teal-700",
        className,
      )}
      title="Agregado en las últimas 24 horas"
    >
      <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
      Reciente
    </span>
  );
}
