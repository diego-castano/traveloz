import type { Metadata } from "next";
import { CabeceraPagina, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { PaginaLegal } from "@/components/collection/sitio/pagina/PaginaLegal";
import { paginaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const p = await paginaPublicada("terminos");
  return metaSitio({ titulo: p?.vista.titulo ?? "Términos y condiciones", descripcion: p?.descripcion, ruta: "/terminos" });
}

export default async function Terminos() {
  const p = await paginaPublicada("terminos");
  // Sin publicar todavía: el pie y el aviso de cookies enlazan acá igual.
  if (!p) {
    return (
      <RaizSitio>
        <CabeceraPagina titulo="Términos y condiciones" bajada="Estamos terminando este texto. Si tenés una consulta, escribinos." />
      </RaizSitio>
    );
  }
  return <PaginaLegal vista={p.vista} modo="sitio" />;
}
