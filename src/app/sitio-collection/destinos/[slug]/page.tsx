import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/collection/ui";
import { MedioImagen, MedioVideo } from "@/components/collection/sitio/medios";
import { TarjetaExperiencia } from "@/components/collection/sitio/tarjetas";
import { EstadoVacio, JsonLd, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { destinoPublicado } from "@/lib/collection/sitio-datos";
import { metaSitio, migasJsonLd } from "@/lib/collection/sitio";
import { textoPlano } from "@/lib/collection/experiencia/contenido";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await destinoPublicado(params.slug);
  if (!d) return {};
  return metaSitio({ titulo: d.seoTitulo, descripcion: d.seoDescripcion, ruta: `/destinos/${params.slug}`, imagen: d.imagen });
}

export default async function Destino({ params }: Props) {
  const d = await destinoPublicado(params.slug);
  if (!d) notFound();
  const { card, relato, experiencias } = d;
  const proximamente = card.proximamente || !experiencias.length;

  return (
    <div data-portada="">
      <JsonLd
        datos={migasJsonLd([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Destinos", ruta: "/destinos" },
          { nombre: card.nombre, ruta: `/destinos/${card.slug}` },
        ])}
      />
      <RaizSitio>
        <header className="cs-hero">
          {card.portada &&
            (card.portada.tipo === "VIDEO" ? (
              <MedioVideo medio={card.portada} variante="fondo" relleno />
            ) : (
              <MedioImagen medio={card.portada} relleno prioridad encuadre={["16:9", "4:5"]} sizes="100vw" />
            ))}
          <div className="cs-hero-velo" aria-hidden />
          <div className="cs-hero-texto cs-envolvente">
            <Eyebrow className="text-white">{proximamente ? "Destino · Próximamente" : "Destino"}</Eyebrow>
            <h1 className="cs-display max-w-[18ch]">{card.nombre}</h1>
            {card.bajada && (
              <p className="max-w-[46ch] text-[17px] font-light leading-[1.6] text-white/90">{card.bajada}</p>
            )}
          </div>
        </header>

        {textoPlano(relato) && (
          <section className="cs-bloque bg-col-surface">
            <div className="cs-envolvente">
              <div className="cs-prosa mx-auto max-w-[640px] text-[19px] leading-[1.75]" dangerouslySetInnerHTML={{ __html: relato }} />
            </div>
          </section>
        )}

        {experiencias.length ? (
          <section className="cs-bloque">
            <div className="cs-envolvente flex flex-col gap-14">
              <h2 className="cs-h2 max-w-[22ch]">Experiencias en {card.nombre}</h2>
              <div className="cs-tarjetas">
                {experiencias.map((e) => (
                  <TarjetaExperiencia key={e.id} e={e} />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <EstadoVacio
            titulo="Próximamente."
            texto={`Estamos diseñando las experiencias de ${card.nombre}. Si querés viajar antes, contanos y un especialista lo arma con vos.`}
          />
        )}
      </RaizSitio>
    </div>
  );
}
