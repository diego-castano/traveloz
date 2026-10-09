"use client";

// Estado del constructor: el borrador (useReducer) y los mapas que necesita
// armarVista para dibujar la vista previa con lo que hay en memoria.

import type {
  BorradorExperiencia,
  CamposExperiencia,
  ContenidoExperiencia,
  EspecialistaVista,
  FotoCatalogo,
  MapasVista,
  MedioVista,
} from "@/lib/collection/experiencia/contenido";
import type { ExperienciaDetalle } from "@/actions/collection/experiencias.actions";

export interface EstadoBorrador {
  borrador: BorradorExperiencia;
  /** Sube con cada cambio del usuario; el autoguardado compara contra lo enviado. */
  cambios: number;
}

export type AccionBorrador =
  | { t: "campos"; c: Partial<CamposExperiencia> }
  | { t: "contenido"; f: (k: ContenidoExperiencia) => Partial<ContenidoExperiencia> };

export function reducirBorrador(s: EstadoBorrador, a: AccionBorrador): EstadoBorrador {
  const b = s.borrador;
  if (a.t === "campos") return { cambios: s.cambios + 1, borrador: { ...b, campos: { ...b.campos, ...a.c } } };
  return { cambios: s.cambios + 1, borrador: { ...b, contenido: { ...b.contenido, ...a.f(b.contenido) } } };
}

export interface DestinoOpcion {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
}

export interface MapasCliente extends MapasVista {
  destinosOpciones: DestinoOpcion[];
}

export function mapasDeDetalle(d: ExperienciaDetalle): MapasCliente {
  return {
    medios: new Map(d.mapas.medios.map((m) => [m.id, m])),
    destinos: new Map(d.mapas.destinos.map((x) => [x.id, { id: x.id, nombre: x.nombre, slug: x.slug }])),
    especialistas: new Map(d.mapas.especialistas.map((e) => [e.id, e])),
    fotosHotel: new Map(d.mapas.fotosHotel),
    destinosOpciones: d.mapas.destinos,
  };
}

export function sumarMedios(m: MapasCliente, medios: MedioVista[]): MapasCliente {
  if (!medios.length) return m;
  const nuevo = new Map(m.medios);
  medios.forEach((x) => nuevo.set(x.id, x));
  return { ...m, medios: nuevo };
}

export function sumarDestino(m: MapasCliente, d: DestinoOpcion): MapasCliente {
  const destinos = new Map(m.destinos);
  destinos.set(d.id, { id: d.id, nombre: d.nombre, slug: d.slug });
  return { ...m, destinos, destinosOpciones: [...m.destinosOpciones, d] };
}

export function sumarEspecialista(m: MapasCliente, e: EspecialistaVista): MapasCliente {
  const especialistas = new Map(m.especialistas);
  especialistas.set(e.id, e);
  return { ...m, especialistas };
}

export function sumarFotosHotel(m: MapasCliente, id: string, fotos: FotoCatalogo[]): MapasCliente {
  const fotosHotel = new Map(m.fotosHotel);
  fotosHotel.set(id, fotos);
  return { ...m, fotosHotel };
}

/** Id corto para tramos, días e imperdibles (máx. 40 en el esquema). */
export const nuevoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export { slugify as slugDe } from "@/lib/utils";
