"use client";

// Elegir y ordenar items de una lista (destinos, experiencias, testimonios,
// artículos): chips con foto que se arrastran y un buscador para sumar.

import { useState } from "react";
import { Popover } from "radix-ui";
import { Plus, Search, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { MedioImagen } from "../sitio/medios";
import { Asa, ListaOrdenable } from "./campos";

export interface OpcionElegible {
  id: string;
  titulo: string;
  detalle?: string;
  medio: MedioVista | null;
}

function Foto({ medio }: { medio: MedioVista | null }) {
  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-col-sm bg-col-line">
      {medio && <MedioImagen medio={medio} relleno sizes="48px" />}
    </span>
  );
}

export function Elegidos({
  ids,
  opciones,
  onCambio,
  max,
  etiqueta,
  editable,
  vacio = "Todavía no elegiste ninguno.",
}: {
  ids: string[];
  opciones: OpcionElegible[];
  onCambio: (ids: string[]) => void;
  max: number;
  etiqueta: string;
  editable: boolean;
  vacio?: string;
}) {
  const { raiz } = useCollection();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const porId = new Map(opciones.map((o) => [o.id, o]));
  const elegidos = ids.map((id) => ({ id, o: porId.get(id) }));
  const t = q.trim().toLowerCase();
  const libres = opciones.filter((o) => !ids.includes(o.id) && (!t || o.titulo.toLowerCase().includes(t)));

  return (
    <div className="flex flex-col gap-3">
      {elegidos.length ? (
        <ListaOrdenable
          items={elegidos}
          deshabilitado={!editable}
          onOrden={(xs) => onCambio(xs.map((x) => x.id))}
          className="flex flex-col gap-1.5"
          render={({ id, o }, i, asa) => (
            <div
              className={cn(
                "flex items-center gap-3 rounded-col-sm border border-col-line bg-col-surface py-1.5 pl-1 pr-2",
                asa.arrastrando && "shadow-col-2",
              )}
            >
              {editable && <Asa asa={asa} label={o?.titulo ?? "item"} />}
              <span className="w-5 text-center text-col-xs tabular-nums lining-nums text-col-muted">{i + 1}</span>
              <Foto medio={o?.medio ?? null} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-col-md", o ? "text-col-ink" : "italic text-col-slate")}>
                  {o?.titulo || "No disponible"}
                </span>
                <span className="block truncate text-col-xs text-col-slate">
                  {o ? o.detalle : "No está publicado: en el sitio no se muestra."}
                </span>
              </span>
              {editable && (
                <button
                  type="button"
                  aria-label={`Quitar ${o?.titulo ?? "item"}`}
                  onClick={() => onCambio(ids.filter((x) => x !== id))}
                  className="flex h-7 w-7 items-center justify-center rounded-col-sm text-col-slate hover:bg-col-base hover:text-col-ink"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
        />
      ) : (
        <p className="text-col-md italic text-col-slate">{vacio}</p>
      )}
      {editable && ids.length < max && (
        <Popover.Root open={abierto} onOpenChange={(o) => {
            setAbierto(o);
            if (!o) setQ("");
          }}>
          <Popover.Trigger className="flex h-10 items-center gap-2 self-start text-col-sm font-medium text-col-slate transition-colors hover:text-col-ink">
            <Plus className="h-4 w-4 text-col-gold" strokeWidth={1.5} /> Sumar {etiqueta}
            <span className="normal-case tracking-normal text-col-muted">
              ({ids.length} de {max})
            </span>
          </Popover.Trigger>
          <Popover.Portal container={raiz}>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="col-desplegable z-50 flex max-h-[380px] w-[360px] flex-col rounded-col-sm border border-col-line bg-col-surface shadow-col-3"
            >
              <label className="relative border-b border-col-line">
                <span className="sr-only">Buscar {etiqueta}</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar"
                  className="col-anillo h-11 w-full border-0 bg-transparent pl-10 pr-3.5 text-col-md text-col-ink placeholder:text-col-slate/50 focus:outline-none focus:ring-0"
                />
              </label>
              <div className="min-h-0 flex-1 overflow-y-auto p-1">
                {libres.length ? (
                  libres.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        onCambio([...ids, o.id]);
                        if (ids.length + 1 >= max) setAbierto(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-col-sm p-1.5 text-left transition-colors hover:bg-col-base"
                    >
                      <Foto medio={o.medio} />
                      <span className="min-w-0">
                        <span className="block truncate text-col-md text-col-ink">{o.titulo}</span>
                        {o.detalle && <span className="block truncate text-col-xs text-col-slate">{o.detalle}</span>}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-col-sm text-col-slate">
                    {opciones.length ? "No hay más para sumar." : "No hay nada publicado todavía."}
                  </p>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}

/** Control segmentado (modo, ancho, lado, tipo). */
export function Segmentado<T extends string>({
  valor,
  opciones,
  onCambio,
  etiqueta,
  deshabilitado,
}: {
  valor: T;
  opciones: readonly (readonly [T, string])[];
  onCambio: (v: T) => void;
  etiqueta: string;
  deshabilitado?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex gap-0.5 self-start rounded-col-sm bg-col-line/60 p-0.5">
      {opciones.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valor === v}
          disabled={deshabilitado}
          onClick={() => onCambio(v)}
          className={cn(
            "h-9 rounded-col-sm px-4 text-col-md font-medium transition-colors duration-col ease-col",
            valor === v ? "bg-col-surface text-col-ink shadow-col-1" : "text-col-slate hover:text-col-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
