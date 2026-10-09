"use client";

import { useState } from "react";
import { EditorPagina } from "@/components/collection/paginas/EditorPagina";
import { ListaPaginas } from "@/components/collection/paginas/ListaPaginas";
import { crearApiPaginasMock, detalleDemo, tarjetasDemo } from "@/components/collection/paginas/api-mock";
import { crearApiMock } from "@/components/collection/constructor/api-mock";
import { mediosDemo } from "@/components/collection/sitio/demo-paginas";
import { DevShell } from "../DevShell";

export function PaginasEditorDemo({
  pagina,
  bloque,
  catalogo,
  lectura,
}: {
  pagina: string;
  bloque?: string;
  catalogo: boolean;
  lectura: boolean;
}) {
  const [datos] = useState(() => {
    if (pagina === "lista") return null;
    const detalle = detalleDemo(pagina);
    return { detalle, api: crearApiPaginasMock(detalle.revision), apiMedios: crearApiMock(mediosDemo, 0) };
  });
  if (!datos) {
    return (
      <DevShell lectura={lectura} lista>
        <ListaPaginas inicial={tarjetasDemo()} />
      </DevShell>
    );
  }
  return (
    <DevShell lectura={lectura}>
      <EditorPagina
        detalle={datos.detalle}
        api={datos.api}
        apiMedios={datos.apiMedios}
        bloqueInicial={bloque}
        catalogoAbierto={catalogo}
        className="h-screen"
      />
    </DevShell>
  );
}
