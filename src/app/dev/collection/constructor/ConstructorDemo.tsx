"use client";

// Arma el contexto del shell (permisos, portales, avisos) para mostrar el
// constructor con el adaptador en memoria.

import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { PasoId } from "@/lib/collection/experiencia/contenido";
import { CollectionContext } from "@/components/collection/shell/contexto";
import { AvisosProvider } from "@/components/collection/shell/Avisos";
import { Constructor } from "@/components/collection/constructor/Constructor";
import { PROVEEDORES_DEMO, crearApiMock, datosDemo } from "@/components/collection/constructor/api-mock";

export function ConstructorDemo({ vacia, paso, lectura }: { vacia: boolean; paso: PasoId; lectura: boolean }) {
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const [{ detalle, api }] = useState(() => {
    const d = datosDemo(vacia);
    return { detalle: d.detalle, api: crearApiMock(d.biblioteca, d.detalle.revision) };
  });
  const acceso = lectura
    ? { superAdmin: false, permisos: ["panel" as const] }
    : { superAdmin: true, permisos: [] };
  return (
    <CollectionContext.Provider value={{ acceso, usuario: { id: "dev", nombre: "Diego Castaño" }, raiz }}>
      <MotionConfig reducedMotion="user">
        <AvisosProvider>
          <div ref={setRaiz} data-collection-shell className="h-screen">
            {raiz && <Constructor detalle={detalle} proveedores={PROVEEDORES_DEMO} api={api} pasoInicial={paso} className="h-screen" />}
          </div>
        </AvisosProvider>
      </MotionConfig>
    </CollectionContext.Provider>
  );
}
