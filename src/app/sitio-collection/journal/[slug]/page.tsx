import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticuloPagina } from "@/components/collection/sitio/journal/ArticuloPagina";
import { JsonLd } from "@/components/collection/sitio/chrome/piezas";
import { articuloPublicado } from "@/lib/collection/sitio-datos";
import { metaSitio, migasJsonLd } from "@/lib/collection/sitio";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await articuloPublicado(params.slug);
  if (!a) return {};
  return metaSitio({ titulo: a.seoTitulo, descripcion: a.seoDescripcion, ruta: `/journal/${params.slug}`, imagen: a.imagen });
}

export default async function Articulo({ params }: Props) {
  const a = await articuloPublicado(params.slug);
  if (!a) notFound();
  return (
    <>
      <JsonLd
        datos={migasJsonLd([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Journal", ruta: "/journal" },
          { nombre: a.vista.titulo, ruta: `/journal/${a.vista.slug}` },
        ])}
      />
      <ArticuloPagina vista={a.vista} modo="sitio" />
    </>
  );
}
