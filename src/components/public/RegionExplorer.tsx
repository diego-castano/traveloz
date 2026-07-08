"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PackageCard } from "@/components/public/PackageCard";

// ---------------------------------------------------------------------------
// RegionExplorer — listados de paquetes por región (/destinos/<region>).
// Réplica 1:1 del shell de html_inicial/destination-listing.html: h1 centrado,
// filter form (cosmético, sin lógica), sort dropdown (Menor/Mayor precio),
// grid 4-up en xxl, 3-up en lg, 2-up en sm.
//
// Funcional: el sort dropdown ordena en cliente (la query al server ya
// devuelve ordenado por precio ASC, pero el usuario puede invertirlo acá).
// El search input está como UI pero no filtra — el buscador de paquetes
// real vive en la home y en el detail. El filter form coincide con el
// reference para que el match visual sea exacto.
// ---------------------------------------------------------------------------

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
};

type Props = {
  region: {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
  };
  paquetes: Paquete[];
};

type SortKey = "low" | "high";

export function RegionExplorer({ region, paquetes }: Props) {
  const [sort, setSort] = useState<SortKey>("low");

  const sorted = useMemo(() => {
    const copy = [...paquetes];
    copy.sort((a, b) => {
      const av = a.precioDesde ?? Number.POSITIVE_INFINITY;
      const bv = b.precioDesde ?? Number.POSITIVE_INFINITY;
      return sort === "low" ? av - bv : bv - av;
    });
    return copy;
  }, [paquetes, sort]);

  return (
    <section className="listing-area">
      <div className="container wide">
        <div className="listing-filter">
          <h1 className="h2 text-center">Explorá todos los destinos</h1>
          <div className="filter-form">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="inner-flex">
                <div className="filter-fields">
                  <div className="inner-field">
                    <label htmlFor="filter-location">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/site/img/location-icon.svg" alt="" />
                    </label>
                    <input
                      type="search"
                      id="filter-location"
                      placeholder="Destino"
                    />
                  </div>
                  <div className="inner-field">
                    <label
                      htmlFor="filter-season"
                      className="file-label"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/site/img/file.svg" alt="" />
                    </label>
                    <input
                      type="text"
                      id="filter-season"
                      placeholder="Temporada"
                    />
                  </div>
                </div>
                <button type="submit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/site/img/search-icon.svg" alt="" />
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="filter_select d-flex justify-content-end align-items-center mb-4">
          <strong>Ordenar por</strong>
          <SortDropdown value={sort} onChange={setSort} />
        </div>

        {sorted.length === 0 ? (
          <p className="text-center py-12">
            Próximamente más destinos en {region.nombre}.
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
                    regionSlug={region.slug}
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
// (cs_arrow), <ul> que se abre al click. Es accesible por teclado: cada
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
