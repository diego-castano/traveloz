"use client";

// Datos en memoria para ver la grilla de Experiencias y la Biblioteca dentro
// del shell. Las acciones del servidor solo corren si se interactúa.

import type { ExperienciaItem } from "@/actions/collection/experiencias.actions";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { ListaExperiencias } from "@/components/collection/experiencias/ListaExperiencias";
import { Biblioteca } from "@/components/collection/biblioteca/Biblioteca";
import { medio } from "@/components/collection/sitio/demo";
import { DevShell } from "../DevShell";

function exp(
  id: string,
  titulo: string,
  estado: ExperienciaItem["estado"],
  color: string | null,
  destinos: string[],
  noches: number,
  completitud: number,
  extra: Partial<ExperienciaItem> = {},
): ExperienciaItem {
  return {
    id,
    titulo,
    slug: titulo ? titulo.toLowerCase().replace(/\s+/g, "-") : null,
    tipo: "VIAJE",
    estado,
    destacada: false,
    orden: 0,
    portada: color ? medio(`m-${id}`, color, 1600, 2000, titulo) : null,
    noches,
    destinos: destinos.map((nombre, i) => ({ id: `${id}-d${i}`, nombre })),
    especialista: null,
    completitud,
    hayCambiosSinPublicar: false,
    updatedAt: "2026-10-09T12:00:00.000Z",
    ...extra,
  };
}

export const EXPERIENCIAS: ExperienciaItem[] = [
  exp("e1", "Filipinas, islas y arrecifes", "PUBLICADA", "#2F6E73", ["Filipinas"], 12, 1, { destacada: true }),
  exp("e2", "Japón en otoño", "EN_REVISION", "#8A6B52", ["Japón"], 14, 0.86, { hayCambiosSinPublicar: true }),
  exp("", "", "BORRADOR", null, [], 0, 0.14),
  exp("e4", "Marruecos de punta a punta", "BORRADOR", "#C9A57A", ["Marruecos"], 10, 0.57),
  exp("e5", "Fiordos de Noruega", "PAUSADA", "#5D7F8C", ["Noruega"], 9, 1),
  exp("e6", "Vietnam lento", "PUBLICADA", "#6E7F62", ["Vietnam", "Camboya"], 16, 1),
].map((x, i) => ({ ...x, id: x.id || `e${i + 1}`, orden: i }));

const COLORES = ["#3E7C86", "#8A6B52", "#C9A57A", "#2F6E73", "#B79C78", "#6E7F62", "#5D7F8C", "#8F6F5A"];
export const MEDIOS: ColMedioDto[] = Array.from({ length: 18 }, (_, i) => {
  const vertical = i % 3 === 1;
  return {
    id: `b${i}`,
    tipo: i % 7 === 6 ? "VIDEO" : "FOTO",
    nombre: `foto-${i + 1}.jpg`,
    key: "",
    url: "",
    contentType: "image/jpeg",
    peso: 1_200_000,
    ancho: vertical ? 1600 : 2400,
    alto: vertical ? 2000 : 1600,
    duracion: i % 7 === 6 ? 24 : null,
    colorDominante: COLORES[i % COLORES.length],
    placeholder: null,
    variantes: [],
    posterUrl: null,
    alt: i % 4 === 0 ? "" : `Foto ${i + 1}`,
    leyenda: "",
    credito: i % 5 === 0 ? "" : "Traveloz",
    focoX: 0.5,
    focoY: 0.5,
    recortes: {},
    etiquetas: [],
    subidoPorId: "dev",
    createdAt: "2026-10-09T12:00:00.000Z",
  };
});

export function ListasDemo({ vista, vacia, lectura }: { vista: "experiencias" | "biblioteca"; vacia: boolean; lectura: boolean }) {
  return (
    <DevShell lectura={lectura} ruta={`/backend/collection/${vista}`}>
      {vista === "experiencias" ? (
        <ListaExperiencias inicial={vacia ? [] : EXPERIENCIAS} />
      ) : (
        <Biblioteca
          inicial={{ items: vacia ? [] : MEDIOS, nextCursor: null }}
          filtroInicial="todo"
          abrirId={null}
          subidoPor={{ dev: "Diego Castaño" }}
        />
      )}
    </DevShell>
  );
}
