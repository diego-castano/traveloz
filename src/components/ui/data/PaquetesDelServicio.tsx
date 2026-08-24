"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/lib/cn";
import type { EstadoPaquete } from "@/lib/types";

/**
 * PaquetesDelServicio — "¿qué paquetes usan este servicio?".
 *
 * Los listados de servicios (aéreos, alojamientos, traslados, seguros,
 * circuitos) muestran hace rato un contador "N paq." al lado del nombre, pero
 * era un número muerto: el operador sabía cuántos paquetes dependían del
 * servicio y no cuáles. Esto lo vuelve desplegable.
 *
 * Son dos piezas para que la tabla no tenga que saber de estilos:
 *   • <PaquetesToggle>  — el contador, ahora botón, con su chevron.
 *   • <PaquetesPanel>   — la grilla de paquetes, para meter en una fila extra
 *                          con colSpan.
 */

export type PaqueteDelServicio = {
  id: string;
  titulo: string;
  destino?: string;
  estado?: EstadoPaquete;
};

// Mismos colores y etiquetas que el listado de paquetes, así un "Borrador" se
// ve igual en los dos lados del backend.
const ESTADO_BADGE = {
  BORRADOR: { variant: "draft" as const, label: "Borrador" },
  EN_REVISION: { variant: "review" as const, label: "En revisión" },
  ACTIVO: { variant: "active" as const, label: "Activo" },
  ARCHIVADO: { variant: "archived" as const, label: "Archivado" },
};

// ---------------------------------------------------------------------------
// Toggle — el "N paq." clickeable
// ---------------------------------------------------------------------------

export function PaquetesToggle({
  count,
  open,
  onToggle,
  className,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      // La fila entera navega a la ficha del servicio: este botón vive adentro,
      // así que corta la propagación o desplegar te saca de la página.
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={open}
      title={open ? "Ocultar paquetes" : "Ver en qué paquetes se usa"}
      className={cn(
        "ml-2 inline-flex items-center gap-0.5 rounded-full py-0.5 pl-2 pr-1",
        "font-mono text-[10.5px] transition-colors",
        open
          ? "bg-[rgba(59,191,173,0.12)] text-[#2A9E8E]"
          : "text-neutral-400 hover:bg-rail hover:text-[#2A9E8E]",
        className,
      )}
    >
      {count} paq.
      <ChevronRight
        size={11}
        strokeWidth={2.5}
        className={cn(
          "transition-transform duration-200",
          open && "rotate-90",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Panel — la grilla que se despliega
// ---------------------------------------------------------------------------

export function PaquetesPanel({
  paquetes,
  cargando = false,
}: {
  paquetes: PaqueteDelServicio[];
  /** El provider hidrata los paquetes en tandas: mientras llega el resto
   *  mostramos el aviso en vez de una lista incompleta sin explicación. */
  cargando?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="border-l-2 border-[#3BBFAD] bg-rail px-4 py-3"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        Se usa en {paquetes.length}{" "}
        {paquetes.length === 1 ? "paquete" : "paquetes"}
      </p>

      {paquetes.length === 0 ? (
        <p className="flex items-center gap-1.5 py-1 text-[12.5px] text-neutral-400">
          <PackageSearch size={13} strokeWidth={2} />
          {cargando
            ? "Cargando paquetes…"
            : "Los paquetes asociados ya no existen."}
        </p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {paquetes.map((p) => {
            const badge = p.estado ? ESTADO_BADGE[p.estado] : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/backend/paquetes/${p.id}`}
                  // La fila de arriba es clickeable; sin esto, abrir un paquete
                  // dispara también la navegación al servicio.
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "group/pkg flex items-center gap-2 rounded-[8px] border border-hairline bg-white",
                    "px-2.5 py-2 transition-all",
                    "hover:border-[#3BBFAD]/50 hover:shadow-[0_1px_6px_rgba(20,20,43,0.06)]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-neutral-800">
                      {p.titulo}
                    </span>
                    {p.destino && (
                      <span className="block truncate text-[11px] text-neutral-400">
                        {p.destino}
                      </span>
                    )}
                  </span>
                  {badge && (
                    <Badge variant={badge.variant} size="sm">
                      {badge.label}
                    </Badge>
                  )}
                  <ChevronRight
                    size={13}
                    strokeWidth={2}
                    className="shrink-0 text-neutral-300 transition-colors group-hover/pkg:text-[#2A9E8E]"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Fila expandible lista para usar dentro de un <DataTableBody>
// ---------------------------------------------------------------------------

export function PaquetesRow({
  open,
  colSpan,
  paquetes,
  cargando,
}: {
  open: boolean;
  colSpan: number;
  paquetes: PaqueteDelServicio[];
  cargando?: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <tr className="border-b border-hairline">
          <td colSpan={colSpan} className="p-0">
            <PaquetesPanel paquetes={paquetes} cargando={cargando} />
          </td>
        </tr>
      )}
    </AnimatePresence>
  );
}
