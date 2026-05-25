"use client";

// ---------------------------------------------------------------------------
// EstadoHelp — single source of truth for the 4-state package lifecycle
// description. Operators used to ask "qué hace cada estado?" because the
// dropdown showed bare enum labels (BORRADOR / EN_REVISION / ACTIVO /
// ARCHIVADO) with no semantics attached.
//
// Two consumers:
//   • EstadoBadgeTooltip — wraps a Badge with a hover popup explaining the
//     state of THAT particular paquete (used in lists + detail header)
//   • EstadoHelpPanel — inline block under the estado <Select> with the
//     full workflow visible at once (used in Datos + Publicación tabs)
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { CheckCircle2, Circle, Eye, Archive } from "lucide-react";

export type EstadoKey = "BORRADOR" | "EN_REVISION" | "ACTIVO" | "ARCHIVADO";

export const ESTADO_HELP: Record<
  EstadoKey,
  { label: string; short: string; long: string; icon: typeof Circle; color: string }
> = {
  BORRADOR: {
    label: "Borrador",
    short: "En construcción, no visible al público",
    long: "El paquete se está armando. Falta cargar datos, fotos, hoteles o el toggle de publicación. No aparece en el sitio.",
    icon: Circle,
    color: "#E8913A",
  },
  EN_REVISION: {
    label: "En revisión",
    short: "Listo para validar antes de salir al sitio",
    long: "Datos cargados; alguien del equipo lo revisa antes de publicar. Sigue oculto del público hasta que pase a Activo.",
    icon: CheckCircle2,
    color: "#8B5CF6",
  },
  ACTIVO: {
    label: "Activo",
    short: "Disponible para publicar en el sitio",
    long: "Aprobado y listo. Solo aparece en el sitio si además el toggle 'Publicar' está prendido en la pestaña Publicación.",
    icon: Eye,
    color: "#3BBFAD",
  },
  ARCHIVADO: {
    label: "Archivado",
    short: "Retirado, fuera de circulación",
    long: "Se sacó del catálogo activo. Se conserva en el sistema (no borrado) por referencia histórica. Auto-despublica del sitio.",
    icon: Archive,
    color: "#5A5E7A",
  },
};

// ---------------------------------------------------------------------------
// Inline panel — shows all 4 estados in order, with the current one highlighted.
// Drop under the estado <Select> to make the workflow visible at a glance.
// ---------------------------------------------------------------------------
export function EstadoHelpPanel({ current }: { current: EstadoKey }) {
  const order: EstadoKey[] = ["BORRADOR", "EN_REVISION", "ACTIVO", "ARCHIVADO"];
  return (
    <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-2">
        Flujo del paquete
      </div>
      <ol className="space-y-1.5">
        {order.map((key) => {
          const e = ESTADO_HELP[key];
          const Icon = e.icon;
          const isCurrent = key === current;
          return (
            <li
              key={key}
              className={`flex items-start gap-2 text-[11.5px] leading-snug ${
                isCurrent ? "font-medium" : "text-neutral-500"
              }`}
              style={isCurrent ? { color: e.color } : undefined}
            >
              <Icon className="w-3.5 h-3.5 mt-px shrink-0" />
              <span>
                <span className="font-semibold">{e.label}:</span> {e.short}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip wrapper — wrap a Badge (or any node) with a hover popup
// describing the estado in plain language.
//
// Requires <Tooltip.Provider> ancestor (admin layout / detail page should
// provide one).
// ---------------------------------------------------------------------------
export function EstadoBadgeTooltip({
  estado,
  children,
}: {
  estado: EstadoKey;
  children: ReactNode;
}) {
  const e = ESTADO_HELP[estado];
  if (!e) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="inline-flex">{children}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={6}
          className="z-[200] max-w-xs rounded-lg px-3 py-2 text-xs text-white"
          style={{
            background: "rgba(26,26,46,0.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div className="font-semibold mb-0.5">{e.label}</div>
          <div className="text-[11px] text-white/80 leading-snug">{e.long}</div>
          <Tooltip.Arrow style={{ fill: "rgba(26,26,46,0.94)" }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
