"use client";

// ---------------------------------------------------------------------------
// DestinosMiniEditor — compact destinos+noches panel used inline on the
// Datos tab. Mirrors the same provider actions the Alojamientos tab uses,
// so a destino added/edited/reordered here shows up everywhere instantly:
// the Alojamientos full editor, the OnboardingProgress strip, the noches
// total on Datos, the PreciosTab line-items, etc.
//
// Why this exists at all: the operator's day-1 mental model is "el paquete
// es una sucesión de destinos × noches". Forcing them to enter Alojamientos
// (which is dense with hotel composition) just to set Buenos Aires → 3
// noches was a noticeable friction point. This editor strips Alojamientos
// down to its essence and embeds it where they expect.
//
// Deliberate scope cuts vs. the full Alojamientos editor:
//   • No inline city create — for new ciudades go to Catálogos. The compact
//     <select> here only picks from existing ciudades to keep the UI tiny.
//   • No "filter by paquete.destino region" — Datos isn't constrained by
//     región, the operator types it freely upstream.
//   • No hotel coverage badge — Datos doesn't show opciones hoteleras.
//
// Everything else (add / inline-edit noches / reorder / delete) works the
// same way and persists via the same actions.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { MapPin, Plus, X, ArrowUp, ArrowDown, Route } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useToast } from "@/components/ui/Toast";
import {
  useDestinos,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import { usePaises } from "@/components/providers/CatalogProvider";
import type { PaqueteDestino } from "@/lib/types";

interface Props {
  paqueteId: string;
  canEdit: boolean;
}

export function DestinosMiniEditor({ paqueteId, canEdit }: Props) {
  const { toast } = useToast();
  const destinos = useDestinos(paqueteId);
  const { createDestino, updateDestino, deleteDestino, reorderDestinos } =
    usePackageActions();
  const paises = usePaises();

  // Flat list of all ciudades for the <select>, kept grouped by país in the
  // optgroup so the operator can scan the list visually. Sorted by país
  // alphabetically for predictability.
  const ciudadesByPais = useMemo(() => {
    return [...paises]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((p) => ({
        paisId: p.id,
        paisNombre: p.nombre,
        ciudades: p.ciudades
          .filter((c) => !destinos.some((d) => d.ciudadId === c.id))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .filter((g) => g.ciudades.length > 0);
  }, [paises, destinos]);

  // Lookup helper: ciudadId → "Ciudad · País"
  const ciudadLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of paises) {
      for (const c of p.ciudades) m.set(c.id, `${c.nombre} · ${p.nombre}`);
    }
    return m;
  }, [paises]);

  const nochesTotales = destinos.reduce((sum, d) => sum + (d.noches || 0), 0);

  // -- Add form local state --
  const [nuevoCiudadId, setNuevoCiudadId] = useState("");
  const [nuevasNoches, setNuevasNoches] = useState("");

  const handleAdd = async () => {
    if (!nuevoCiudadId) return;
    const n = parseInt(nuevasNoches, 10);
    if (Number.isNaN(n) || n < 0 || n > 365) return;
    try {
      await createDestino({
        paqueteId,
        ciudadId: nuevoCiudadId,
        noches: n,
        orden: destinos.length,
      });
      setNuevoCiudadId("");
      setNuevasNoches("");
    } catch (e) {
      toast("error", "No se pudo agregar el destino", (e as Error).message);
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const sorted = [...destinos].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapWith]] = [
      reordered[swapWith],
      reordered[idx],
    ];
    try {
      await reorderDestinos(
        paqueteId,
        reordered.map((d) => d.id),
      );
    } catch (e) {
      toast("error", "No se pudo reordenar", (e as Error).message);
    }
  };

  return (
    <div className="rounded-[12px] border border-neutral-200/80 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <Route className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-[13px] font-semibold text-neutral-700">
            Itinerario
          </span>
          <span className="text-[11px] text-neutral-400">
            ({destinos.length} destino{destinos.length === 1 ? "" : "s"} ·{" "}
            {nochesTotales} noche{nochesTotales === 1 ? "" : "s"} total)
          </span>
        </div>
        <a
          href="?tab=alojamientos"
          className="text-[11px] text-violet-600 hover:underline"
        >
          Ver editor completo en Alojamientos →
        </a>
      </div>

      {destinos.length === 0 ? (
        <div className="px-4 py-5 text-[12px] text-neutral-400 italic">
          Todavía no hay destinos. Agregá el primero abajo para arrancar el
          itinerario.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {[...destinos]
            .sort((a, b) => a.orden - b.orden)
            .map((destino, idx, arr) => (
              <DestinoMiniRow
                key={destino.id}
                destino={destino}
                ciudadLabel={
                  ciudadLabel.get(destino.ciudadId) ?? "(ciudad eliminada)"
                }
                index={idx}
                isFirst={idx === 0}
                isLast={idx === arr.length - 1}
                canEdit={canEdit}
                onUpdate={(patch) => updateDestino({ ...destino, ...patch })}
                onDelete={() => deleteDestino(destino.id)}
                onMove={(dir) => handleMove(destino.id, dir)}
              />
            ))}
        </div>
      )}

      {canEdit && ciudadesByPais.length > 0 && (
        <div className="border-t border-neutral-100 px-3 py-2.5 bg-neutral-50/40">
          <div className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <SearchableSelect
                value={nuevoCiudadId}
                onValueChange={setNuevoCiudadId}
                placeholder="— Elegí una ciudad —"
                searchPlaceholder="Buscar ciudad..."
                options={ciudadesByPais.flatMap((g) =>
                  g.ciudades.map((c) => ({
                    value: c.id,
                    label: `${c.nombre} · ${g.paisNombre}`,
                  })),
                )}
              />
            </div>
            <Input
              type="number"
              min={0}
              max={365}
              value={nuevasNoches}
              onChange={(e) => setNuevasNoches(e.target.value)}
              placeholder="Noches"
              className="w-20"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleAdd}
              disabled={!nuevoCiudadId || !nuevasNoches}
            >
              Agregar
            </Button>
          </div>
          <p className="text-[10.5px] text-neutral-400 mt-1.5 pl-5">
            Para crear una ciudad nueva andá a{" "}
            <a
              href="/backend/catalogos/ciudades"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:underline"
            >
              Catálogo de ciudades
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DestinoMiniRow — single row inside the mini editor. Inline noches input
// commits on blur to avoid a write per keystroke.
// ---------------------------------------------------------------------------

function DestinoMiniRow({
  destino,
  ciudadLabel,
  index,
  isFirst,
  isLast,
  canEdit,
  onUpdate,
  onDelete,
  onMove,
}: {
  destino: PaqueteDestino;
  ciudadLabel: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  onUpdate: (patch: Partial<PaqueteDestino>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onMove: (direction: "up" | "down") => Promise<void> | void;
}) {
  const [noches, setNoches] = useState<string>(String(destino.noches));

  // Keep the local input in sync if the parent's value changes (e.g. when
  // the Alojamientos tab edits this same destino — both editors share the
  // provider state so both should always reflect the latest value).
  if (noches !== String(destino.noches) && noches === "") {
    setNoches(String(destino.noches));
  }

  const commitNoches = () => {
    const parsed = parseInt(noches, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 365) {
      setNoches(String(destino.noches));
      return;
    }
    if (parsed !== destino.noches) {
      void onUpdate({ noches: parsed });
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {canEdit && (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={isFirst}
            className="p-0.5 rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Mover arriba"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={isLast}
            className="p-0.5 rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Mover abajo"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      )}
      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-mono font-semibold text-teal-700">
        {index + 1}
      </span>
      <MapPin className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
      <span className="flex-1 text-[12.5px] text-neutral-800 truncate">
        {ciudadLabel}
      </span>
      {canEdit ? (
        <>
          <input
            type="number"
            min={0}
            max={365}
            value={noches}
            onChange={(e) => setNoches(e.target.value)}
            onBlur={commitNoches}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-14 h-7 text-[12.5px] font-mono font-semibold text-neutral-800 bg-white rounded-md border border-neutral-200 px-2 focus:border-teal-500 focus:outline-none text-center"
          />
          <span className="text-[11px] text-neutral-500">n</span>
          <button
            type="button"
            onClick={() => onDelete()}
            className="p-1 rounded text-neutral-300 hover:bg-red-50 hover:text-red-500"
            title="Quitar destino"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <span className="text-[12.5px] font-mono font-semibold text-neutral-800">
          {destino.noches}n
        </span>
      )}
    </div>
  );
}
