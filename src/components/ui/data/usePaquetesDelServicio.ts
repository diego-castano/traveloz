"use client";

import { useMemo } from "react";
import { usePackageState } from "@/components/providers/PackageProvider";
import type { PaqueteDelServicio } from "@/components/ui/data/PaquetesDelServicio";

/**
 * usePaquetesDelServicio — "¿qué paquetes usan este servicio?", una sola vez.
 *
 * Los cinco listados de servicios (aéreos, alojamientos, traslados, seguros,
 * circuitos) mostraban el mismo contador "N paq." con el mismo useMemo
 * copiado cinco veces. Acá vive esa lógica una sola vez y encima devuelve la
 * lista de paquetes, que es lo que el desplegable necesita.
 *
 * Devuelve dos mapas por id de servicio:
 *   • `countPorServicio`  — sale del join, así el contador es correcto desde el
 *                           primer render aunque los paquetes sigan hidratando.
 *   • `paquetesPorServicio` — sólo los paquetes ya hidratados, ordenados por
 *                           título. Puede tener menos ítems que el contador
 *                           mientras `hydratando` sea true.
 */

export type TipoServicio =
  | "aereo"
  | "alojamiento"
  | "traslado"
  | "seguro"
  | "circuito";

export function usePaquetesDelServicio(tipo: TipoServicio): {
  paquetesPorServicio: Record<string, PaqueteDelServicio[]>;
  countPorServicio: Record<string, number>;
  hydratando: boolean;
} {
  const state = usePackageState();

  // Cada join guarda el FK con su propio nombre; lo normalizamos a
  // { servicioId, paqueteId } para que el resto sea un único camino.
  const relaciones = useMemo(() => {
    switch (tipo) {
      case "aereo":
        return state.paqueteAereos.map((r) => ({
          servicioId: r.aereoId,
          paqueteId: r.paqueteId,
        }));
      case "alojamiento": {
        // Los hoteles se enganchan al paquete por OPCIÓN HOTELERA, no por la
        // tabla PaqueteAlojamiento: esa quedó de una etapa anterior y hoy no
        // tiene una sola fila que apunte a un paquete vivo (6 filas, todas de
        // paquetes borrados), por eso el contador "N paq." de este listado
        // siempre daba cero. Igual sumamos las dos fuentes y dedupeamos, para
        // que un paquete viejo que todavía use la relación directa aparezca.
        const paqueteDeOpcion = new Map(
          state.opcionesHoteleras.map((o) => [o.id, o.paqueteId]),
        );
        return [
          ...state.opcionHoteles.flatMap((oh) => {
            const paqueteId = paqueteDeOpcion.get(oh.opcionHoteleraId);
            return paqueteId
              ? [{ servicioId: oh.alojamientoId, paqueteId }]
              : [];
          }),
          ...state.paqueteAlojamientos.map((r) => ({
            servicioId: r.alojamientoId,
            paqueteId: r.paqueteId,
          })),
        ];
      }
      case "traslado":
        return state.paqueteTraslados.map((r) => ({
          servicioId: r.trasladoId,
          paqueteId: r.paqueteId,
        }));
      case "seguro":
        return state.paqueteSeguros.map((r) => ({
          servicioId: r.seguroId,
          paqueteId: r.paqueteId,
        }));
      case "circuito":
        return state.paqueteCircuitos.map((r) => ({
          servicioId: r.circuitoId,
          paqueteId: r.paqueteId,
        }));
    }
  }, [
    tipo,
    state.paqueteAereos,
    state.paqueteAlojamientos,
    state.opcionHoteles,
    state.opcionesHoteleras,
    state.paqueteTraslados,
    state.paqueteSeguros,
    state.paqueteCircuitos,
  ]);

  // Foto de portada por paquete: la primera del slider (menor `orden`). El
  // `heroImage` del paquete manda cuando está cargado, igual que en el sitio
  // público.
  const fotoPorPaquete = useMemo(() => {
    const map = new Map<string, { url: string; alt: string | null }>();
    const orden = new Map<string, number>();
    for (const f of state.paqueteFotos) {
      if (!f.url) continue;
      const previo = orden.get(f.paqueteId);
      if (previo !== undefined && previo <= f.orden) continue;
      orden.set(f.paqueteId, f.orden);
      map.set(f.paqueteId, { url: f.url, alt: f.alt ?? null });
    }
    return map;
  }, [state.paqueteFotos]);

  const paquetePorId = useMemo(
    () => new Map(state.paquetes.map((p) => [p.id, p])),
    [state.paquetes],
  );

  return useMemo(() => {
    const paquetesPorServicio: Record<string, PaqueteDelServicio[]> = {};
    const countPorServicio: Record<string, number> = {};
    // Un paquete puede referenciar dos veces el mismo servicio (ida y vuelta,
    // dos noches en el mismo hotel…). Para el contador vale una sola vez.
    const vistos = new Set<string>();

    for (const rel of relaciones) {
      const clave = `${rel.servicioId}::${rel.paqueteId}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      countPorServicio[rel.servicioId] =
        (countPorServicio[rel.servicioId] ?? 0) + 1;

      const paquete = paquetePorId.get(rel.paqueteId);
      if (!paquete) continue; // todavía hidratando
      const foto = fotoPorPaquete.get(paquete.id);
      (paquetesPorServicio[rel.servicioId] ??= []).push({
        id: paquete.id,
        titulo: paquete.titulo,
        destino: paquete.destino,
        estado: paquete.estado,
        fotoUrl: paquete.heroImage || foto?.url || null,
        fotoAlt: foto?.alt ?? null,
      });
    }

    for (const lista of Object.values(paquetesPorServicio)) {
      lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    }

    return {
      paquetesPorServicio,
      countPorServicio,
      hydratando: state.hydratingPaquetes,
    };
  }, [relaciones, paquetePorId, fotoPorPaquete, state.hydratingPaquetes]);
}
