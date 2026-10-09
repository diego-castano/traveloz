import type { Metadata } from "next";
import { CabeceraPagina, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { PaginaLegal } from "@/components/collection/sitio/pagina/PaginaLegal";
import { paginaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const p = await paginaPublicada("cookies");
  return metaSitio({ titulo: p?.vista.titulo ?? "Política de cookies", descripcion: p?.descripcion, ruta: "/cookies" });
}

export default async function Cookies() {
  const p = await paginaPublicada("cookies");
  // Sin publicar todavía: el pie y el aviso de cookies enlazan acá igual.
  if (!p) {
    return (
      <RaizSitio>
        <CabeceraPagina titulo="Política de cookies" bajada="Estamos terminando este texto. Si tenés una consulta, escribinos." />
      </RaizSitio>
    );
  }
  return <PaginaLegal vista={p.vista} modo="sitio" />;
}
