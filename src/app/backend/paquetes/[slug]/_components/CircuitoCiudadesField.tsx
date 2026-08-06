"use client";

// ---------------------------------------------------------------------------
// CircuitoCiudadesField — ciudades de un paquete de modalidad CIRCUITO.
//
// Por qué existe: el buscador del sitio público arma su catálogo de ciudades a
// partir de las filas de PaqueteDestino de los paquetes publicados. Los
// paquetes CLASICO las cargan en la pestaña Alojamientos, pero los CIRCUITO no
// tenían NINGÚN lugar donde cargarlas (esa pestaña les muestra una tarjeta que
// remite al módulo Circuitos), así que quedaban publicados y a la vez
// invisibles para quien busca "Estambul" o "Turquía".
//
// Por qué reusa PaqueteDestino en vez de una tabla nueva: todo lo de aguas
// abajo (catálogo del buscador, resolveRegionSlugPaquete, listados por región,
// sitemap) ya lee esa relación. Sumar filas ahí lo resuelve de una.
//
// Por qué NO pide noches: en un circuito el día por día vive en el módulo
// Circuitos y las noches reales salen del circuito asignado. Acá las ciudades
// existen solo para que el viaje se encuentre, así que las filas se crean con
// `noches: 0`. resolveNochesTotales ignora la suma de destinos cuando es 0 y
// cae al circuito, o sea que la ficha pública sigue mostrando las noches
// correctas. syncPaqueteNoches, además, no toca `paquete.noches` en circuitos.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useDestinos,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import {
  usePaises,
  useRegiones,
} from "@/components/providers/CatalogProvider";
import {
  CiudadPicker,
  resolveDestinoFilterScope,
} from "./CiudadPicker";

interface Props {
  paqueteId: string;
  /** Breadcrumb "Región › País" del campo Destino: ordena las ciudades recomendadas. */
  destinoBreadcrumb: string | null;
  canEdit: boolean;
}

export function CircuitoCiudadesField({
  paqueteId,
  destinoBreadcrumb,
  canEdit,
}: Props) {
  const { toast } = useToast();
  const destinos = useDestinos(paqueteId);
  const { createDestino, deleteDestino } = usePackageActions();
  const paises = usePaises();
  const regiones = useRegiones();

  const [ciudadId, setCiudadId] = useState("");
  const [ciudadLabel, setCiudadLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Mismo criterio de "recomendadas" que usa el itinerario de los clásicos: se
  // apoya en el breadcrumb que el operador ya cargó arriba, en Destino.
  const destinoFilter = useMemo(
    () => resolveDestinoFilterScope(destinoBreadcrumb, paises, regiones),
    [destinoBreadcrumb, paises, regiones],
  );

  // ciudadId → "Ciudad · País", para etiquetar los chips ya cargados.
  const ciudadLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of paises) {
      for (const c of p.ciudades) m.set(c.id, `${c.nombre} · ${p.nombre}`);
    }
    return m;
  }, [paises]);

  // El orden visible es el de carga (`orden`), igual que en el itinerario.
  const ciudadesCargadas = useMemo(
    () => [...destinos].sort((a, b) => a.orden - b.orden),
    [destinos],
  );

  const handleAdd = useCallback(async () => {
    if (!ciudadId) return;
    setSaving(true);
    try {
      // noches 0 a propósito: ver el comentario de cabecera. El `orden` real lo
      // recalcula el server (max + 1) dentro de una transacción.
      await createDestino({
        paqueteId,
        ciudadId,
        noches: 0,
        orden: destinos.length,
      });
      toast("success", "Ciudad agregada", ciudadLabel);
      setCiudadId("");
      setCiudadLabel("");
    } catch {
      toast("error", "No se pudo agregar la ciudad");
    } finally {
      setSaving(false);
    }
  }, [ciudadId, ciudadLabel, createDestino, destinos.length, paqueteId, toast]);

  const handleRemove = useCallback(
    async (destinoId: string, label: string) => {
      setRemovingId(destinoId);
      try {
        await deleteDestino(destinoId);
        toast("success", "Ciudad quitada", label);
      } catch {
        toast("error", "No se pudo quitar la ciudad");
      } finally {
        setRemovingId(null);
      }
    },
    [deleteDestino, toast],
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 p-3.5">
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-teal-600" strokeWidth={2} />
        <span className="text-[12.5px] font-semibold text-neutral-700">
          Ciudades del circuito
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">
        Sirven para que el viaje aparezca en el buscador del sitio. El día por
        día se sigue cargando en el módulo Circuitos, así que acá no van noches.
      </p>

      {ciudadesCargadas.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {ciudadesCargadas.map((d) => {
            const label = ciudadLabelById.get(d.ciudadId) ?? "Ciudad sin nombre";
            const busy = removingId === d.id;
            return (
              <li
                key={d.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/70 py-1 pl-2.5 pr-1.5 text-[12px] text-neutral-800"
              >
                <span className="truncate">{label}</span>
                {canEdit && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemove(d.id, label)}
                    title={`Quitar ${label}`}
                    aria-label={`Quitar ${label}`}
                    className="rounded-full p-0.5 text-teal-600/70 transition-colors hover:bg-white hover:text-red-500 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-amber-700">
          Sin ciudades cargadas este paquete no aparece en el buscador del
          sitio. Agregá al menos una.
        </p>
      )}

      {canEdit && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <CiudadPicker
              selectedId={ciudadId}
              selectedLabel={ciudadLabel}
              excludeCiudadIds={destinos.map((d) => d.ciudadId)}
              destinoFilter={destinoFilter}
              onSelect={(id, label) => {
                setCiudadId(id);
                setCiudadLabel(label);
              }}
              onCreated={(ciudad, paisNombre) => {
                setCiudadId(ciudad.id);
                setCiudadLabel(`${ciudad.nombre} · ${paisNombre}`);
                toast(
                  "success",
                  "Ciudad creada",
                  `${ciudad.nombre} agregada a ${paisNombre}`,
                );
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!ciudadId || saving}
            leftIcon={
              saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )
            }
          >
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}
