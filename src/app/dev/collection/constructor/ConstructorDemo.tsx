"use client";

// Constructor dentro del shell, con el adaptador en memoria.

import { useState } from "react";
import type { PasoId } from "@/lib/collection/experiencia/contenido";
import { Constructor } from "@/components/collection/constructor/Constructor";
import { PROVEEDORES_DEMO, crearApiMock, datosDemo } from "@/components/collection/constructor/api-mock";
import { DevShell } from "../DevShell";

export function ConstructorDemo({ vacia, paso, lectura, sinMedios }: { vacia: boolean; paso: PasoId; lectura: boolean; sinMedios?: boolean }) {
  const [{ detalle, api }] = useState(() => {
    const d = datosDemo(vacia);
    // sinMedios: biblioteca vacía, para ver el estado vacío del selector.
    return { detalle: d.detalle, api: crearApiMock(sinMedios ? [] : d.biblioteca, d.detalle.revision) };
  });
  return (
    <DevShell lectura={lectura} ruta="/backend/collection/experiencias/demo">
      <Constructor
        detalle={detalle}
        proveedores={PROVEEDORES_DEMO}
        api={api}
        pasoInicial={paso}
        className="h-[calc(100dvh-4rem)]"
      />
    </DevShell>
  );
}
