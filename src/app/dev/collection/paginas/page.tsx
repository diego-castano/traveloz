import { notFound } from "next/navigation";
import { PaginasDemo } from "./PaginasDemo";

// Prueba visual de las páginas de Collection con la demo.
// ?pagina=inicio|nosotros|terminos|articulo&modo=preview&vacia=1&ancho=390&resaltar=destinos

export default function DevPaginas({
  searchParams,
}: {
  searchParams: { pagina?: string; modo?: string; vacia?: string; ancho?: string; resaltar?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const modo = searchParams.modo === "preview" ? "preview" : "sitio";
  const ancho = Number(searchParams.ancho) || 0;
  const pagina = (
    <PaginasDemo
      pagina={searchParams.pagina ?? "inicio"}
      modo={modo}
      vacia={!!searchParams.vacia}
      resaltar={searchParams.resaltar}
    />
  );
  if (!ancho) return pagina;
  // Simula el panel del editor: un ancho fijo centrado.
  return (
    <div className="flex justify-center bg-col-line/60 py-8">
      <div className="bg-col-base shadow-[0_1px_0_#DCDCDC]" style={{ width: ancho }}>
        {pagina}
      </div>
    </div>
  );
}
