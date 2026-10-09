"use client";

// Adaptador de datos del constructor: todo lo que el constructor (y el
// selector de medios) le pide al servidor pasa por acá. La implementación
// real llama a las server actions; la de prueba (api-mock.ts) vive en memoria
// para la ruta de desarrollo.

import { createContext, useContext } from "react";
import type { Resultado } from "@/lib/collection/ejecutar";
import type { BorradorExperiencia, EstadoExperiencia, MedioVista } from "@/lib/collection/experiencia/contenido";
import {
  buscarCiudades,
  buscarHoteles,
  cambiarEstadoExperiencia,
  guardarExperiencia,
  type AccionEstado,
  type HotelBusqueda,
} from "@/actions/collection/experiencias.actions";
import { crearDestino } from "@/actions/collection/destinos.actions";
import { crearEspecialista } from "@/actions/collection/especialistas.actions";
import { listarProveedoresCatalogo } from "@/actions/collection/catalogo.actions";
import {
  listarMedios,
  obtenerMediosVista,
  prepararSubidaMedio,
  registrarMedio,
  type ColMedioDto,
} from "@/actions/collection/medios.actions";

type R<T> = Promise<Resultado<T>>;

export interface ApiConstructor {
  guardar(id: string, input: { revision: number; borrador: BorradorExperiencia }): R<{ revision: number }>;
  cambiarEstado(id: string, accion: AccionEstado): R<{ estado: EstadoExperiencia }>;
  buscarCiudades(q: string): R<{ id: string; nombre: string; paisNombre: string }[]>;
  buscarHoteles(input: { q?: string; ciudadId?: string }): R<HotelBusqueda[]>;
  listarMedios(input: {
    tipo?: "FOTO" | "VIDEO";
    q?: string;
    cursor?: string;
    take?: number;
  }): R<{ items: ColMedioDto[]; nextCursor: string | null }>;
  obtenerMediosVista(ids: string[]): R<MedioVista[]>;
  /** Los dos pasos de la subida (los usa useSubidas). */
  prepararSubidaMedio: typeof prepararSubidaMedio;
  registrarMedio: typeof registrarMedio;
  /** PUT al bucket; la de prueba simula el progreso. */
  subirArchivo?: (url: string, blob: Blob, onProgreso?: (p: number) => void) => Promise<void>;
  crearDestino(input: { nombre: string }): R<{ id: string; slug: string }>;
  crearEspecialista(input: { nombre: string }): R<{ id: string }>;
  listarProveedores(): R<{ id: string; nombre: string }[]>;
}

export const apiReal: ApiConstructor = {
  guardar: guardarExperiencia,
  cambiarEstado: cambiarEstadoExperiencia,
  buscarCiudades,
  buscarHoteles,
  listarMedios,
  obtenerMediosVista,
  prepararSubidaMedio,
  registrarMedio,
  crearDestino,
  crearEspecialista,
  listarProveedores: listarProveedoresCatalogo,
};

const ApiContext = createContext<ApiConstructor>(apiReal);
export const ApiProvider = ApiContext.Provider;
export const useApi = () => useContext(ApiContext);
