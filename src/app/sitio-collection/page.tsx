import type { Metadata } from "next";
import { PaginaRender } from "@/components/collection/sitio/pagina/PaginaRender";
import { EnPreparacion, JsonLd } from "@/components/collection/sitio/chrome/piezas";
import { paginaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio, NOMBRE_SITIO, URL_SITIO } from "@/lib/collection/sitio";

const DESCRIPCION = "Viajes de autor de Traveloz: experiencias diseñadas a tu medida por un especialista, de principio a fin.";

export async function generateMetadata(): Promise<Metadata> {
  const p = await paginaPublicada("inicio");
  return metaSitio({ descripcion: p?.descripcion || DESCRIPCION, ruta: "/", imagen: p?.imagen });
}

export default async function Inicio() {
  const p = await paginaPublicada("inicio");
  const bloques = p?.vista.bloques ?? [];
  const agencia = (
    <JsonLd
      datos={{
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        name: NOMBRE_SITIO,
        url: URL_SITIO,
        description: p?.descripcion || DESCRIPCION,
        parentOrganization: { "@type": "TravelAgency", name: "Traveloz", url: "https://www.traveloz.com.uy" },
      }}
    />
  );

  if (!bloques.length) {
    return (
      <>
        {agencia}
        <EnPreparacion texto="Estamos preparando las primeras experiencias de Traveloz Collection. Mientras tanto, contanos qué viaje tenés en mente." />
      </>
    );
  }
  // El menú va transparente solo si la página abre con una portada.
  const conPortada = bloques[0].tipo === "portada";
  return (
    <div data-portada={conPortada ? "" : undefined}>
      {agencia}
      <PaginaRender vista={p!.vista} modo="sitio" />
    </div>
  );
}
