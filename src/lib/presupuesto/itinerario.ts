/**
 * Adaptador entre el lector de itinerarios y el editor del cotizador.
 *
 * Gemini devuelve trayectos con segmentos (ver `src/lib/gemini.ts`); el editor
 * consume una lista plana de vuelos, la misma que arma `parsePNR` en
 * `_mockup/data.js`. Acá se traduce una cosa en la otra. Todo puro: sin fetch,
 * sin prisma, sin React. Se puede importar del server y del cliente.
 */

import type { TrayectoIA } from "@/lib/gemini";

/**
 * Un vuelo como lo pinta el editor. `dia`/`mes` (0-11) es lo que la UI usa hoy;
 * `fecha` viaja al lado en ISO para no perder el año, y `etiqueta` guarda si el
 * segmento era de ida o de vuelta. El schema de persistencia es `looseObject`,
 * así que los dos campos extra sobreviven al guardado aunque nadie los pinte.
 */
export interface VueloPlano {
  id: string;
  cia: string;
  nro: string;
  aerolinea: string;
  dia: number;
  mes: number;
  origen: string;
  destino: string;
  salida: string;
  llegada: string;
  fecha: string;
  etiqueta: string;
  llegaDiaSiguiente: boolean;
}

let contador = 0;

function nuevoId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `vl_${uuid.slice(0, 8)}`;
  contador += 1;
  return `vl_${Date.now().toString(36)}_${contador}`;
}

/** "2026-10-01" → { dia: 1, mes: 9, anio: 2026 }. Null si no es ISO. */
function partesDeFecha(iso: string): { dia: number; mes: number; anio: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  return { dia, mes, anio };
}

/**
 * Aplana los trayectos a la lista de vuelos del editor.
 * `aerolineas` es el índice IATA→nombre de la tabla `Aerolinea` ({ CM: "Copa" });
 * si el código no está, queda el código como nombre, igual que `parsePNR`.
 */
export function trayectosAVuelos(
  trayectos: TrayectoIA[] | null | undefined,
  aerolineas: Record<string, string> = {},
): VueloPlano[] {
  const out: VueloPlano[] = [];
  for (const t of trayectos ?? []) {
    for (const s of t.segmentos ?? []) {
      const partes = partesDeFecha(s.fecha);
      if (!partes) continue;
      const cia = String(s.aerolinea || "").toUpperCase();
      out.push({
        id: nuevoId(),
        cia,
        nro: String(s.vuelo || ""),
        aerolinea: aerolineas[cia] || cia,
        dia: partes.dia,
        mes: partes.mes,
        origen: String(s.origen || "").toUpperCase(),
        destino: String(s.destino || "").toUpperCase(),
        salida: s.salida,
        llegada: s.llegada,
        fecha: s.fecha,
        etiqueta: t.etiqueta || "",
        llegaDiaSiguiente: Boolean(s.llegaDiaSiguiente),
      });
    }
  }
  return out;
}

/**
 * Fecha de salida del itinerario: la del primer vuelo. Sale del campo `fecha`
 * cuando existe (trae el año); si el vuelo se cargó a mano y solo tiene día y
 * mes, se asume la próxima ocurrencia futura, igual que hacía el editor.
 */
export function fechaSalidaDe(
  vuelos: Array<Partial<VueloPlano>> | null | undefined,
): string | null {
  const primero = (vuelos ?? [])[0];
  if (!primero) return null;

  if (typeof primero.fecha === "string" && partesDeFecha(primero.fecha)) {
    return primero.fecha;
  }

  const dia = Number(primero.dia);
  const mes = Number(primero.mes);
  if (!Number.isFinite(dia) || !Number.isFinite(mes)) return null;

  const hoy = new Date();
  const anio = mes >= hoy.getMonth() ? hoy.getFullYear() : hoy.getFullYear() + 1;
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
