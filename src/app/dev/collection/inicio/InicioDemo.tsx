"use client";

// Inicio dentro del shell con las experiencias y medios de la demo de listas.

import { Inicio } from "@/components/collection/inicio/Inicio";
import { DevShell } from "../DevShell";
import { EXPERIENCIAS, MEDIOS } from "../listas/ListasDemo";

// Fechas distintas para que "Seguí donde dejaste" tenga un orden.
const EXPS = EXPERIENCIAS.map((x, i) => ({ ...x, updatedAt: `2026-10-0${9 - i}T12:00:00.000Z` }));

export function InicioDemo({ vacia, sinConsultas }: { vacia: boolean; sinConsultas: boolean }) {
  return (
    <DevShell lectura={false} ruta="/backend/collection">
      <Inicio
        d={{
          saludo: "Buenas tardes",
          nombre: "Diego",
          fecha: "jueves, 9 de octubre",
          consultasNuevas: sinConsultas ? null : vacia ? 0 : 4,
          experiencias: vacia ? [] : EXPS,
          destinos: vacia ? 0 : 7,
          medios: {
            total: vacia ? 0 : MEDIOS.length,
            sinDescripcion: vacia ? 0 : MEDIOS.filter((m) => m.tipo === "FOTO" && !m.alt).length,
            ultimos: vacia ? [] : MEDIOS.slice(0, 8),
          },
        }}
      />
    </DevShell>
  );
}
