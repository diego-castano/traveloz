"use client";

// Artículo del journal: cabecera centrada, portada ancha, cuerpo editorial
// (capitular y citas destacadas), galería, banda de quien lo escribió y las
// experiencias relacionadas. Igual en el sitio y en la vista previa.

import type { ArticuloVista } from "@/lib/collection/paginas/contenido";
import { Eyebrow } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { BloqueGaleria } from "../bloques/editoriales";
import { fantasma, MedioBloque, TITULO_FANTASMA, type Modo } from "../bloques/comun";
import { BandaEspecialista, vacioHtml } from "../experiencia/secciones";
import { etiquetaArticulo, fechaLarga, TarjetaExperiencia } from "../tarjetas";
import "../sitio.css";

export function ArticuloPagina({ vista: a, modo }: { vista: ArticuloVista; modo: Modo }) {
  const preview = modo === "preview";
  const fecha = fechaLarga(a.publicadoEn);

  return (
    <div
      className="cs-raiz"
      data-modo={modo}
      onClickCapture={preview ? (e) => (e.target as HTMLElement).closest("a") && e.preventDefault() : undefined}
    >
      <header className="cs-envolvente flex flex-col items-center gap-6 pb-14 pt-20 text-center">
        <Eyebrow>{etiquetaArticulo(a)}</Eyebrow>
        <h1 className={cn("cs-h1 max-w-[20ch]", !a.titulo && fantasma)}>{a.titulo || TITULO_FANTASMA}</h1>
        {(a.bajada || preview) && (
          <p className={cn("max-w-[52ch] text-[19px] font-light leading-[1.6] text-col-slate", !a.bajada && fantasma)}>
            {a.bajada || "Una bajada que invite a leer."}
          </p>
        )}
        {fecha && (
          <time dateTime={a.publicadoEn ?? undefined} className="text-[13px] text-col-slate">
            {fecha}
          </time>
        )}
      </header>

      {(a.portada || preview) && (
        <div className="cs-envolvente">
          <div className="cs-articulo-portada">
            <MedioBloque medio={a.portada} preview={preview} relleno prioridad texto="Elegí la portada" sizes="100vw" />
          </div>
        </div>
      )}

      <div className="cs-bloque">
        <div className="cs-envolvente">
          {!vacioHtml(a.cuerpo) ? (
            <div className="cs-prosa cs-articulo" dangerouslySetInnerHTML={{ __html: a.cuerpo }} />
          ) : (
            preview && (
              <p className={cn("cs-articulo text-[19px] leading-relaxed", fantasma)}>
                Escribí el artículo: párrafos, subtítulos, citas destacadas y enlaces.
              </p>
            )
          )}
        </div>
      </div>

      {(a.galeria.length > 0 || preview) && (
        <div className="bg-col-surface">
          <BloqueGaleria
            bloque={{
              id: "galeria",
              tipo: "galeria",
              oculto: false,
              titulo: "En imágenes",
              medios: [],
              mediosVista: a.galeria.map((m) => ({ ...m, leyendaUso: m.leyenda })),
            }}
            modo={modo}
          />
        </div>
      )}

      {(a.autor || preview) && <BandaEspecialista e={a.autor} asunto={a.titulo} eyebrow="Escrito por" />}

      {a.experiencias.length > 0 && (
        <section className="cs-bloque">
          <div className="cs-envolvente flex flex-col gap-14">
            <h2 className="cs-h2">Experiencias relacionadas</h2>
            <div className="cs-tarjetas">
              {a.experiencias.map((e) => (
                <TarjetaExperiencia key={e.id} e={e} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
