"use client";

// Shell real de Collection (riel, barra, paleta, avisos) para las rutas de
// desarrollo. `ruta` hace de cuenta que estamos en esa ruta del backend, así
// el riel marca el módulo y los editores ocupan todo el alto.

import { CollectionShell } from "@/components/collection/shell/CollectionShell";
import { useCollection } from "@/components/collection/shell/contexto";
import type { Resultado } from "@/lib/collection/ejecutar";
import type { ResultadoBusqueda } from "@/actions/collection/buscar.actions";

function ConRaiz({ children }: { children: React.ReactNode }) {
  // Los portales (hojas, selectores) necesitan la raíz montada.
  return useCollection().raiz ? <>{children}</> : null;
}

// Sin `contarNuevas`, la insignia de Consultas queda en cero (no consulta la base).
const sinNuevas = async (): Promise<Resultado<number>> => ({ ok: true, data: 0 });

// Búsqueda de la paleta en memoria (la real consulta la base y pide sesión).
const color = (c: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="${c}"/></svg>`)}`;
const DEMO: ResultadoBusqueda[] = [
  { id: "e1", grupo: "experiencias", titulo: "Filipinas en bangka", detalle: "Publicada", href: "#", miniatura: color("#3E7C86") },
  { id: "e2", grupo: "experiencias", titulo: "Filipinas: Manila, El Nido y Boracay", detalle: "Borrador", href: "#", miniatura: color("#5D7F8C") },
  { id: "e3", grupo: "experiencias", titulo: "Japón en otoño", detalle: "En revisión", href: "#", miniatura: color("#8A6B52") },
  { id: "d1", grupo: "destinos", titulo: "Filipinas", detalle: "Publicado", href: "#", miniatura: color("#2F6D73") },
  { id: "d2", grupo: "destinos", titulo: "Japón", detalle: "Publicado", href: "#", miniatura: color("#9C7A6B") },
  { id: "a1", grupo: "articulos", titulo: "Filipinas sin apuro: cuándo ir y qué islas elegir", detalle: "Publicado", href: "#", miniatura: color("#C9A57A") },
  { id: "s1", grupo: "especialistas", titulo: "Lucía Fernández", detalle: "Publicado", href: "#", miniatura: null },
];
const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const buscarDemo = async (q: string): Promise<Resultado<ResultadoBusqueda[]>> => {
  await new Promise((r) => setTimeout(r, 250));
  return { ok: true, data: DEMO.filter((x) => sinTildes(x.titulo).includes(sinTildes(q))) };
};

export function DevShell({
  lectura,
  ruta,
  contarNuevas = sinNuevas,
  children,
}: {
  lectura: boolean;
  ruta: string;
  contarNuevas?: () => Promise<Resultado<number>>;
  children: React.ReactNode;
}) {
  const acceso = lectura ? { superAdmin: false, permisos: ["panel" as const] } : { superAdmin: true, permisos: [] };
  return (
    <div data-collection-shell className="min-h-screen bg-col-base">
      <CollectionShell acceso={acceso} usuario={{ id: "dev", nombre: "Diego Castaño" }} ruta={ruta} contarNuevas={contarNuevas} buscar={buscarDemo}>
        <ConRaiz>{children}</ConRaiz>
      </CollectionShell>
    </div>
  );
}
