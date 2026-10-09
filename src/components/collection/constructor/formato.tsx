"use client";

// Textos y piezas chicas que comparten el constructor y la grilla de experiencias.

import type { EstadoExperiencia } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import type { EventoHistorial } from "./contexto";

export const ESTADOS: Record<EstadoExperiencia, { label: string; clase: string; punto: string }> = {
  BORRADOR: { label: "Borrador", clase: "border-col-line text-col-slate bg-col-surface", punto: "bg-col-slate/40" },
  EN_REVISION: { label: "En revisión", clase: "border-col-gold/60 text-col-ink bg-col-gold/15", punto: "bg-col-gold" },
  PUBLICADA: { label: "Publicada", clase: "border-col-ink bg-col-ink text-col-base", punto: "bg-col-gold" },
  PAUSADA: { label: "Pausada", clase: "border-col-slate/40 text-col-slate bg-col-base", punto: "bg-col-slate" },
  ARCHIVADA: { label: "Archivada", clase: "border-col-line text-col-slate/70 bg-transparent", punto: "bg-col-line" },
};

export function EstadoPill({ estado, className }: { estado: EstadoExperiencia; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-[10.5px] uppercase tracking-[0.14em]",
        e.clase,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", e.punto)} />
      {e.label}
    </span>
  );
}

const ACCIONES: Record<string, string> = {
  crear: "Creó la experiencia",
  guardar: "Editó el contenido",
  "enviar-revision": "La envió a revisión",
  publicar: "La publicó",
  "publicar-cambios": "Publicó cambios",
  pausar: "La pausó",
  archivar: "La archivó",
  "volver-borrador": "La volvió a borrador",
  duplicar: "La creó duplicando otra",
  destacar: "La destacó",
  "quitar-destacada": "Le quitó el destaque",
};

export const textoAccion = (a: string) => ACCIONES[a] ?? a;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 3 minutos", "ayer"… */
export function haceTiempo(fecha: string | number, ahora = Date.now()) {
  const s = Math.round((new Date(fecha).getTime() - ahora) / 1000);
  const a = Math.abs(s);
  if (a < 45) return "recién";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(fecha));
}

export const fmtMiles = (n: number) => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(n);

export function ListaHistorial({ historial }: { historial: EventoHistorial[] }) {
  if (!historial.length) return <p className="px-3 py-4 text-[13px] text-col-slate">Todavía no hay movimientos.</p>;
  return (
    <ol className="flex flex-col">
      {historial.map((h) => (
        <li key={h.id} className="flex gap-3 rounded-sm px-3 py-2.5">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-col-gold/70" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-col-ink">{textoAccion(h.accion)}</span>
            <span className="block text-[12px] text-col-slate">
              {h.userNombre ?? "Alguien del equipo"}, {haceTiempo(h.createdAt)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
