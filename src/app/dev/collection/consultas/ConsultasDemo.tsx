"use client";

import { useState } from "react";
import { Consultas } from "@/components/collection/consultas/Consultas";
import { crearApiConsultasMock } from "@/components/collection/consultas/api-mock";
import { DevShell } from "../DevShell";

export function ConsultasDemo({ lectura }: { lectura: boolean }) {
  const [m] = useState(crearApiConsultasMock);
  return (
    <DevShell lectura={lectura} ruta="/backend/collection/consultas" contarNuevas={async () => ({ ok: true, data: m.nuevas() })}>
      <Consultas inicial={m.inicial} api={m.api} />
    </DevShell>
  );
}
