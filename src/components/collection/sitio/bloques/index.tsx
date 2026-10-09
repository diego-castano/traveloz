"use client";

// Un bloque de página dibujado por su tipo. Fuera de PaginaRender hay que
// envolverlo en un .cs-raiz (de ahí salen el ancho y las container queries).

import type { BloqueVista } from "@/lib/collection/paginas/contenido";
import { vacioHtml } from "../experiencia/secciones";
import type { Modo } from "./comun";
import {
  BloqueCierre,
  BloqueCifras,
  BloqueCita,
  BloqueGaleria,
  BloqueImagenTexto,
  BloqueManifiesto,
  BloqueNewsletter,
  BloquePortada,
  BloqueTexto,
} from "./editoriales";
import {
  BloqueAliados,
  BloqueDestinos,
  BloqueEspecialistas,
  BloqueEstilos,
  BloqueExperiencias,
  BloqueJournal,
  BloquePreguntas,
  BloqueTestimonios,
} from "./listas";

export type { Modo } from "./comun";
export * from "./editoriales";
export * from "./listas";

/** true si el bloque no tiene nada que mostrar en el sitio (el sitio lo omite). */
export function bloqueVacio(b: BloqueVista): boolean {
  switch (b.tipo) {
    case "portada":
      return !b.titulo.trim() && !b.medioVista;
    case "manifiesto":
      return vacioHtml(b.texto);
    case "texto":
      return vacioHtml(b.texto) && !b.titulo.trim();
    case "imagenTexto":
      return vacioHtml(b.texto) && !b.titulo.trim() && !b.medioVista;
    case "galeria":
      return !b.mediosVista.length;
    case "cita":
      return !b.texto.trim();
    case "cifras":
      return !b.items.some((i) => i.valor.trim());
    case "destinos":
      return !b.destinos.length;
    case "experiencias":
      return !b.experiencias.length;
    case "estilos":
      return !b.itemsVista.some((i) => i.titulo.trim());
    case "especialistas":
      return !b.especialistas.length;
    case "testimonios":
      return !b.testimonios.length;
    case "aliados":
      return !b.aliados.length;
    case "preguntas":
      return !b.preguntas.length;
    case "journal":
      return !b.articulos.length;
    case "newsletter":
      // El formulario alcanza: sin título usa uno por defecto.
      return false;
    case "cierre":
      return !b.titulo.trim();
  }
}

export function BloqueSitio({ bloque: b, modo }: { bloque: BloqueVista; modo: Modo }) {
  switch (b.tipo) {
    case "portada":
      return <BloquePortada bloque={b} modo={modo} />;
    case "manifiesto":
      return <BloqueManifiesto bloque={b} modo={modo} />;
    case "texto":
      return <BloqueTexto bloque={b} modo={modo} />;
    case "imagenTexto":
      return <BloqueImagenTexto bloque={b} modo={modo} />;
    case "galeria":
      return <BloqueGaleria bloque={b} modo={modo} />;
    case "cita":
      return <BloqueCita bloque={b} modo={modo} />;
    case "cifras":
      return <BloqueCifras bloque={b} modo={modo} />;
    case "destinos":
      return <BloqueDestinos bloque={b} modo={modo} />;
    case "experiencias":
      return <BloqueExperiencias bloque={b} modo={modo} />;
    case "estilos":
      return <BloqueEstilos bloque={b} modo={modo} />;
    case "especialistas":
      return <BloqueEspecialistas bloque={b} modo={modo} />;
    case "testimonios":
      return <BloqueTestimonios bloque={b} modo={modo} />;
    case "aliados":
      return <BloqueAliados bloque={b} modo={modo} />;
    case "preguntas":
      return <BloquePreguntas bloque={b} modo={modo} />;
    case "journal":
      return <BloqueJournal bloque={b} modo={modo} />;
    case "newsletter":
      return <BloqueNewsletter bloque={b} modo={modo} />;
    case "cierre":
      return <BloqueCierre bloque={b} modo={modo} />;
  }
}
