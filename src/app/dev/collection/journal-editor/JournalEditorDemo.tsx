"use client";

import { useState } from "react";
import { EditorArticulo } from "@/components/collection/journal/EditorArticulo";
import { ListaArticulos } from "@/components/collection/journal/ListaArticulos";
import { articuloDemo, articulosListaDemo, crearApiJournalMock } from "@/components/collection/journal/api-mock";
import { crearApiMock } from "@/components/collection/constructor/api-mock";
import { mediosDemo } from "@/components/collection/sitio/demo-paginas";
import { DevShell } from "../DevShell";

export function JournalEditorDemo({ vista, vacio, lectura }: { vista: string; vacio: boolean; lectura: boolean }) {
  const [datos] = useState(() => {
    const detalle = articuloDemo(vacio);
    return { detalle, api: crearApiJournalMock(detalle.revision, detalle.estado), apiMedios: crearApiMock(mediosDemo, 0) };
  });
  if (vista === "lista") {
    return (
      <DevShell lectura={lectura} lista>
        <ListaArticulos inicial={articulosListaDemo()} crear={async () => ({ ok: true, data: { id: "nuevo" } })} />
      </DevShell>
    );
  }
  return (
    <DevShell lectura={lectura}>
      <EditorArticulo detalle={datos.detalle} api={datos.api} apiMedios={datos.apiMedios} className="h-screen" />
    </DevShell>
  );
}
