"use client";

// Adaptador del editor del journal. La real llama a las server actions; la de
// prueba (api-mock.ts) vive en memoria para la ruta de desarrollo.

import type { Resultado } from "@/lib/collection/ejecutar";
import type { ContenidoArticulo } from "@/lib/collection/paginas/contenido";
import {
  cambiarEstadoArticulo,
  guardarArticulo,
  type AccionArticulo,
  type CamposArticulo,
} from "@/actions/collection/journal.actions";

type R<T> = Promise<Resultado<T>>;

export type EstadoArticulo = "BORRADOR" | "PUBLICADO" | "ARCHIVADO";

export interface ApiJournal {
  guardar(id: string, input: { revision: number; campos: CamposArticulo; contenido: ContenidoArticulo }): R<{ revision: number }>;
  cambiarEstado(id: string, accion: AccionArticulo): R<{ estado: EstadoArticulo }>;
}

export const apiJournalReal: ApiJournal = { guardar: guardarArticulo, cambiarEstado: cambiarEstadoArticulo };
