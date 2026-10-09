import type { Metadata } from "next";
import { CabeceraPagina, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { FormularioContacto, type ExperienciaConsultada } from "@/components/collection/sitio/consulta/FormularioContacto";
import { destinosPublicados, experienciaPublicada } from "@/lib/collection/sitio-datos";
import { leerAjustesCollection } from "@/lib/collection/ajustes";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Contanos cuándo querés viajar y con quién. Un especialista te responde en el día.";

export const metadata: Metadata = metaSitio({ titulo: "Contactanos", descripcion: BAJADA, ruta: "/contacto" });

// Formulario de 4 pasos. Con ?experiencia=<slug> llega ya elegida.
export default async function Contacto({ searchParams }: { searchParams: { experiencia?: string } }) {
  const [exp, destinos, ajustes] = await Promise.all([
    searchParams.experiencia ? experienciaPublicada(searchParams.experiencia) : null,
    destinosPublicados(),
    leerAjustesCollection(),
  ]);
  const v = exp?.tipo === "ok" ? exp.vista : null;
  const ciudades = v ? v.tramos.filter((t) => t.ciudadNombre.trim()).length : 0;
  const experiencia: ExperienciaConsultada | null = v
    ? {
        slug: v.slug,
        titulo: v.titulo,
        datos: [v.noches > 0 && `${v.noches} noches`, ciudades > 0 && `${ciudades} ${ciudades === 1 ? "destino" : "destinos"}`]
          .filter(Boolean)
          .join(" · "),
        portada: v.portada?.tipo === "FOTO" ? v.portada : null,
      }
    : null;

  return (
    <RaizSitio>
      <CabeceraPagina titulo="Contactanos" bajada={BAJADA} />
      <section className="cs-envolvente py-12 md:py-16">
        <FormularioContacto destinos={destinos.map((d) => d.nombre)} experiencia={experiencia} whatsapp={ajustes.whatsapp} />
      </section>
    </RaizSitio>
  );
}
