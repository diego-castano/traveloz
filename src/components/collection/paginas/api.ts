"use client";

// Adaptador del editor de páginas. La real llama a las server actions; la de
// prueba (api-mock.ts) vive en memoria para la ruta de desarrollo. Los medios
// siguen pasando por el adaptador del constructor (useApi).

import type { Resultado } from "@/lib/collection/ejecutar";
import type { ContenidoPagina } from "@/lib/collection/paginas/contenido";
import { guardarPagina, publicarPagina } from "@/actions/collection/paginas.actions";

type R<T> = Promise<Resultado<T>>;

export interface ApiPaginas {
  guardar(slug: string, input: { revision: number; contenido: ContenidoPagina }): R<{ revision: number }>;
  publicar(slug: string): R<{ publicadaEn: string }>;
}

export const apiPaginasReal: ApiPaginas = { guardar: guardarPagina, publicar: publicarPagina };
