import type { Metadata } from "next";
import { PaginaRender } from "@/components/collection/sitio/pagina/PaginaRender";
import { EnPreparacion } from "@/components/collection/sitio/chrome/piezas";
import { paginaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const p = await paginaPublicada("nosotros");
  return metaSitio({ titulo: "Nosotros", descripcion: p?.descripcion, ruta: "/nosotros", imagen: p?.imagen });
}

export default async function Nosotros() {
  const p = await paginaPublicada("nosotros");
  if (!p?.vista.bloques.length) {
    return <EnPreparacion titulo="Nosotros" texto="Muy pronto vas a poder conocer cómo nació Traveloz Collection." />;
  }
  return (
    <div data-portada={p.vista.bloques[0].tipo === "portada" ? "" : undefined}>
      <PaginaRender vista={p.vista} modo="sitio" />
    </div>
  );
}
