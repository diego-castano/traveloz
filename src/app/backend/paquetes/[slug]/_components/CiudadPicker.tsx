"use client";

// ---------------------------------------------------------------------------
// CiudadPicker + helpers de alcance por destino.
//
// Vivía adentro de AlojamientosTab, que es el único lugar donde los paquetes
// CLASICO cargan sus ciudades. Ahora lo comparte el bloque de ciudades de los
// paquetes CIRCUITO (pestaña Datos): las dos pantallas eligen ciudad del mismo
// catálogo, con el mismo agrupado Región > País y la misma opción de crear una
// ciudad que todavía no existe. Sacarlo acá evita tener dos combobox que se
// vayan desincronizando.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Search,
  Star,
} from "lucide-react";
import {
  usePaises,
  useRegiones,
  useCatalogActions,
} from "@/components/providers/CatalogProvider";
import type { Pais, Region, Ciudad } from "@/lib/types";

const DESTINO_BREADCRUMB_SEPARATOR = "›";

export type PaisWithCiudades = Pais & { ciudades: Ciudad[] };
export type RegionWithPaises = Region & { paises: PaisWithCiudades[] };

export interface DestinoFilterScope {
  label: string;
  allowedCiudadIds: Set<string>;
  allowedPaisIds: Set<string>;
}

export function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildDestinoBreadcrumb(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(` ${DESTINO_BREADCRUMB_SEPARATOR} `);
}

function collectDestinoMatches(
  term: string,
  paises: PaisWithCiudades[],
  regiones: RegionWithPaises[],
) {
  const normalizedTerm = normalizeSearch(term);
  const matchedCiudadIds = new Set<string>();
  const matchedPaisIds = new Set<string>();
  const matchedRegionIds = new Set<string>();
  const regionNameById = new Map(regiones.map((region) => [region.id, region.nombre]));

  for (const region of regiones) {
    if (normalizeSearch(region.nombre) === normalizedTerm) {
      matchedRegionIds.add(region.id);
    }
  }

  for (const pais of paises) {
    const regionNombre = pais.regionId
      ? (regionNameById.get(pais.regionId) ?? null)
      : null;
    const paisBreadcrumb = buildDestinoBreadcrumb([regionNombre, pais.nombre]);

    if (
      normalizeSearch(pais.nombre) === normalizedTerm ||
      normalizeSearch(paisBreadcrumb) === normalizedTerm
    ) {
      matchedPaisIds.add(pais.id);
    }

    for (const ciudad of pais.ciudades) {
      const ciudadBreadcrumb = buildDestinoBreadcrumb([
        regionNombre,
        pais.nombre,
        ciudad.nombre,
      ]);
      if (
        normalizeSearch(ciudad.nombre) === normalizedTerm ||
        normalizeSearch(ciudadBreadcrumb) === normalizedTerm
      ) {
        matchedCiudadIds.add(ciudad.id);
        matchedPaisIds.add(pais.id);
      }
    }
  }

  return { matchedCiudadIds, matchedPaisIds, matchedRegionIds };
}

function tokenizeDestinoInput(value: string): string[] {
  return value
    .split(/\s*(?:\+|\/|,|\sy\s|\se\s)\s*/i)
    .map((term) => term.trim())
    .filter(Boolean);
}

