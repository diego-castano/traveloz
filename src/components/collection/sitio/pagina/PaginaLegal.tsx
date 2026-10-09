"use client";

// Plantilla de las páginas legales (términos, privacidad, cookies): título,
// fecha de actualización y el texto en columna de lectura. Con 3 subtítulos
// (h3) o más arma un índice con anclas. Los bloques que no son de texto se
// dibujan debajo, como en cualquier página.

import { useMemo } from "react";
import type { PaginaVista } from "@/lib/collection/paginas/contenido";
import { cn } from "@/components/lib/cn";
import { BloqueSitio, bloqueVacio, type Modo } from "../bloques";
import { fantasma, type BloqueDeVista } from "../bloques/comun";
import { etiqueta, pad2, vacioHtml } from "../experiencia/secciones";
import { fechaLarga } from "../tarjetas";
import "../sitio.css";

const slug = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "seccion";

/** Les pone id a los h3 (el HTML viene sanitizado, sin ids) y junta el índice. */
function conAnclas(htmls: string[]) {
  const usados = new Set<string>();
  const indice: { id: string; texto: string }[] = [];
  const salida = htmls.map((h) =>
    h.replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, (_, attrs: string | undefined, inner: string) => {
      const texto = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
      let id = slug(texto);
      for (let n = 2; usados.has(id); n++) id = `${slug(texto)}-${n}`;
      usados.add(id);
      indice.push({ id, texto });
      return `<h3${(attrs ?? "").replace(/\sid="[^"]*"/i, "")} id="${id}">${inner}</h3>`;
    }),
  );
  return { salida, indice };
}

export function PaginaLegal({ vista, modo }: { vista: PaginaVista; modo: Modo }) {
  const preview = modo === "preview";
  const visibles = vista.bloques.filter((b) => preview || !b.oculto);
  const textos = visibles.filter((b): b is BloqueDeVista<"texto"> => b.tipo === "texto" && (preview || !vacioHtml(b.texto)));
  const otros = visibles.filter((b) => b.tipo !== "texto" && (preview || !bloqueVacio(b)));
  const clave = textos.map((t) => t.texto).join("\u0000");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { salida, indice } = useMemo(() => conAnclas(textos.map((t) => t.texto)), [clave]);
  const fecha = fechaLarga(vista.actualizadaEn);
  const conIndice = indice.length >= 3;

  return (
    <div className="cs-raiz" data-modo={modo}>
      <header className="border-b border-col-line bg-col-surface">
        <div className="cs-envolvente flex flex-col gap-6 pb-12 pt-20">
          <h1 className="cs-h1 max-w-[24ch]">{vista.titulo}</h1>
          {(fecha || preview) && (
            <p className={cn("text-[13px] text-col-slate", !fecha && fantasma)}>
              {fecha ? `Actualizado el ${fecha}` : "Se fecha al publicar"}
            </p>
          )}
        </div>
      </header>

      <div className={cn("cs-envolvente cs-legal cs-bloque", conIndice && "cs-legal--indice")}>
        {conIndice && (
          <nav aria-label="Índice" className="cs-legal-indice flex flex-col text-[14px] leading-5">
            <span className={cn(etiqueta, "mb-3 text-col-slate")}>En esta página</span>
            {indice.map((h, i) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="flex gap-3 border-t border-col-line py-2.5 text-col-slate transition-colors duration-200 ease-col hover:text-col-ink"
              >
                <span className="tabular-nums text-col-slate/60">{pad2(i + 1)}</span>
                {h.texto}
              </a>
            ))}
          </nav>
        )}
        <article className="flex max-w-[680px] flex-col gap-12">
          {textos.length ? (
            textos.map((t, i) =>
              vacioHtml(t.texto) ? (
                <p key={t.id} className={cn("text-[18px]", fantasma)}>
                  Pegá acá el texto legal: subtítulos, listas, tablas y enlaces.
                </p>
              ) : (
                <section key={t.id} className="flex flex-col gap-6">
                  {t.titulo && <h2 className="cs-h2">{t.titulo}</h2>}
                  <div className="cs-prosa cs-prosa--legal" dangerouslySetInnerHTML={{ __html: salida[i] }} />
                </section>
              ),
            )
          ) : (
            preview && (
              <p className={cn("text-[18px]", fantasma)}>Sumá un bloque de Texto con el contenido legal.</p>
            )
          )}
        </article>
      </div>

      {otros.map((b) => (
        <div key={b.id} data-bloque={b.id} className="cs-seccion">
          <BloqueSitio bloque={b} modo={modo} />
        </div>
      ))}
    </div>
  );
}
