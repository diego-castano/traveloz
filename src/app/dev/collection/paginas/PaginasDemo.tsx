"use client";

import { useState } from "react";
import { PaginaRender } from "@/components/collection/sitio/pagina/PaginaRender";
import { PaginaLegal } from "@/components/collection/sitio/pagina/PaginaLegal";
import { ArticuloPagina } from "@/components/collection/sitio/journal/ArticuloPagina";
import {
  demoArticulo,
  demoArticuloVacio,
  demoInicio,
  demoLegalVacia,
  demoNosotros,
  demoTerminos,
  demoVacia,
} from "@/components/collection/sitio/demo-paginas";

// En la vista previa, tocar un bloque lo resalta (como hará el editor).
export function PaginasDemo({
  pagina,
  modo,
  vacia,
  resaltar,
}: {
  pagina: string;
  modo: "sitio" | "preview";
  vacia: boolean;
  resaltar?: string;
}) {
  const [resaltado, setResaltado] = useState(resaltar);
  if (pagina === "terminos") return <PaginaLegal vista={vacia ? demoLegalVacia() : demoTerminos} modo={modo} />;
  if (pagina === "articulo") return <ArticuloPagina vista={vacia ? demoArticuloVacio() : demoArticulo} modo={modo} />;
  const vista = vacia
    ? demoVacia(pagina, pagina === "nosotros" ? "Nosotros" : "Inicio")
    : pagina === "nosotros"
      ? demoNosotros
      : demoInicio;
  return <PaginaRender vista={vista} modo={modo} bloqueResaltado={resaltado} onBloqueClick={setResaltado} />;
}