export function resolveDestinoFilterScope(
  destinoValue: string | null | undefined,
  paises: PaisWithCiudades[],
  regiones: RegionWithPaises[],
): DestinoFilterScope | null {
  const raw = destinoValue?.trim();
  if (!raw) return null;

  const allowedCiudadIds = new Set<string>();
  const allowedPaisIds = new Set<string>();

  const applyMatches = (
    matches: ReturnType<typeof collectDestinoMatches>,
    includePaises: boolean,
  ) => {
    for (const ciudadId of Array.from(matches.matchedCiudadIds)) {
      allowedCiudadIds.add(ciudadId);
    }

    for (const regionId of Array.from(matches.matchedRegionIds)) {
      for (const pais of paises) {
        if (pais.regionId === regionId) {
          allowedPaisIds.add(pais.id);
        }
      }
    }

    if (includePaises) {
      for (const paisId of Array.from(matches.matchedPaisIds)) {
        allowedPaisIds.add(paisId);
      }
    }
  };

  const directMatches = collectDestinoMatches(raw, paises, regiones);
  const hasDirectMatch =
    directMatches.matchedCiudadIds.size > 0 ||
    directMatches.matchedPaisIds.size > 0 ||
    directMatches.matchedRegionIds.size > 0;

  if (hasDirectMatch) {
    applyMatches(directMatches, true);
  } else {
    for (const token of tokenizeDestinoInput(raw)) {
      applyMatches(collectDestinoMatches(token, paises, regiones), true);
    }
  }

  for (const paisId of Array.from(allowedPaisIds)) {
    const pais = paises.find((item) => item.id === paisId);
    if (!pais) continue;
    for (const ciudad of pais.ciudades) {
      allowedCiudadIds.add(ciudad.id);
    }
  }

  if (allowedCiudadIds.size === 0) return null;

  return {
    label: raw,
    allowedCiudadIds,
    allowedPaisIds,
  };
}

// ---------------------------------------------------------------------------
// CiudadPicker — Select2-style combobox grouped by Region > País.
//   Typing filters across ciudad/pais/region.
//   Empty matches in an exact-text match: offers "Crear '<text>' en <país>"
//   pickers (one per país whose name appears in the state).
// ---------------------------------------------------------------------------

