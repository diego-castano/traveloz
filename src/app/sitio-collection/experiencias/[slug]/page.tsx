import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExperienciaSitio } from "@/components/collection/sitio/chrome/ExperienciaSitio";
import { JsonLd, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { TarjetaExperiencia } from "@/components/collection/sitio/tarjetas";
import { experienciaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio, migasJsonLd } from "@/lib/collection/sitio";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await experienciaPublicada(params.slug);
  if (e?.tipo !== "ok") return {};
  return metaSitio({ titulo: e.seoTitulo, descripcion: e.seoDescripcion, ruta: `/experiencias/${params.slug}`, imagen: e.imagen });
}

export default async function Experiencia({ params }: Props) {
  const e = await experienciaPublicada(params.slug);
  if (!e) notFound();
  if (e.tipo === "redirigir") redirect(e.a);
  const { vista, relacionadas } = e;
  const destino = vista.destinos[0];

  return (
    <div data-portada="">
      <JsonLd
        datos={migasJsonLd([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Experiencias", ruta: "/experiencias" },
          ...(destino ? [{ nombre: destino.nombre, ruta: `/destinos/${destino.slug}` }] : []),
          { nombre: vista.titulo, ruta: `/experiencias/${vista.slug}` },
        ])}
      />
      <ExperienciaSitio vista={vista} />
      {relacionadas.length > 0 && destino && (
        <RaizSitio>
          <section className="cs-bloque bg-col-surface">
            <div className="cs-envolvente flex flex-col gap-14">
              <h2 className="cs-h2 max-w-[22ch]">Más experiencias en {destino.nombre}</h2>
              <div className="cs-tarjetas">
                {relacionadas.map((r) => (
                  <TarjetaExperiencia key={r.id} e={r} />
                ))}
              </div>
            </div>
          </section>
        </RaizSitio>
      )}
    </div>
  );
}
