"use client";

import { useMemo } from "react";
import { useAereos } from "@/components/providers/ServiceProvider";
import { usePaises } from "@/components/providers/CatalogProvider";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Opciones de "destino" para el campo de un aéreo. Fuente principal: el catálogo
 * de ciudades (Catálogos → Regiones y Países), así aparecen todas las ciudades
 * cargadas aunque todavía no se hayan usado en ningún aéreo (ej. Miami). Se le
 * suman los destinos ya tipeados en aéreos que no estén en el catálogo, para no
 * perder los que se cargaron a mano. Deduplicado (sin tildes/mayúsculas) y
 * ordenado alfabéticamente.
 */
export function useDestinoOptions(): string[] {
  const aereos = useAereos();
  const paises = usePaises();

  return useMemo(() => {
    const porNombre = new Map<string, string>();

    // 1) Catálogo de ciudades — la fuente principal.
    for (const p of paises) {
      for (const c of p.ciudades ?? []) {
        const nombre = (c.nombre ?? "").trim();
        if (!nombre) continue;
        const key = norm(nombre);
        if (!porNombre.has(key)) porNombre.set(key, nombre);
      }
    }

    // 2) Destinos ya usados en aéreos que no estén en el catálogo.
    for (const a of aereos) {
      const destino = (a.destino ?? "").trim();
      if (!destino) continue;
      const key = norm(destino);
      if (!porNombre.has(key)) porNombre.set(key, destino);
    }

    return Array.from(porNombre.values()).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [paises, aereos]);
}
