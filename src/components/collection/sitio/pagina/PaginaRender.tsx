"use client";

// Página de Collection armada por bloques (Inicio, Nosotros). La misma en el
// sitio y en la vista previa del editor de páginas: el layout depende del
// ancho de .cs-raiz, no de la ventana.

import { EyeOff } from "lucide-react";
import { TIPOS_BLOQUE, type PaginaVista } from "@/lib/collection/paginas/contenido";
import { cn } from "@/components/lib/cn";
import { BloqueSitio, bloqueVacio, type Modo } from "../bloques";
import { ListaVacia } from "../bloques/comun";
import { etiqueta } from "../experiencia/secciones";
import "../sitio.css";

const NOMBRE = Object.fromEntries(TIPOS_BLOQUE.map((t) => [t.tipo, t.nombre]));

export function PaginaRender({
  vista,
  modo,
  bloqueResaltado,
  onBloqueClick,
}: {
  vista: PaginaVista;
  modo: Modo;
  bloqueResaltado?: string;
  /** Solo en la vista previa: el editor elige un bloque tocándolo. */
  onBloqueClick?: (id: string) => void;
}) {
  const preview = modo === "preview";
  const elegible = preview && !!onBloqueClick;
  const bloques = vista.bloques.filter((b) => preview || (!b.oculto && !bloqueVacio(b)));

  return (
    <div
      className="cs-raiz"
      data-modo={modo}
      // En la vista previa los enlaces no navegan: el toque elige el bloque.
      onClickCapture={preview ? (e) => (e.target as HTMLElement).closest("a") && e.preventDefault() : undefined}
    >
      {bloques.map((b) => (
        <div
          key={b.id}
          data-bloque={b.id}
          className={cn(
            "cs-seccion",
            preview && b.oculto && "cs-oculto",
            preview && bloqueResaltado === b.id && "cs-resaltada",
            elegible && "cs-elegible",
          )}
          onClick={elegible ? () => onBloqueClick(b.id) : undefined}
        >
          <BloqueSitio bloque={b} modo={modo} />
          {preview && b.oculto && (
            <span className={cn(etiqueta, "cs-oculto-etiqueta")}>
              <EyeOff aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
              Oculto
            </span>
          )}
          {elegible && (
            <span aria-hidden className="cs-marco">
              <span className={etiqueta}>{NOMBRE[b.tipo]}</span>
            </span>
          )}
        </div>
      ))}
      {preview && !bloques.length && (
        <div className="cs-envolvente py-24">
          <ListaVacia>Esta página todavía no tiene bloques. Sumá el primero desde el editor.</ListaVacia>
        </div>
      )}
    </div>
  );
}
