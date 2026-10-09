"use client";

// Página de una experiencia de Collection. Es la misma en el sitio público y en
// la vista previa del constructor: el layout depende del ancho de .cs-raiz
// (@container), no de la ventana, para que el panel pueda mostrarla en 390 o
// en 1280 escalado.

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { ExperienciaVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import {
  Barra,
  Cierre,
  Detalles,
  Dias,
  Especialista,
  etiqueta,
  Galeria,
  Hoteles,
  Intro,
  PaginaCtx,
  plural,
  Portada,
  precioVisible,
  Recorrido,
  tituloCorto,
  vacioHtml,
  VideoSangre,
  type SeccionPagina,
} from "./secciones";
import "../sitio.css";

/** Secciones con `data-seccion`, para que el constructor haga scroll y resalte. */
export const SECCIONES_PAGINA: { id: SeccionPagina; titulo: string }[] = [
  { id: "hero", titulo: "Portada, datos y especialista" },
  { id: "intro", titulo: "Intro y lo imperdible" },
  { id: "recorrido", titulo: "Relato por destino y hoteles" },
  { id: "dias", titulo: "Día a día" },
  { id: "galeria", titulo: "Video y galería" },
  { id: "info", titulo: "Qué incluye e información práctica" },
  { id: "seo", titulo: "Título y portada (Google)" },
];

const ANCLAS = [
  { id: "resumen", nombre: "Resumen" },
  { id: "relato", nombre: "Relato" },
  { id: "dias", nombre: "Días" },
  { id: "hoteles", nombre: "Hoteles" },
  { id: "info", nombre: "Info" },
] as const;

function anclasPresentes(v: ExperienciaVista, preview: boolean) {
  if (preview) return ANCLAS.map((a) => a.id);
  const hay: Record<(typeof ANCLAS)[number]["id"], boolean> = {
    resumen: !!v.frase.trim() || !vacioHtml(v.intro) || v.imperdibles.length > 0,
    relato: v.tramos.some((t) => t.ciudadNombre.trim() || !vacioHtml(t.relato)),
    dias: v.dias.some((d) => d.titulo.trim() || !vacioHtml(d.texto)),
    hoteles: v.tramos.some((t) => t.hotel?.nombre.trim()),
    info:
      v.incluye.length > 0 ||
      v.noIncluye.length > 0 ||
      Object.values(v.info).some((x) => x.trim()) ||
      precioVisible(v),
  };
  return ANCLAS.filter((a) => hay[a.id]).map((a) => a.id);
}

export function ExperienciaPagina({
  vista,
  modo,
  seccionResaltada,
  onConsultar,
}: {
  vista: ExperienciaVista;
  modo: "sitio" | "preview";
  seccionResaltada?: string;
  onConsultar?: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const preview = modo === "preview";

  const irA = (ancla: string) =>
    raiz.current
      ?.querySelector(`[data-ancla="${ancla}"]`)
      ?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });

  // Sin formulario propio todavía: sin onConsultar, lleva a los canales del especialista.
  const ctx = useMemo(
    () => ({ preview, resaltada: seccionResaltada, consultar: onConsultar ?? (() => irA("especialista")) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, seccionResaltada, onConsultar, reducido],
  );

  return (
    <PaginaCtx.Provider value={ctx}>
      <div ref={raiz} className="cs-raiz" data-modo={modo}>
        <div data-seccion="seo" className={cn("cs-seccion", preview && seccionResaltada === "seo" && "cs-resaltada")}>
          <Portada v={vista} />
        </div>
        <Subnav v={vista} anclas={anclasPresentes(vista, preview)} raiz={raiz} irA={irA} />
        <Intro v={vista} />
        <Recorrido v={vista} />
        <Hoteles v={vista} />
        <VideoSangre v={vista} />
        <Dias v={vista} />
        <Galeria v={vista} />
        <Detalles v={vista} />
        <Especialista v={vista} />
        <Cierre v={vista} />
        <Barra v={vista} />
      </div>
    </PaginaCtx.Provider>
  );
}

function Subnav({
  v,
  anclas,
  raiz,
  irA,
}: {
  v: ExperienciaVista;
  anclas: string[];
  raiz: React.RefObject<HTMLDivElement>;
  irA: (ancla: string) => void;
}) {
  const [activa, setActiva] = useState<string | null>(null);
  const clave = anclas.join();

  // La sección activa es la que cruza la franja de arriba del área visible.
  // Funciona igual dentro del panel con scroll propio de la vista previa.
  useEffect(() => {
    const els = anclas
      .map((a) => raiz.current?.querySelector<HTMLElement>(`[data-ancla="${a}"]`))
      .filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setActiva((e.target as HTMLElement).dataset.ancla ?? null);
      },
      { rootMargin: "-25% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  if (!anclas.length) return null;
  return (
    <nav aria-label="Secciones de la experiencia" className="cs-subnav bg-col-ink text-col-base">
      <div className="cs-envolvente flex h-14 items-center gap-8">
        <div className="cs-subnav-titulo min-w-0 shrink items-baseline gap-4">
          <span className="truncate font-col-display text-[22px] leading-none">{tituloCorto(v.titulo) || "Experiencia"}</span>
          {v.noches > 0 && (
            <span className={cn(etiqueta, "shrink-0 text-col-line/80")}>{plural(v.noches, "noche", "noches")}</span>
          )}
        </div>
        <div className="cs-subnav-links h-full flex-1">
          {ANCLAS.filter((a) => anclas.includes(a.id)).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => irA(a.id)}
              aria-current={activa === a.id ? "location" : undefined}
              className={cn(
                etiqueta,
                "relative h-full shrink-0 px-3 transition-colors duration-300 ease-col",
                activa === a.id ? "text-col-base" : "text-col-line/60 hover:text-col-base",
              )}
            >
              {a.nombre}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 bottom-0 h-[2px] origin-left bg-col-gold transition-transform duration-500 ease-col",
                  activa === a.id ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          ))}
        </div>
        <ConsultarSubnav />
      </div>
    </nav>
  );
}

function ConsultarSubnav() {
  return (
    <PaginaCtx.Consumer>
      {({ consultar }) => (
        <button
          type="button"
          onClick={consultar}
          className={cn(
            etiqueta,
            "cs-subnav-consultar h-10 shrink-0 items-center rounded-sm bg-col-base px-5 text-col-ink transition-colors duration-200 ease-col hover:bg-col-gold",
          )}
        >
          Consultar
        </button>
      )}
    </PaginaCtx.Consumer>
  );
}
