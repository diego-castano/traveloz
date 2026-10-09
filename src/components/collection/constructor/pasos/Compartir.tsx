"use client";

// Paso 8: compartir y Google. Título y descripción para buscadores, imagen
// para compartir y cómo se ven en Google y en WhatsApp.

import { cn } from "@/components/lib/cn";
import { MedioFantasma, MedioImagen } from "../../sitio/medios";
import { Campo, Contador, Grupo, SlotMedio, inputLinea } from "../campos";
import { useConstructor } from "../contexto";

const DOMINIO = "collection.traveloz.com.uy";
const corte = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function PasoCompartir() {
  const { borrador, setCampos, mapas, editable } = useConstructor();
  const c = borrador.campos;
  const titulo = c.seoTitulo || c.titulo;
  const descripcion = c.seoDescripcion || c.bajada;
  const imagenId = c.ogImagenId ?? c.portadaId;
  const imagen = imagenId ? mapas.medios.get(imagenId) : undefined;

  const ayudante = (texto: string, onClick: () => void, visible: boolean) =>
    editable && visible ? (
      <button
        type="button"
        onClick={onClick}
        className="text-[12px] uppercase tracking-[0.12em] text-col-slate underline decoration-col-gold underline-offset-4 hover:text-col-ink"
      >
        {texto}
      </button>
    ) : null;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-8">
        <Campo
          etiqueta="Título para Google"
          htmlFor="seo-titulo"
          ayuda={<Contador n={c.seoTitulo.length} ideal={60} max={60} />}
          accion={ayudante("Usar título", () => setCampos({ seoTitulo: c.titulo.slice(0, 70) }), !!c.titulo && c.seoTitulo !== c.titulo)}
        >
          <input
            id="seo-titulo"
            value={c.seoTitulo}
            maxLength={70}
            onChange={(e) => setCampos({ seoTitulo: e.target.value })}
            placeholder={c.titulo || "Filipinas en 11 noches: Manila, El Nido y Boracay"}
            className={cn(inputLinea, "text-[17px]")}
          />
        </Campo>
        <Campo
          etiqueta="Descripción para Google"
          htmlFor="seo-desc"
          ayuda={<Contador n={c.seoDescripcion.length} ideal={155} max={155} />}
          accion={ayudante(
            "Usar bajada",
            () => setCampos({ seoDescripcion: c.bajada.slice(0, 170) }),
            !!c.bajada && c.seoDescripcion !== c.bajada,
          )}
        >
          <textarea
            id="seo-desc"
            rows={3}
            value={c.seoDescripcion}
            maxLength={170}
            onChange={(e) => setCampos({ seoDescripcion: e.target.value })}
            placeholder="Al menos 50 caracteres. Qué es, cuánto dura y por qué vale la pena."
            className={cn(inputLinea, "resize-none text-[15px] leading-relaxed [field-sizing:content] min-h-[4.5em]")}
          />
        </Campo>
      </div>

      <Grupo titulo="En Google">
        <div className="rounded-sm border border-col-line bg-white p-5 font-[arial,sans-serif]">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-col-ink font-col-display text-[15px] italic text-col-base">
              C
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] leading-tight text-[#202124]">Traveloz Collection</span>
              <span className="block truncate text-[12px] leading-tight text-[#4d5156]">
                https://{DOMINIO} › experiencias › {c.slug || "…"}
              </span>
            </span>
          </div>
          <p className={cn("mt-2 text-[20px] leading-snug", titulo ? "text-[#1a0dab]" : "italic text-[#9aa0a6]")}>
            {titulo ? corte(titulo, 60) : "Sin título"}
          </p>
          <p className={cn("mt-1 text-[14px] leading-[1.58]", descripcion ? "text-[#4d5156]" : "italic text-[#9aa0a6]")}>
            {descripcion ? corte(descripcion, 155) : "Sin descripción: Google va a elegir un pedazo de la página."}
          </p>
        </div>
      </Grupo>

      <Grupo titulo="En WhatsApp" ayuda="Así se ve el link cuando alguien lo comparte.">
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-[1fr_200px]">
          <div className="rounded-lg bg-[#E7DED4] p-4">
            <div className="ml-auto max-w-[360px] rounded-lg rounded-tr-none bg-[#D9FDD3] p-1 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
              <div className="overflow-hidden rounded-md bg-[#CFEFC6]">
                {imagen ? (
                  <MedioImagen medio={imagen} aspecto={1200 / 630} sizes="360px" />
                ) : (
                  <MedioFantasma aspecto={1200 / 630} texto="Sin imagen" />
                )}
                <div className="px-3 py-2">
                  <p className="line-clamp-2 text-[14px] font-medium leading-snug text-[#111B21]">
                    {titulo || "Traveloz Collection"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[#667781]">{descripcion}</p>
                  <p className="mt-1 text-[12px] text-[#667781]">{DOMINIO}</p>
                </div>
              </div>
              <p className="px-2 pb-1 pt-1.5 text-[14px] text-[#111B21]">
                Mirá este viaje{" "}
                <span className="text-[#027EB5]">
                  https://{DOMINIO}/experiencias/{c.slug || "…"}
                </span>
              </p>
            </div>
          </div>
          <Campo
            etiqueta="Imagen para compartir"
            ayuda={c.ogImagenId ? "Recorte 1200 × 630." : "Si no elegís otra, se usa la portada."}
          >
            <SlotMedio
              aspecto={1200 / 630}
              tipo="FOTO"
              medioId={c.ogImagenId}
              etiqueta="imagen para compartir"
              vacio="Elegir otra"
              onCambio={(m) => setCampos({ ogImagenId: m?.id ?? null })}
            />
          </Campo>
        </div>
      </Grupo>
    </div>
  );
}
