"use client";

// Adaptador del panel de consultas. La real llama a las server actions; la de
// prueba (api-mock.ts) vive en memoria para la ruta de desarrollo.

import {
  actualizarConsulta,
  exportarSuscriptoresCsv,
  listarConsultas,
  listarSuscriptores,
  obtenerConsulta,
  reintentarBitrixConsulta,
} from "@/actions/collection/consultas-admin.actions";

export interface ApiConsultas {
  listar: typeof listarConsultas;
  obtener: typeof obtenerConsulta;
  actualizar: typeof actualizarConsulta;
  reintentarBitrix: typeof reintentarBitrixConsulta;
  listarSuscriptores: typeof listarSuscriptores;
  exportarCsv: typeof exportarSuscriptoresCsv;
}

export type DetalleConsulta = Extract<Awaited<ReturnType<typeof obtenerConsulta>>, { ok: true }>["data"];
export type Suscriptor = Extract<Awaited<ReturnType<typeof listarSuscriptores>>, { ok: true }>["data"][number];

export const apiConsultasReal: ApiConsultas = {
  listar: listarConsultas,
  obtener: obtenerConsulta,
  actualizar: actualizarConsulta,
  reintentarBitrix: reintentarBitrixConsulta,
  listarSuscriptores,
  exportarCsv: exportarSuscriptoresCsv,
};

/** Lo dispara el panel cuando cambia un estado, para que el riel recuente las nuevas. */
export const EVENTO_CONSULTAS = "col:consultas";
