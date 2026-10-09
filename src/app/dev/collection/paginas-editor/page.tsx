import { notFound } from "next/navigation";
import { PaginasEditorDemo } from "./PaginasEditorDemo";
import "@/app/backend/collection/collection.css";

// Editor de páginas con el adaptador en memoria, sin login.
// ?pagina=lista|inicio|nosotros|terminos|privacidad|cookies&bloque=destinos&catalogo=1&lectura=1

export default function DevPaginasEditor({
  searchParams,
}: {
  searchParams: { pagina?: string; bloque?: string; catalogo?: string; lectura?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <PaginasEditorDemo
      pagina={searchParams.pagina ?? "inicio"}
      bloque={searchParams.bloque}
      catalogo={!!searchParams.catalogo}
      lectura={!!searchParams.lectura}
    />
  );
}
