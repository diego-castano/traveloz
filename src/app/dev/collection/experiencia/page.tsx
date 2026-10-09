import { notFound } from "next/navigation";
import { ExperienciaPagina } from "@/components/collection/sitio/experiencia/ExperienciaPagina";
import { demo, demoVacia } from "@/components/collection/sitio/demo";

// Prueba visual de la página de experiencia con la demo de Filipinas.
// ?modo=preview&vacia=1&ancho=390&resaltar=intro

export default function DevExperiencia({
  searchParams,
}: {
  searchParams: { modo?: string; vacia?: string; ancho?: string; resaltar?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const modo = searchParams.modo === "preview" ? "preview" : "sitio";
  const ancho = Number(searchParams.ancho) || 0;
  const pagina = (
    <ExperienciaPagina
      vista={searchParams.vacia ? demoVacia() : demo}
      modo={modo}
      seccionResaltada={searchParams.resaltar}
    />
  );
  if (!ancho) return pagina;
  // Simula el panel del constructor: un ancho fijo centrado.
  return (
    <div className="flex justify-center bg-col-line/60 py-8">
      <div className="bg-col-base shadow-[0_1px_0_#DCDCDC]" style={{ width: ancho }}>
        {pagina}
      </div>
    </div>
  );
}
