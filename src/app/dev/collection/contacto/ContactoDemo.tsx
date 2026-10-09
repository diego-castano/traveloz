"use client";

import { CabeceraSitio } from "@/components/collection/sitio/chrome/CabeceraSitio";
import { PieSitio } from "@/components/collection/sitio/chrome/PieSitio";
import { CabeceraPagina, RaizSitio } from "@/components/collection/sitio/chrome/piezas";
import { ExperienciaSitio } from "@/components/collection/sitio/chrome/ExperienciaSitio";
import { ProveedorWhatsApp } from "@/components/collection/sitio/chrome/WhatsAppFlotante";
import { FormularioContacto } from "@/components/collection/sitio/consulta/FormularioContacto";
import { GraciasConsulta } from "@/components/collection/sitio/consulta/Gracias";
import { ProveedorEnvios, type EnviosSitio } from "@/components/collection/sitio/consulta/envios";
import { BloqueNewsletter } from "@/components/collection/sitio/bloques/editoriales";
import { demo } from "@/components/collection/sitio/demo";
import { mapasDemo } from "@/components/collection/sitio/demo-paginas";
import type { AjustesCollection } from "@/lib/collection/ajustes";

// Copia de AJUSTES_VACIOS: ese módulo lee la base y no puede ir al navegador.
const AJUSTES_VACIOS: AjustesCollection = {
  whatsapp: "",
  emailsConsultas: "",
  bitrixOrigen: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  textoFooter: "",
  seoTitulo: "",
  seoDescripcion: "",
  seoImagenId: "",
  indexar: "0",
  horario: "",
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const AJUSTES = {
  ...AJUSTES_VACIOS,
  whatsapp: "+59899412873",
  horario: "Lunes a viernes de 9 a 18",
  instagram: "https://www.instagram.com/travelozcollection",
  linkedin: "https://www.linkedin.com/company/traveloz",
};

export function ContactoDemo({
  vista,
  paso,
  conExperiencia,
  falla,
  numero,
  especialista,
}: {
  vista: string;
  paso: number;
  conExperiencia: boolean;
  falla: boolean;
  numero: string;
  especialista: string | null;
}) {
  const envios: EnviosSitio = {
    async enviarConsulta(input) {
      console.info("[dev] consulta", input);
      await esperar(1200);
      if (falla) throw new Error("sin conexión (simulado)");
      return { ok: true, data: { numero: "TC-0412", especialista: input.experienciaSlug ? { nombre: "Lucía Ferrer" } : undefined } };
    },
    async suscribir(input) {
      console.info("[dev] newsletter", input);
      await esperar(900);
      return falla ? { ok: false, error: "Recibimos varios envíos desde tu conexión. Probá de nuevo más tarde." } : { ok: true, data: null };
    },
    rutaGracias: (r) => `/dev/collection/contacto?vista=gracias&n=${r.numero}${r.especialista ? `&e=${encodeURIComponent(r.especialista.nombre)}` : ""}`,
  };
  const experiencias = mapasDemo.experiencias.map(({ destacada: _d, ...e }) => e);

  let cuerpo: React.ReactNode;
  if (vista === "hoja") {
    cuerpo = (
      <div data-portada="">
        <ExperienciaSitio vista={demo} consultaAbierta />
      </div>
    );
  } else if (vista === "gracias") {
    cuerpo = (
      <RaizSitio>
        <GraciasConsulta numero={numero} especialista={especialista} sugeridas={experiencias.slice(0, 3)} />
      </RaizSitio>
    );
  } else if (vista === "newsletter") {
    cuerpo = (
      <RaizSitio>
        <BloqueNewsletter bloque={{ id: "n", tipo: "newsletter", titulo: "Cartas de viaje, pocas veces al año.", texto: "Un destino, un relato y una idea para tu próximo viaje.", medioId: null, medioVista: null } as never} modo="sitio" />
      </RaizSitio>
    );
  } else {
    cuerpo = (
      <RaizSitio>
        <CabeceraPagina titulo="Contactanos" bajada="Contanos cuándo querés viajar y con quién. Un especialista te responde en el día." />
        <section className="cs-envolvente py-12 md:py-16">
          <FormularioContacto
            key={paso}
            destinos={mapasDemo.destinos.map((d) => d.nombre)}
            experiencia={
              conExperiencia
                ? { slug: demo.slug, titulo: demo.titulo, datos: "12 noches · 3 destinos", portada: demo.portada?.tipo === "FOTO" ? demo.portada : null }
                : null
            }
            whatsapp={AJUSTES.whatsapp}
            pasoInicial={paso}
          />
        </section>
      </RaizSitio>
    );
  }

  return (
    <ProveedorEnvios value={envios}>
      <div className="sitio min-h-screen bg-col-base font-col-text text-col-ink">
        <ProveedorWhatsApp numero={AJUSTES.whatsapp}>
          <CabeceraSitio />
          <main className="sitio-main">{cuerpo}</main>
          <PieSitio ajustes={AJUSTES} />
        </ProveedorWhatsApp>
      </div>
    </ProveedorEnvios>
  );
}
