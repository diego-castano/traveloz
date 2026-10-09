import type { Metadata } from "next";
import { RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { GraciasConsulta } from "@/components/collection/sitio/consulta/Gracias";
import { experienciasPublicadas } from "@/lib/collection/sitio-datos";

export const metadata: Metadata = { title: "Gracias", robots: { index: false, follow: false } };

// Después de cualquier formulario de consulta. ?n=TC-0412&e=<especialista>&x=<slug consultado>
export default async function Gracias({ searchParams }: { searchParams: { n?: string; e?: string; x?: string } }) {
  const numero = /^TC-\d{1,8}$/.test(searchParams.n ?? "") ? searchParams.n! : null;
  const especialista = (searchParams.e ?? "").trim().slice(0, 80) || null;
  const sugeridas = (await experienciasPublicadas()).filter((e) => e.slug !== searchParams.x).slice(0, 3);
  return (
    <RaizSitio>
      <GraciasConsulta numero={numero} especialista={especialista} sugeridas={sugeridas} />
    </RaizSitio>
  );
}
