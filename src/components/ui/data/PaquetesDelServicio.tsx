"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Package as PackageIcon, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import { cn } from "@/components/lib/cn";
import type { EstadoPaquete } from "@/lib/types";

/**
 * PaquetesDelServicio — "¿qué paquetes usan este servicio?".
 *
 * Los cinco listados de servicios (aéreos, alojamientos, traslados, seguros,
 * circuitos) mostraban hace rato un contador "N paq." al lado del nombre, pero
 * era un número mudo: el operador sabía cuántos paquetes dependían del
 * servicio y no cuáles. Esto lo vuelve desplegable, con la misma tarjeta en
 * los cinco listados.
 *
 * Son dos piezas para que las tablas no tengan que saber de estilos:
 *   • <PaquetesToggle> — el contador, ahora botón, con su chevron.
 *   • <PaquetesRow>    — la fila desplegable con la grilla de paquetes.
 *
 * Los datos salen de `usePaquetesDelServicio(tipo)`.
 */

export type PaqueteDelServicio = {
  id: string;
  titulo: string;
  destino?: string;
  estado?: EstadoPaquete;
  /** Portada: heroImage del paquete, o su primera foto. Null = sin imagen. */
  fotoUrl?: string | null;
  fotoAlt?: string | null;
};

// Mismos colores y etiquetas que el listado de paquetes, así un "Borrador" se
// ve igual en los dos lados del backend.
const ESTADO_BADGE = {
  BORRADOR: { variant: "draft" as const, label: "Borrador" },
  EN_REVISION: { variant: "review" as const, label: "En revisión" },
  ACTIVO: { variant: "active" as const, label: "Activo" },
  ARCHIVADO: { variant: "archived" as const, label: "Archivado" },
};

// Ancho del thumbnail (px) que le pedimos al proxy de imágenes. El doble del
// tamaño de render (56px) para que se vea nítido en pantallas retina.
const THUMB_W = 112;

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
        className={cn("transition-transform duration-200", open && "rotate-90")}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de un paquete
// ---------------------------------------------------------------------------

function PaqueteMiniCard({ paquete }: { paquete: PaqueteDelServicio }) {
  const badge = paquete.estado ? ESTADO_BADGE[paquete.estado] : null;
  return (
    <Link
      href={`/backend/paquetes/${paquete.id}`}
      // La fila de arriba es clickeable; sin esto, abrir un paquete dispara
      // también la navegación a la ficha del servicio.
      onClick={(e) => e.stopPropagation()}
      title={paquete.titulo}
      className={cn(
        "group/pkg flex items-center gap-2.5 overflow-hidden rounded-[10px]",
        "border border-hairline bg-white pr-2.5 transition-all",
        "hover:border-[#3BBFAD]/50 hover:shadow-[0_2px_10px_-4px_rgba(17,17,36,0.18)]",
      )}
    >
      {/* Portada. Chica a propósito: un servicio puede estar en decenas de
          paquetes y la grilla tiene que seguir entrando en la tabla. */}
      <span className="relative h-[46px] w-[56px] shrink-0 overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-50">
        {paquete.fotoUrl ? (
          <img
            src={proxyThumbUrl(paquete.fotoUrl, THUMB_W)}
            alt={paquete.fotoAlt ?? paquete.titulo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/pkg:scale-[1.06]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-neutral-300">
            <PackageIcon size={16} strokeWidth={1.5} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1 py-1.5">
        <span className="block truncate text-[12.5px] font-medium leading-tight text-neutral-800">
          {paquete.titulo}
        </span>
        {paquete.destino && (
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-neutral-400">
            {paquete.destino}
          </span>
        )}
      </span>

      {badge && (
        <Badge variant={badge.variant} size="sm" className="shrink-0">
          {badge.label}
        </Badge>
      )}
      <ChevronRight
        size={13}
        strokeWidth={2}
        className="shrink-0 text-neutral-300 transition-colors group-hover/pkg:text-[#2A9E8E]"
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Panel — la grilla que se despliega
// ---------------------------------------------------------------------------

export function PaquetesPanel({
  paquetes,
  cargando = false,
  total,
}: {
  paquetes: PaqueteDelServicio[];
  /** El provider hidrata los paquetes en tandas: mientras llega el resto
   *  avisamos, en vez de mostrar una lista incompleta sin explicación. */
  cargando?: boolean;
  /** Total según el join. Si es mayor que `paquetes.length`, faltan hidratar. */
  total?: number;
}) {
  const reduced = useReducedMotion();
  const esperados = total ?? paquetes.length;
  const faltan = esperados > paquetes.length;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="border-l-2 border-[#3BBFAD] bg-rail px-4 py-3"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        Se usa en {esperados} {esperados === 1 ? "paquete" : "paquetes"}
        {faltan && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-neutral-300">
            · cargando {esperados - paquetes.length} más…
          </span>
        )}
      </p>

      {paquetes.length === 0 ? (
        <p className="flex items-center gap-1.5 py-1 text-[12.5px] text-neutral-400">
          <PackageSearch size={13} strokeWidth={2} />
          {cargando
            ? "Cargando paquetes…"
            : "Los paquetes asociados ya no existen."}
        </p>
      ) : (
        // Tope de alto con scroll propio: un servicio muy usado no puede
        // empujar el resto de la tabla fuera de la pantalla.
        <ul className="grid max-h-[264px] gap-1.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {paquetes.map((p) => (
            <li key={p.id}>
              <PaqueteMiniCard paquete={p} />
            </li>
          ))}
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
  paquetes,
  cargando,
  total,
  colSpan = 99,
}: {
  open: boolean;
  paquetes: PaqueteDelServicio[];
  cargando?: boolean;
  total?: number;
  /** Por defecto 99: el navegador lo recorta a la cantidad real de columnas,
   *  así cada tabla no tiene que llevar la cuenta de las suyas. */
  colSpan?: number;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <tr className="border-b border-hairline">
          <td colSpan={colSpan} className="p-0">
            <PaquetesPanel
              paquetes={paquetes}
              cargando={cargando}
              total={total}
            />
          </td>
        </tr>
      )}
    </AnimatePresence>
  );
}
