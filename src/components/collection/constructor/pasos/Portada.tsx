"use client";

// Paso 2: portada. Foto o video de la biblioteca, con los recortes en vivo
// (hero 16:9 y tarjeta 4:5) según el foco de la foto.

import { useEffect, useState } from "react";
import { AlertTriangle, Crosshair, ImagePlus, RefreshCw, Upload, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { Boton } from "../../ui";
import { MedioImagen, fmtDuracion } from "../../sitio/medios";
import { SelectorMedios } from "../../pickers/SelectorMedios";
import { SoltarAqui } from "../../biblioteca/ZonaSubida";
import { useConstructor } from "../contexto";
import { BotonSobreFoto, etiquetaCampo } from "../campos";

export function PasoPortada() {
  const { borrador, setCampos, mapas, agregarMedios, refrescarMedios, editable } = useConstructor();
  const id = borrador.campos.portadaId;
  const medio = id ? mapas.medios.get(id) ?? null : null;
  const [selector, setSelector] = useState<null | "biblioteca" | "subir">(null);

  // Al volver de la biblioteca (foco ajustado en otra pestaña), refrescamos.
  useEffect(() => {
    if (!id) return;
    const h = () => void refrescarMedios([id]);
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [id, refrescarMedios]);

  const largo = medio?.tipo === "VIDEO" && (medio.duracion ?? 0) > 12;

  return (
    <div className="flex flex-col gap-10">
      <SoltarAqui
        deshabilitado={!editable}
        onMedio={(m) => {
          agregarMedios([m]);
          setCampos({ portadaId: m.id });
        }}
      >
      {medio ? (
        <div className="flex flex-col gap-6">
          <div className="group relative">
            <MedioImagen medio={medio} aspecto={16 / 9} sizes="700px" className="rounded-col-sm" />
            {medio.tipo === "VIDEO" && (
              <span className="absolute bottom-3 left-3 rounded-col-sm bg-col-ink/75 px-2 py-1 text-col-xs tracking-wide text-col-base backdrop-blur-sm">
                Video, {fmtDuracion(medio.duracion) || "sin duración"}
              </span>
            )}
            {editable && (
              <div className="absolute right-3 top-3 flex gap-1.5">
                <BotonSobreFoto label="Cambiar portada" onClick={() => setSelector("biblioteca")}>
                  <RefreshCw />
                </BotonSobreFoto>
                <BotonSobreFoto label="Quitar portada" onClick={() => setCampos({ portadaId: null })}>
                  <X />
                </BotonSobreFoto>
              </div>
            )}
          </div>

          {largo && (
            <p className="flex items-start gap-2 rounded-col-sm bg-col-gold/15 px-4 py-3 text-col-md text-col-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-col-aviso" strokeWidth={1.5} aria-hidden />
              Este video dura más de 12 segundos. Para la portada conviene un bucle corto, de menos de 6 MB, así la página
              carga rápido en el celular.
            </p>
          )}

          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <p className={etiquetaCampo}>Así se recorta</p>
              <div className="mt-3 grid grid-cols-[2fr_1fr] gap-4">
                <figure>
                  <MedioImagen medio={medio} aspecto={16 / 9} sizes="400px" className="rounded-col-sm" />
                  <figcaption className="mt-2 text-col-xs text-col-slate">Portada de la página, 16:9</figcaption>
                </figure>
                <figure>
                  <MedioImagen medio={medio} aspecto={4 / 5} sizes="200px" className="rounded-col-sm" />
                  <figcaption className="mt-2 text-col-xs text-col-slate">Tarjeta, 4:5</figcaption>
                </figure>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-col-line pt-5">
            {medio.tipo === "FOTO" && (
              <a
                href={`/backend/collection/biblioteca?medio=${medio.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-col-sm font-medium text-col-ink underline decoration-col-gold underline-offset-4"
              >
                <Crosshair className="h-4 w-4 text-col-gold" strokeWidth={1.5} aria-hidden /> Ajustar foco
              </a>
            )}
            <p className={cn("min-w-0 flex-1 text-col-sm", medio.alt ? "text-col-slate" : "text-col-aviso")}>
              {medio.alt ? `Descripción: ${medio.alt}` : "Sin descripción. Completala en la biblioteca: ayuda a Google y a quien usa lector de pantalla."}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="flex aspect-[16/9] flex-col items-center justify-center gap-5 rounded-md border-[1.5px] border-dashed border-col-slate/30 bg-col-surface px-6 text-center"
        >
          <ImagePlus className="h-8 w-8 text-col-gold" strokeWidth={1.2} aria-hidden />
          <div>
            <p className="font-col-display text-col-2xl leading-tight text-col-ink">La foto que abre todo</p>
            <p className="mx-auto mt-2 max-w-[44ch] text-col-md text-col-slate">
              Horizontal, con aire arriba para el título. También puede ser un video corto en bucle. Podés soltar el archivo acá.
            </p>
          </div>
          {editable && (
            <div className="flex flex-wrap justify-center gap-3">
              <Boton onClick={() => setSelector("biblioteca")}>
                <ImagePlus className="h-4 w-4" strokeWidth={1.5} /> Elegir de la biblioteca
              </Boton>
              <Boton variante="secundario" onClick={() => setSelector("subir")}>
                <Upload className="h-4 w-4" strokeWidth={1.5} /> Subir
              </Boton>
            </div>
          )}
        </div>
      )}
      </SoltarAqui>
      <SelectorMedios
        abierto={!!selector}
        pestanaInicial={selector ?? undefined}
        titulo="Portada"
        onCerrar={() => setSelector(null)}
        onElegir={(m) => {
          agregarMedios(m);
          if (m[0]) setCampos({ portadaId: m[0].id });
        }}
      />
    </div>
  );
}
