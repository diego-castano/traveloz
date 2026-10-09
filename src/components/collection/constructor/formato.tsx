"use client";

// Textos y piezas chicas que comparten el constructor y la grilla de experiencias.

import type { EstadoExperiencia } from "@/lib/collection/experiencia/contenido";
import { Estado, type TonoEstado } from "../ui";
import type { EventoHistorial } from "./contexto";

export const ESTADOS: Record<EstadoExperiencia, { label: string; tono: TonoEstado }> = {
  BORRADOR: { label: "Borrador", tono: "neutro" },
  EN_REVISION: { label: "En revisión", tono: "info" },
  PUBLICADA: { label: "Publicada", tono: "ok" },
  PAUSADA: { label: "Pausada", tono: "aviso" },
  ARCHIVADA: { label: "Archivada", tono: "neutro" },
};

export function EstadoPill({ estado, className }: { estado: EstadoExperiencia; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <Estado tono={e.tono} className={className}>
      {e.label}
    </Estado>
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
  if (!historial.length) return <p className="px-3 py-4 text-col-sm text-col-slate">Todavía no hay movimientos.</p>;
  return (
    <ol className="flex flex-col">
      {historial.map((h) => (
        <li key={h.id} className="flex gap-3 rounded-col-sm px-3 py-2.5">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-col-gold/70" />
          <span className="min-w-0 flex-1">
            <span className="block text-col-sm text-col-ink">{textoAccion(h.accion)}</span>
            <span className="block text-col-xs text-col-slate">
              {h.userNombre ?? "Alguien del equipo"}, {haceTiempo(h.createdAt)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
