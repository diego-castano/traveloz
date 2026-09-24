// Tipos y constantes de la analítica UTM que usa también el navegador.
// Aparte de analitica-utm.ts porque ese importa Prisma, que no puede ir al
// bundle del cliente.

export const DIMENSIONES = ["source", "medium", "campaign", "content", "term", "landing"] as const;
export type Dimension = (typeof DIMENSIONES)[number];

/** Un índice a `valores` por dimensión, en el orden de DIMENSIONES. 0 = sin dato. */
export type Dims = number[];

export type TipoConsulta = "paquete" | "cotizador" | "landing" | "contacto" | "corporativo";

export interface ConsultaUtm {
  /** Día de Montevideo, en días desde 1970-01-01. */
  dia: number;
  tipo: TipoConsulta;
  /** UTM del primer contacto, o null si no trajo UTM. */
  primer: Dims | null;
  ultimo: Dims | null;
  /** Solo para roles que ven Contactos. */
  nombre?: string;
  email?: string;
  detalle?: string | null;
}

export interface DatosAnaliticaUtm {
  /** Valores de todas las dimensiones. El 0 es "sin dato". */
  valores: string[];
  /** [dia, visitante, ...Dims, cantidad]. `visitante` es un índice anónimo. */
  visitas: number[][];
  /** Páginas vistas del sitio (con y sin UTM) por día. */
  paginasPorDia: [number, number][];
  consultas: ConsultaUtm[];
  /** Primer día con visitas guardadas (arranque del tracking o retención). */
  datosDesde: number | null;
  hoy: number;
  conNombres: boolean;
}