export function CiudadPicker({
  selectedId,
  selectedLabel,
  excludeCiudadIds,
  destinoFilter,
  disabled = false,
  onSelect,
  onCreated,
}: {
  selectedId: string;
  selectedLabel: string;
  excludeCiudadIds: string[];
  destinoFilter: DestinoFilterScope | null;
  /** Modo lectura: el combobox no se abre (mismo criterio de `canEdit` que el resto del panel). */
  disabled?: boolean;
  onSelect: (id: string, label: string) => void;
  onCreated: (ciudad: { id: string; nombre: string; paisId: string }, paisNombre: string) => void;
}) {
  const paises = usePaises();
  const regiones = useRegiones();
  const { createCiudad } = useCatalogActions();

  // Region metadata by id (nombre + orden) so we can look up region info for
  // any país without relying on the region→país nesting in useRegiones (which
  // silently drops países whose regionId is null or points nowhere).
  const regionMetaById = useMemo(() => {
    const m = new Map<string, { nombre: string; orden: number }>();
    for (const r of regiones) m.set(r.id, { nombre: r.nombre, orden: r.orden });
    return m;
  }, [regiones]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creatingInPaisId, setCreatingInPaisId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Compute dropdown position from the trigger each time we open or the
  // viewport scrolls/resizes. We use fixed positioning + portal so we escape
  // every parent stacking context created by backdrop-filter / transform.
  useEffect(() => {
    if (!open) {
      setAnchorRect(null);
      return;
    }
    function update() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setAnchorRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Close on outside click (ignore clicks inside the portal dropdown too).
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger =
        containerRef.current && containerRef.current.contains(target);
      const insideDropdown =
        dropdownRef.current && dropdownRef.current.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const excludeSet = useMemo(
    () => new Set(excludeCiudadIds),
    [excludeCiudadIds],
  );

  // Build grouped structure iterating países (not regiones) so países whose
  // regionId is null still appear — under a "Sin región" group at the end.
  //
  // The catalog is never hard-filtered by the paquete's destino: every
  // ciudad in every país is always searchable and selectable. When a
  // destinoFilter is present we only use it to *rank* — ciudades within
  // scope are split off into `recommendedRows` (rendered first, under a
  // "Recomendadas" header), while `groupedResults` holds everything else
  // (the full catalog minus whatever already appeared as recommended).
  const { recommendedRows, groupedResults } = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const SIN_REGION = "Sin región";
    type Row = {
      regionNombre: string;
      paisId: string;
      paisNombre: string;
      regionOrden: number;
      ciudades: Array<{ id: string; nombre: string }>;
    };
    const recommended: Row[] = [];
    const rest: Row[] = [];
    for (const p of paises) {
      const meta = p.regionId ? regionMetaById.get(p.regionId) : null;
      const regionNombre = meta?.nombre ?? SIN_REGION;
      const regionOrden = meta?.orden ?? Number.MAX_SAFE_INTEGER;
      const visibleCiudades = p.ciudades
        .filter((c) => !excludeSet.has(c.id))
        .filter((c) => {
          if (!q) return true;
          const paisMatch = normalizeSearch(p.nombre).includes(q);
          const regionMatch = normalizeSearch(regionNombre).includes(q);
          const ciudadMatch = normalizeSearch(c.nombre).includes(q);
          return paisMatch || regionMatch || ciudadMatch;
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      if (visibleCiudades.length === 0) continue;

      const recomendadas = destinoFilter
        ? visibleCiudades.filter((c) => destinoFilter.allowedCiudadIds.has(c.id))
        : [];
      const restantes = destinoFilter
        ? visibleCiudades.filter((c) => !destinoFilter.allowedCiudadIds.has(c.id))
        : visibleCiudades;

      if (recomendadas.length > 0) {
        recommended.push({
          regionNombre,
          regionOrden,
          paisId: p.id,
          paisNombre: p.nombre,
          ciudades: recomendadas,
        });
      }
      if (restantes.length > 0) {
        rest.push({
          regionNombre,
          regionOrden,
          paisId: p.id,
          paisNombre: p.nombre,
          ciudades: restantes,
        });
      }
    }
    const sortRows = (rows: Row[]) =>
      rows.sort(
        (a, b) =>
          a.regionOrden - b.regionOrden ||
          a.regionNombre.localeCompare(b.regionNombre) ||
          a.paisNombre.localeCompare(b.paisNombre),
      );
    return {
      recommendedRows: sortRows(recommended),
      groupedResults: sortRows(rest),
    };
  }, [paises, regionMetaById, search, excludeSet, destinoFilter]);

  // All países, sorted alphabetically — used for "Create '<text>' in <país>"
  // options when search has no direct ciudad match. Every país is always
  // offered; when a destinoFilter is present, países within scope are just
  // listed first (recommendation, not restriction).
  const paisesPlanos = useMemo(() => {
    const all = paises
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        regionNombre: (p.regionId && regionMetaById.get(p.regionId)?.nombre) || "Sin región",
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (!destinoFilter) return all;
    const scoped = all.filter((p) => destinoFilter.allowedPaisIds.has(p.id));
    const resto = all.filter((p) => !destinoFilter.allowedPaisIds.has(p.id));
    return [...scoped, ...resto];
  }, [paises, regionMetaById, destinoFilter]);

  // If user typed something and there are zero ciudad matches, offer to
  // create it in one of the países whose name matches (or any país if only
  // the ciudad-name part is novel).
  const createTargets = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    const lowered = normalizeSearch(q);
    // If any row already matches by ciudad exactly, don't offer create.
    const exact = [...recommendedRows, ...groupedResults].some((row) =>
      row.ciudades.some((c) => normalizeSearch(c.nombre) === lowered),
    );
    if (exact) return [];
    // Prefer países whose name matches the search; fall back to all países
    // sorted by relevance (scope-first, then name-match first).
    const matchingPaises = paisesPlanos.filter((p) =>
      normalizeSearch(p.nombre).includes(lowered),
    );
    return (matchingPaises.length > 0 ? matchingPaises : paisesPlanos).slice(
      0,
      matchingPaises.length > 0 ? matchingPaises.length : 6,
    );
  }, [search, recommendedRows, groupedResults, paisesPlanos]);

  const handleCreate = async (paisId: string, paisNombre: string) => {
    const nombre = search.trim();
    if (!nombre) return;
    setCreatingInPaisId(paisId);
    try {
      const created = (await createCiudad({ paisId, nombre })) as unknown as {
        id: string;
        nombre: string;
        paisId: string;
      };
      onCreated(created, paisNombre);
      setOpen(false);
      setSearch("");
    } catch {
      // Toast handled upstream via package actions; we keep silent here.
    } finally {
      setCreatingInPaisId(null);
    }
  };

  const hasAnyResult =
    recommendedRows.length > 0 ||
    groupedResults.length > 0 ||
    createTargets.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-sm bg-white/80 rounded-md border border-neutral-200 px-2 py-1 focus:border-teal-500 focus:outline-none hover:border-teal-300 transition-colors text-left disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-neutral-200"
      >
        <MapPin className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
        <span
          className={`flex-1 truncate ${
            selectedId ? "text-neutral-800" : "text-neutral-400"
          }`}
        >
          {selectedId ? selectedLabel : "Elegí una ciudad…"}
        </span>
        <Search className="h-3 w-3 text-neutral-300 flex-shrink-0" />
      </button>

      {open && anchorRect
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: anchorRect.top,
                left: anchorRect.left,
                width: anchorRect.width,
                zIndex: 1000,
              }}
              className="rounded-lg border border-neutral-200 bg-white shadow-xl overflow-hidden"
            >
              <div className="relative border-b border-neutral-100">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ciudad, país o región…"
                  className="w-full text-sm pl-8 pr-3 py-2 focus:outline-none"
                />
              </div>

              {destinoFilter && (
                <div className="flex items-center gap-1.5 border-b border-teal-100 bg-teal-50/60 px-2.5 py-1.5 text-[11px] text-teal-700">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    Destino del paquete: {destinoFilter.label} · se muestran
                    todas las ciudades
                  </span>
                </div>
              )}

              <div className="max-h-[320px] overflow-y-auto">
                {!hasAnyResult ? (
                  <div className="px-3 py-6 text-center text-xs text-neutral-400 italic">
                    Sin resultados.
                  </div>
                ) : (
                  <>
                    {recommendedRows.length > 0 && (
                      <div className="py-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wide text-teal-700 font-semibold bg-teal-50/80">
                          <Star className="h-2.5 w-2.5 text-teal-500 flex-shrink-0" />
                          <span>Recomendadas · {destinoFilter?.label}</span>
                        </div>
                        {recommendedRows.map((row) => (
                          <div key={`rec-${row.paisId}`} className="py-0.5">
                            <div className="flex items-center gap-1 px-4 py-1 text-[10px] uppercase tracking-wide text-teal-600/80 font-medium">
                              <span>{row.regionNombre}</span>
                              <ChevronRight className="h-2.5 w-2.5 text-teal-300" />
                              <span>{row.paisNombre}</span>
                            </div>
                            {row.ciudades.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  onSelect(
                                    c.id,
                                    `${c.nombre} · ${row.paisNombre}`,
                                  );
                                  setOpen(false);
                                  setSearch("");
                                }}
                                className="w-full flex items-center gap-2 px-6 py-1.5 text-left text-sm hover:bg-teal-50/60 transition-colors"
                              >
                                <MapPin className="h-3 w-3 text-teal-400 flex-shrink-0" />
                                <span className="truncate text-neutral-800">
                                  {c.nombre}
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {groupedResults.map((row, index) => (
                      <div
                        key={row.paisId}
                        className={
                          index === 0 && recommendedRows.length > 0
                            ? "py-1 border-t border-neutral-100"
                            : "py-1"
                        }
                      >
                        <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wide text-neutral-400 font-semibold bg-neutral-50/70">
                          <span className="text-teal-600">
                            {row.regionNombre}
                          </span>
                          <ChevronRight className="h-2.5 w-2.5 text-neutral-300" />
                          <span>{row.paisNombre}</span>
                        </div>
                        {row.ciudades.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              onSelect(
                                c.id,
                                `${c.nombre} · ${row.paisNombre}`,
                              );
                              setOpen(false);
                              setSearch("");
                            }}
                            className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-teal-50/60 transition-colors"
                          >
                            <MapPin className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                            <span className="truncate text-neutral-800">
                              {c.nombre}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}

                    {createTargets.length > 0 && search.trim() && (
                      <div className="border-t border-neutral-100 py-1 bg-amber-50/30">
                        <div className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-amber-700 font-semibold">
                          Crear “{search.trim()}” en…
                        </div>
                        {createTargets.map((p) => {
                          const busy = creatingInPaisId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={busy}
                              onClick={() => handleCreate(p.id, p.nombre)}
                              className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 text-amber-600 animate-spin flex-shrink-0" />
                              ) : (
                                <Plus className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              )}
                              <span className="truncate text-neutral-800">
                                {p.nombre}
                              </span>
                              <span className="ml-auto text-[11px] text-neutral-400">
                                {p.regionNombre}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
