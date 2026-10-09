"use client";

// Contexto del shell (permisos, portales, avisos) para las rutas de desarrollo
// de los editores de páginas y del journal. `lista` simula el padding del shell.

import { useState } from "react";
import { MotionConfig } from "motion/react";
import { CollectionContext } from "@/components/collection/shell/contexto";
import { AvisosProvider } from "@/components/collection/shell/Avisos";

export function DevShell({ lectura, lista, children }: { lectura: boolean; lista?: boolean; children: React.ReactNode }) {
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const acceso = lectura ? { superAdmin: false, permisos: ["panel" as const] } : { superAdmin: true, permisos: [] };
  return (
    <CollectionContext.Provider value={{ acceso, usuario: { id: "dev", nombre: "Diego Castaño" }, raiz }}>
      <MotionConfig reducedMotion="user">
        <AvisosProvider>
          <div ref={setRaiz} data-collection-shell className={lista ? "min-h-screen px-12 pb-24 pt-10" : "h-screen"}>
            {raiz && children}
          </div>
        </AvisosProvider>
      </MotionConfig>
    </CollectionContext.Provider>
  );
}
