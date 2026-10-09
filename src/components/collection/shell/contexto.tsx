"use client";

// Contexto del shell: quién está, qué puede hacer y dónde montar los portales
// (dentro de la raíz del shell, así heredan tipografías y estilos de foco).

import { createContext, useContext } from "react";
import type { MiAccesoCollection } from "@/actions/collection/equipo.actions";
import type { PermisoCollection } from "@/lib/collection/permisos";

export interface UsuarioCollection {
  id: string;
  nombre: string;
}

interface ValorCollection {
  acceso: MiAccesoCollection;
  usuario: UsuarioCollection;
  raiz: HTMLElement | null;
}

export const CollectionContext = createContext<ValorCollection | null>(null);

export function useCollection() {
  const v = useContext(CollectionContext);
  if (!v) throw new Error("useCollection fuera del shell de Collection");
  const puede = (p: PermisoCollection) =>
    v.acceso.superAdmin || (v.acceso.permisos.includes("panel") && v.acceso.permisos.includes(p));
  return { ...v, puede };
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "·";
  return ((partes[0][0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}
