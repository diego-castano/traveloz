"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { ChevronRight, MapPin, Globe } from "lucide-react";
import { PackageCard } from "@/components/public/PackageCard";

// ---------------------------------------------------------------------------
// RegionExplorer — 3-level navigation for /destinos/<region>
//
// Levels: Region (header) → País (primary chips) → Ciudad (secondary chips,
// animate in when a país is selected). Selecting a país filters packages to
// those with a destino in that país; selecting a ciudad refines further.
// ---------------------------------------------------------------------------

type Ciudad = { id: string; nombre: string };
type Pais = { id: string; nombre: string; ciudades: Ciudad[] };

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
  destinos: { ciudad: { id: string; nombre: string; paisId: string | null } }[];
};

type Props = {
  region: {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
    heroImage?: string | null;
  };
  paises: Pais[];
  paquetes: Paquete[];
};

export function RegionExplorer({ region, paises, paquetes }: Props) {
  const [paisId, setPaisId] = useState<string | null>(null);
  const [ciudadId, setCiudadId] = useState<string | null>(null);

  // ----- Counts (memoized; package grid uses filtered set anyway) ----------
  const counts = useMemo(() => {
    const byPais = new Map<string, number>();
    const byCiudad = new Map<string, number>();
    for (const p of paquetes) {
      const seenPaises = new Set<string>();
      const seenCiudades = new Set<string>();
      for (const d of p.destinos) {
        const pid = d.ciudad?.paisId;
        const cid = d.ciudad?.id;
        if (pid && !seenPaises.has(pid)) {
          byPais.set(pid, (byPais.get(pid) ?? 0) + 1);
          seenPaises.add(pid);
        }
        if (cid && !seenCiudades.has(cid)) {
          byCiudad.set(cid, (byCiudad.get(cid) ?? 0) + 1);
          seenCiudades.add(cid);
        }
      }
    }
    return { byPais, byCiudad };
  }, [paquetes]);

  // ----- Sort países by package count desc, then alpha --------------------
  const orderedPaises = useMemo(
    () =>
      [...paises].sort((a, b) => {
        const ca = counts.byPais.get(a.id) ?? 0;
        const cb = counts.byPais.get(b.id) ?? 0;
        if (cb !== ca) return cb - ca;
        return a.nombre.localeCompare(b.nombre);
      }),
    [paises, counts],
  );

  const selectedPais = paisId
    ? paises.find((p) => p.id === paisId) ?? null
    : null;

  const orderedCiudades = useMemo(() => {
    if (!selectedPais) return [];
    return [...selectedPais.ciudades].sort((a, b) => {
      const ca = counts.byCiudad.get(a.id) ?? 0;
      const cb = counts.byCiudad.get(b.id) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [selectedPais, counts]);

  // ----- Filtered package list -------------------------------------------
  const filtered = useMemo(() => {
    if (!paisId && !ciudadId) return paquetes;
    return paquetes.filter((p) =>
      p.destinos.some((d) => {
        if (ciudadId) return d.ciudad?.id === ciudadId;
        if (paisId) return d.ciudad?.paisId === paisId;
        return true;
      }),
    );
  }, [paquetes, paisId, ciudadId]);

  const selectPais = (id: string | null) => {
    setPaisId(id);
    setCiudadId(null);
  };

  return (
    <section className="content-area">
      <div className="container">
        {/* Hero / breadcrumb */}
        <div className="banner-text mb_30">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#785AE5",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <a href="/destinos" style={{ color: "#785AE5", fontWeight: 500 }}>
              Destinos
            </a>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={() => selectPais(null)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: paisId ? "#785AE5" : "#222",
                fontWeight: paisId ? 500 : 600,
                cursor: paisId ? "pointer" : "default",
              }}
            >
              {region.nombre}
            </button>
            <AnimatePresence>
              {selectedPais && (
                <motion.span
                  key="pais-crumb"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <ChevronRight size={14} />
                  <button
                    type="button"
                    onClick={() => setCiudadId(null)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: ciudadId ? "#785AE5" : "#222",
                      fontWeight: ciudadId ? 500 : 600,
                      cursor: ciudadId ? "pointer" : "default",
                    }}
                  >
                    {selectedPais.nombre}
                  </button>
                </motion.span>
              )}
              {ciudadId && selectedPais && (
                <motion.span
                  key="ciudad-crumb"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <ChevronRight size={14} />
                  <span style={{ color: "#222", fontWeight: 600 }}>
                    {
                      selectedPais.ciudades.find((c) => c.id === ciudadId)
                        ?.nombre
                    }
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {region.heroImage && (
            <div
              style={{
                marginBottom: 20,
                borderRadius: 16,
                overflow: "hidden",
                aspectRatio: "16 / 5",
                background: "#eee",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={region.heroImage}
                alt={region.nombre}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
          <h1 className="h1" style={{ marginBottom: 8 }}>
            {region.nombre}
          </h1>
          {region.descripcion && (
            <p style={{ color: "#666", maxWidth: 720 }}>{region.descripcion}</p>
          )}
        </div>

        {/* País chips (level 2) */}
        <div style={{ marginBottom: orderedCiudades.length ? 12 : 24 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: "#999",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Globe size={12} /> Países
          </div>
          <LayoutGroup id="pais-chips">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Chip
                active={!paisId}
                onClick={() => selectPais(null)}
                count={paquetes.length}
              >
                Todos
              </Chip>
              {orderedPaises.map((p) => (
                <Chip
                  key={p.id}
                  active={paisId === p.id}
                  onClick={() => selectPais(p.id === paisId ? null : p.id)}
                  count={counts.byPais.get(p.id) ?? 0}
                >
                  {p.nombre}
                </Chip>
              ))}
            </div>
          </LayoutGroup>
        </div>

        {/* Ciudad chips (level 3) — slide in when país selected */}
        <AnimatePresence initial={false}>
          {selectedPais && (
            <motion.div
              key={selectedPais.id}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "#999",
                  marginBottom: 8,
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <MapPin size={12} /> Ciudades en {selectedPais.nombre}
              </div>
              <LayoutGroup id="ciudad-chips">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Chip
                    variant="secondary"
                    active={!ciudadId}
                    onClick={() => setCiudadId(null)}
                    count={counts.byPais.get(selectedPais.id) ?? 0}
                  >
                    Todas
                  </Chip>
                  {orderedCiudades.map((c) => {
                    const cnt = counts.byCiudad.get(c.id) ?? 0;
                    return (
                      <Chip
                        key={c.id}
                        variant="secondary"
                        disabled={cnt === 0}
                        active={ciudadId === c.id}
                        onClick={() =>
                          setCiudadId(c.id === ciudadId ? null : c.id)
                        }
                        count={cnt}
                      >
                        {c.nombre}
                      </Chip>
                    );
                  })}
                </div>
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Package grid */}
        <div
          style={{
            fontSize: 13,
            color: "#666",
            marginBottom: 16,
          }}
        >
          {filtered.length === 0
            ? "No hay paquetes para esta selección."
            : `${filtered.length} paquete${filtered.length === 1 ? "" : "s"} disponibles`}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12">
            Próximamente más destinos en esta región.
          </p>
        ) : (
          <motion.div className="row" layout>
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="col-lg-4 col-md-6 mb-4"
                >
                  <PackageCard paquete={p} regionSlug={region.slug} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Chip — animated pill with active underline
// ---------------------------------------------------------------------------

function Chip({
  children,
  active,
  onClick,
  count,
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: isPrimary ? "8px 14px" : "6px 12px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: active
          ? "#785AE5"
          : disabled
            ? "#eee"
            : "rgba(0,0,0,0.08)",
        background: active
          ? isPrimary
            ? "#785AE5"
            : "rgba(120,90,229,0.10)"
          : "white",
        color: active
          ? isPrimary
            ? "white"
            : "#785AE5"
          : disabled
            ? "#bbb"
            : "#333",
        fontSize: isPrimary ? 13.5 : 12.5,
        fontWeight: active ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.18s, color 0.18s, border-color 0.18s",
        boxShadow: active && isPrimary ? "0 4px 14px rgba(120,90,229,0.25)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {typeof count === "number" && (
        <span
          style={{
            display: "inline-block",
            minWidth: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: active
              ? isPrimary
                ? "rgba(255,255,255,0.22)"
                : "rgba(120,90,229,0.18)"
              : "rgba(0,0,0,0.05)",
            color: active && isPrimary ? "white" : undefined,
            fontSize: 11,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: "16px",
          }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
