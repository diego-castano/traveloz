import type { Metadata } from "next";
import { BandaEspecialista } from "@/components/collection/sitio/experiencia/secciones";
import { CabeceraPagina, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { especialistasPublicados, experienciaPublicada } from "@/lib/collection/sitio-datos";
import { metaSitio } from "@/lib/collection/sitio";

const BAJADA = "Contanos cuándo querés viajar y con quién. Un especialista te responde en el día.";

export const metadata: Metadata = metaSitio({ titulo: "Contactanos", descripcion: BAJADA, ruta: "/contacto" });

// TODO fase 5: el cuerpo de esta página pasa a ser el formulario de consulta
// de 4 pasos (con ?experiencia=<slug> ya elegido). La ruta y el título quedan.
export default async function Contacto({ searchParams }: { searchParams: { experiencia?: string } }) {
  const [exp, especialistas] = await Promise.all([
    searchParams.experiencia ? experienciaPublicada(searchParams.experiencia) : null,
    especialistasPublicados(),
  ]);
  const vista = exp?.tipo === "ok" ? exp.vista : null;
  const conCanales = (e: { whatsapp: string; email: string; telefono: string }) => !!(e.whatsapp || e.email || e.telefono);
  // Con experiencia, su especialista; si no, los publicados que tienen canales.
  const contactos = vista?.especialista && conCanales(vista.especialista)
    ? [vista.especialista]
    : especialistas.filter(conCanales);

  return (
    <RaizSitio>
      <CabeceraPagina titulo="Contactanos" bajada={vista ? `Tu consulta por ${vista.titulo}. ${BAJADA}` : BAJADA} />
      {contactos.length ? (
        contactos.map((e) => <BandaEspecialista key={e.id} e={e} asunto={vista?.titulo ?? "un viaje de Traveloz Collection"} />)
      ) : (
        <section className="cs-envolvente flex flex-col items-start gap-6 py-24">
          <span aria-hidden className="h-px w-12 bg-col-gold" />
          <p className="max-w-[52ch] text-[17px] font-light leading-[1.65] text-col-slate">
            Muy pronto vas a poder dejarnos tu consulta acá. Mientras tanto, escribinos desde{" "}
            <a href="https://www.traveloz.com.uy/contact" className="text-col-ink underline decoration-col-line underline-offset-4 hover:decoration-col-gold">
              Traveloz
            </a>
            .
          </p>
        </section>
      )}
    </RaizSitio>
  );
}
