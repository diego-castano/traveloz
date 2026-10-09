"use client";

// Contexto del constructor: el borrador, cómo cambiarlo y lo que hace falta
// para dibujarlo (mapas). Lo leen todos los pasos.

import { createContext, useContext } from "react";
import type {
  BorradorExperiencia,
  CamposExperiencia,
  ContenidoExperiencia,
  EspecialistaVista,
  EstadoExperiencia,
  FotoCatalogo,
  MedioVista,
  PasoId,
} from "@/lib/collection/experiencia/contenido";
import type { ApiConstructor } from "./api";
import type { DestinoOpcion, MapasCliente } from "./estado";

export interface EventoHistorial {
  id: string;
  accion: string;
  userNombre: string | null;
  createdAt: string;
}

export interface ValorConstructor {
  id: string;
  borrador: BorradorExperiencia;
  setCampos: (c: Partial<CamposExperiencia>) => void;
  setContenido: (f: (k: ContenidoExperiencia) => Partial<ContenidoExperiencia>) => void;
  mapas: MapasCliente;
  agregarMedios: (m: MedioVista[]) => void;
  agregarDestino: (d: DestinoOpcion) => void;
  agregarEspecialista: (e: EspecialistaVista) => void;
  agregarFotosHotel: (id: string, fotos: FotoCatalogo[]) => void;
  /** Vuelve a pedir medios ya usados (después de ajustar el foco en la biblioteca). */
  refrescarMedios: (ids: string[]) => Promise<void>;
  proveedores: { id: string; nombre: string }[];
  editable: boolean;
  puedePublicar: boolean;
  estado: EstadoExperiencia;
  setEstado: (e: EstadoExperiencia) => void;
  revision: number;
  /** Revisión vigente leída del ref: usarla justo después de guardarYa. */
  revisionActual: () => number;
  publicadoRevision: number | null;
  setPublicadoRevision: (r: number | null) => void;
  historial: EventoHistorial[];
  sumarHistorial: (accion: string) => void;
  /** Guarda ya lo pendiente; false si no se pudo. */
  guardarYa: () => Promise<boolean>;
  irAPaso: (p: PasoId) => void;
  api: ApiConstructor;
}

export const ConstructorCtx = createContext<ValorConstructor | null>(null);

export function useConstructor() {
  const v = useContext(ConstructorCtx);
  if (!v) throw new Error("useConstructor fuera del constructor");
  return v;
}
