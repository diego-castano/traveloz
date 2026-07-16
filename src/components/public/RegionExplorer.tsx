"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { PackageCard } from "@/components/public/PackageCard";

// ---------------------------------------------------------------------------
// RegionExplorer — listados de paquetes por región (/destinos/<region>).
// Réplica 1:1 del shell de html_inicial/destination-listing.html: h1 centrado,
// filter form con typeahead de ciudad + chips de temporada, sort dropdown
// (Menor/Mayor precio), grid 4-up en xxl, 3-up en lg, 2-up en sm.
//
// Funcional: ciudad y temporada filtran en cliente en tiempo real (el
// servidor ya devuelve los paquetes de la región). El sort es independiente.
// ---------------------------------------------------------------------------

type Ciudad = { id: string; nombre: string; paisNombre: string };

type Paquete = {
  id: string;
  slug: string | null;
  titulo: string;
  destino: string;
  noches: number;
  salidas: string | null;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
  heroImage: string | null;
  fotos: { url: string; alt: string }[];
  bullets: string[];
  ciudades: { id: string; nombre: string; paisNombre: string }[];
  /**
   * Slug de la región del paquete, para armar el href de la card. Solo lo
   * completa la variante "todos" (cada paquete puede ser de una región
   * distinta); en /destinos/[region] queda undefined y se usa `region.slug`.
   */
  regionSlug?: string;
};

type Props = {
  /**
   * Ausente en la variante "todos" (/destinos/todos): no hay una única
   * región de referencia, así que el mensaje de "sin resultados" y el href
   * de cada card (via `paquete.regionSlug` en vez de un slug fijo) manejan
   * ese caso. Presente en /destinos/[region], comportamiento sin cambios.
   */
  region?: { id: string; slug: string; nombre: string; descripcion: string | null } | null;
  /** Override del h1. Default: "Explorá todos los destinos" (mismo texto
   * histórico que ya usaban las páginas por región). */
  titulo?: string;
  paquetes: Paquete[];
  ciudades: Ciudad[];
};

type SortKey = "low" | "high";

// ---------------------------------------------------------------------------
// Meses canónicos (orden cronológico) y parser de `paquete.salidas` (string
// libre, ej. "Octubre - Noviembre 2026", "Salidas todo el año").
// Devuelve los meses que matchean por nombre dentro del string.
// ---------------------------------------------------------------------------

const MONTHS = [
  { id: "ene", nombre: "Enero", patterns: [/\benero\b/i] },
  { id: "feb", nombre: "Febrero", patterns: [/\bfebrero\b/i] },
  { id: "mar", nombre: "Marzo", patterns: [/\bmarzo\b/i] },
  { id: "abr", nombre: "Abril", patterns: [/\babril\b/i] },
  { id: "may", nombre: "Mayo", patterns: [/\bmayo\b/i] },
  { id: "jun", nombre: "Junio", patterns: [/\bjunio\b/i] },
  { id: "jul", nombre: "Julio", patterns: [/\bjulio\b/i] },
  { id: "ago", nombre: "Agosto", patterns: [/\bagosto\b/i] },
  { id: "sep", nombre: "Septiembre", patterns: [/\bseptiembre\b/i, /\bsetiembre\b/i] },
  { id: "oct", nombre: "Octubre", patterns: [/\boctubre\b/i] },
  { id: "nov", nombre: "Noviembre", patterns: [/\bnoviembre\b/i] },
  { id: "dic", nombre: "Diciembre", patterns: [/\bdiciembre\b/i] },
] as const;

function mesesDeSalidas(salidas: string | null): string[] {
  if (!salidas) return [];
  const ids = new Set<string>();
  for (const m of MONTHS) {
    if (m.patterns.some((re) => re.test(salidas))) ids.add(m.id);
  }
  return Array.from(ids);
}

