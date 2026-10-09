"use client";

// Shell real de Collection (riel, barra, paleta, avisos) para las rutas de
// desarrollo. `ruta` hace de cuenta que estamos en esa ruta del backend, así
// el riel marca el módulo y los editores ocupan todo el alto.

import { CollectionShell } from "@/components/collection/shell/CollectionShell";
import { useCollection } from "@/components/collection/shell/contexto";

function ConRaiz({ children }: { children: React.ReactNode }) {
  // Los portales (hojas, selectores) necesitan la raíz montada.
  return useCollection().raiz ? <>{children}</> : null;
}

export function DevShell({ lectura, ruta, children }: { lectura: boolean; ruta: string; children: React.ReactNode }) {
  const acceso = lectura ? { superAdmin: false, permisos: ["panel" as const] } : { superAdmin: true, permisos: [] };
  return (
    <div data-collection-shell className="min-h-screen bg-col-base">
      <CollectionShell acceso={acceso} usuario={{ id: "dev", nombre: "Diego Castaño" }} ruta={ruta}>
        <ConRaiz>{children}</ConRaiz>
      </CollectionShell>
    </div>
  );
}