export function RegionExplorer({ region, titulo, paquetes, ciudades }: Props) {
  const [sort, setSort] = useState<SortKey>("low");
  const [ciudadInput, setCiudadInput] = useState("");
  const [ciudadOpen, setCiudadOpen] = useState(false);
  const [ciudadesSel, setCiudadesSel] = useState<Ciudad[]>([]);
  const [temporadaOpen, setTemporadaOpen] = useState(false);
  const [temporadas, setTemporadas] = useState<Set<string>>(new Set());
  const ciudadInputRef = useRef<HTMLInputElement>(null);

  // Meses disponibles = unión de los meses matcheados en `salidas` de los
  // paquetes de la región. Orden cronológico.
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes) for (const m of mesesDeSalidas(p.salidas)) set.add(m);
    return MONTHS.filter((m) => set.has(m.id));
  }, [paquetes]);

  // Sugerencias del typeahead: ciudades que matchean el query, no seleccionadas.
  const sugerencias = useMemo(() => {
    const q = ciudadInput.trim().toLowerCase();
    const selIds = new Set(ciudadesSel.map((c) => c.id));
    const disponibles = ciudades.filter((c) => !selIds.has(c.id));
    if (!q) return disponibles.slice(0, 8);
    return disponibles
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.paisNombre.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [ciudadInput, ciudades, ciudadesSel]);

  const addCiudad = (c: Ciudad) => {
    if (ciudadesSel.some((x) => x.id === c.id)) return;
    setCiudadesSel((prev) => [...prev, c]);
    setCiudadInput("");
    setCiudadOpen(false);
    ciudadInputRef.current?.focus();
  };
  const removeCiudad = (id: string) => {
    setCiudadesSel((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleTemporada = (id: string) => {
    setTemporadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtro combinado (ciudades OR, temporadas OR — un paquete pasa si tiene
  // CUALQUIER ciudad seleccionada Y CUALQUIER temporada seleccionada).
  // Si el filtro está vacío, ese eje es libre.
  const filtered = useMemo(() => {
    return paquetes.filter((p) => {
      if (ciudadesSel.length > 0) {
        const hit = p.ciudades.some((c) => ciudadesSel.some((s) => s.id === c.id));
        if (!hit) return false;
      }
      if (temporadas.size > 0) {
        const pMeses = mesesDeSalidas(p.salidas);
        if (!pMeses.some((m) => temporadas.has(m))) return false;
      }
      return true;
    });
  }, [paquetes, ciudadesSel, temporadas]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a.precioDesde ?? Number.POSITIVE_INFINITY;
      const bv = b.precioDesde ?? Number.POSITIVE_INFINITY;
      return sort === "low" ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sort]);

  const hasFilters = ciudadesSel.length > 0 || temporadas.size > 0;

  return (
    <section className="listing-area">
      <div className="container wide">
        <div className="listing-filter">
          <h1 className="h2 text-center">{titulo ?? "Explorá todos los destinos"}</h1>
          <div className="filter-form">
            <div className="inner-flex">
              {/* City typeahead (multi) */}
              <div className="filter-fields">
                <div
                  className={`inner-field city-field${
                    ciudadOpen ? " is-open" : ""
                  }`}
                >
                  <label htmlFor="filter-location">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/site/img/location-icon.svg" alt="" />
                  </label>
                  <div className="city-input-wrap">
                    {ciudadesSel.map((c) => (
                      <span key={c.id} className="city-chip">
                        {c.nombre}
                        <button
                          type="button"
                          onClick={() => removeCiudad(c.id)}
                          aria-label={`Quitar ${c.nombre}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={ciudadInputRef}
                      type="text"
                      id="filter-location"
                      autoComplete="off"
                      placeholder={ciudadesSel.length === 0 ? "Destino (ciudad)" : ""}
                      value={ciudadInput}
                      onChange={(e) => {
                        setCiudadInput(e.target.value);
                        setCiudadOpen(true);
                      }}
                      onFocus={() => {
                        setCiudadOpen(true);
                        setTemporadaOpen(false);
                      }}
                      onClick={() => {
                        // Si el input ya tiene focus, el segundo click no
                        // dispara focus — reabrimos el dropdown manualmente.
                        setCiudadOpen(true);
                        setTemporadaOpen(false);
                      }}
                      onBlur={() => {
                        setTimeout(() => setCiudadOpen(false), 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (sugerencias[0]) addCiudad(sugerencias[0]);
                        } else if (e.key === "Backspace" && ciudadInput === "" && ciudadesSel.length > 0) {
                          removeCiudad(ciudadesSel[ciudadesSel.length - 1].id);
                        }
                      }}
                    />
                  </div>
                  {ciudadOpen && sugerencias.length > 0 && (
                    <ul className="city-suggest" role="listbox">
                      {sugerencias.map((c) => (
                        <li
                          key={c.id}
                          role="option"
                          aria-selected={false}
                          tabIndex={0}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addCiudad(c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addCiudad(c);
                          }}
                        >
                          <span className="city-suggest-name">{c.nombre}</span>
                          <span className="city-suggest-pais">{c.paisNombre}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Temporada (multi) — mismo patrón visual que el de ciudad */}
                {mesesDisponibles.length > 0 && (
                  <div
                    className={`inner-field city-field season-field${
                      temporadaOpen ? " is-open" : ""
                    }`}
                  >
                    <label htmlFor="filter-season" className="file-label">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/site/img/file.svg" alt="" />
                    </label>
                    <div className="city-input-wrap">
                      {Array.from(temporadas).map((id) => {
                        const m = MONTHS.find((x) => x.id === id);
                        if (!m) return null;
                        return (
                          <span key={id} className="city-chip">
                            {m.nombre}
                            <button
                              type="button"
                              onClick={() => toggleTemporada(id)}
                              aria-label={`Quitar ${m.nombre}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      <input
                        id="filter-season"
                        type="text"
                        readOnly
                        autoComplete="off"
                        placeholder={
                          temporadas.size === 0 ? "Temporada" : ""
                        }
                        onFocus={() => {
                          setTemporadaOpen(true);
                          setCiudadOpen(false);
                        }}
                        onClick={() => {
                          setTemporadaOpen(true);
                          setCiudadOpen(false);
                        }}
                      />
                    </div>
                    {temporadaOpen && (
                      <ul className="city-suggest" role="listbox">
                        {mesesDisponibles.map((m) => {
                          const active = temporadas.has(m.id);
                          return (
                            <li
                              key={m.id}
                              role="option"
                              aria-selected={active}
                              tabIndex={0}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => toggleTemporada(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") toggleTemporada(m.id);
                              }}
                              className={active ? "is-active" : ""}
                            >
                              <span className="city-suggest-name">{m.nombre}</span>
                              {active && (
                                <span className="city-suggest-pais">✓</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCiudadOpen(false);
                  setTemporadaOpen(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/site/img/search-icon.svg" alt="" />
                Buscar
              </button>
            </div>
          </div>
        </div>

        <div className="filter_select d-flex justify-content-end align-items-center mb-4">
          {hasFilters && (
            <button
              type="button"
              className="clear-filters"
              onClick={() => {
                setCiudadesSel([]);
                setTemporadas(new Set());
                setCiudadInput("");
              }}
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
          <strong>Ordenar por</strong>
          <SortDropdown value={sort} onChange={setSort} />
        </div>

        {sorted.length === 0 ? (
          <p className="text-center py-12">
            {hasFilters
              ? `No hay paquetes que coincidan con los filtros${
                  region ? ` en ${region.nombre}` : ""
                }.`
              : `Próximamente más destinos${region ? ` en ${region.nombre}` : ""}.`}
          </p>
        ) : (
          <div className="row g-lg-4 g-3">
            <AnimatePresence mode="popLayout">
              {sorted.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="col-xxl-3 col-lg-4 col-sm-6"
                >
                  <PackageCard
                    paquete={p}
                    regionSlug={p.regionSlug ?? region?.slug ?? ""}
                    variant="alt"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SortDropdown — replica .cs_dropdown del reference. CSS-only chevron
// (cs_arrow), <ul> que se abre al click. Accesible por teclado: cada
// opción es un <li role="option"> con tabindex y Enter/Space para elegir.
// ---------------------------------------------------------------------------

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value === "low" ? "Menor precio" : "Mayor precio";

  return (
    <div
      className={`cs_dropdown${open ? " open" : ""}`}
      onClick={() => setOpen((v) => !v)}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <span className="cs_selected">
        {label}
        <i className="cs_arrow" />
      </span>
      <ul className="cs_options" role="listbox">
        {(["low", "high"] as const).map((v) => (
          <li
            key={v}
            role="option"
            aria-selected={v === value}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(v);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(v);
                setOpen(false);
              }
            }}
            data-value={v}
          >
            {v === "low" ? "Menor precio" : "Mayor precio"}
          </li>
        ))}
      </ul>
    </div>
  );
}
