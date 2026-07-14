"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  Heading,
  Code,
  Baseline,
} from "lucide-react";

// Clase con la que el editor colorea texto en violeta. Debe coincidir con la
// allowlist del sanitizador (sanitize-html.ts) y con el CSS público (site.css).
const VIOLET_CLASS = "faq-violet";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
};

/**
 * Editor visual (WYSIWYG) liviano, sin dependencias. Reemplaza al textarea de
 * HTML crudo: el editor muestra el texto ya formateado y el usuario aplica
 * negrita/cursiva/listas seleccionando texto y tocando un botón. El valor que
 * emite sigue siendo HTML, así que es 100% compatible con bodyHtml.
 *
 * Incluye un toggle "</> HTML" para editar el código a mano cuando hace falta.
 */
export function WysiwygEditor({
  value,
  onChange,
  placeholder,
  minRows = 8,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);

  // Sincroniza el HTML externo hacia el contentEditable sin pisar el cursor:
  // solo reescribe el DOM cuando el valor difiere y el editor no tiene foco.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value, showSource]);

  // execCommand emite <b>/<i>; el resto del contenido usa <strong>/<em>.
  // Normalizamos para mantener una sola convención semántica.
  const emit = (html: string) =>
    onChange(
      html
        .replace(/<(\/?)b>/g, "<$1strong>")
        .replace(/<(\/?)i>/g, "<$1em>"),
    );

  const exec = (command: string, arg?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, arg);
    emit(el.innerHTML);
  };

  const toggleBlock = (tag: "H2" | "H3" | "P") => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Firefox exige el tag entre <>; Chrome acepta ambas formas.
    document.execCommand("formatBlock", false, `<${tag.toLowerCase()}>`);
    emit(el.innerHTML);
  };

  // Encuentra el <span.faq-violet> que contiene al nodo, si existe, sin salir
  // del editor.
  const violetAncestor = (node: Node | null, root: HTMLElement) => {
    let n: Node | null = node;
    while (n && n !== root) {
      if (n instanceof HTMLElement && n.classList.contains(VIOLET_CLASS)) return n;
      n = n.parentNode;
    }
    return null;
  };

  // Toggle violeta sobre la selección: si ya está dentro de un span violeta lo
  // quita; si no, envuelve el texto seleccionado en <span class="faq-violet">.
  const toggleViolet = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    const start = violetAncestor(range.startContainer, el);
    const end = violetAncestor(range.endContainer, el);
    // Selección dentro de un único span violeta → lo desenvolvemos.
    if (start && start === end) {
      const parent = start.parentNode;
      if (parent) {
        while (start.firstChild) parent.insertBefore(start.firstChild, start);
        parent.removeChild(start);
      }
      emit(el.innerHTML);
      return;
    }

    // Si no, envolvemos la selección.
    const span = document.createElement("span");
    span.className = VIOLET_CLASS;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(span);
      sel.addRange(r);
    } catch {
      // Selección que cruza límites de bloque: no forzamos.
    }
    emit(el.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt("URL del enlace:", "https://");
    if (!url) return;
    exec("createLink", url);
    // Asegura que los links abran en pestaña nueva y sean seguros.
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
    emit(el.innerHTML);
  };

  const btn =
    "p-1.5 text-neutral-600 hover:bg-neutral-200 rounded transition-colors";

  return (
    <div className="border border-neutral-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20">
      {/* El violeta del contenido se ve igual en el editor que en el sitio. */}
      <style>{`.wysiwyg-content .${VIOLET_CLASS}{color:#A05ED3}`}</style>
      <div className="flex flex-wrap items-center gap-0.5 bg-neutral-50 border-b border-neutral-200 px-2 py-1">
        <button
          type="button"
          onClick={() => exec("bold")}
          className={btn}
          title="Negrita (Ctrl/Cmd + B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className={btn}
          title="Cursiva (Ctrl/Cmd + I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleViolet}
          className={btn}
          title="Texto en violeta (seleccioná el texto y aplicá)"
          style={{ color: "#A05ED3" }}
        >
          <Baseline className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-neutral-300 mx-1" />
        <button
          type="button"
          onClick={() => toggleBlock("H2")}
          className={`${btn} text-[11px] font-semibold`}
          title="Subtítulo grande"
        >
          T1
        </button>
        <button
          type="button"
          onClick={() => toggleBlock("H3")}
          className={`${btn} text-[11px] font-semibold`}
          title="Subtítulo chico"
        >
          T2
        </button>
        <button
          type="button"
          onClick={() => toggleBlock("P")}
          className={btn}
          title="Párrafo normal"
        >
          <Heading className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-neutral-300 mx-1" />
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className={btn}
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={insertLink} className={btn} title="Enlace">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          className={`${btn} ml-auto ${showSource ? "bg-neutral-200" : ""}`}
          title="Editar HTML"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSource ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows + 2}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-white outline-none font-mono resize-y"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => emit(e.currentTarget.innerHTML)}
          data-placeholder={placeholder}
          className="wysiwyg-content w-full px-3 py-2 text-sm bg-white outline-none resize-y overflow-y-auto"
          style={{ minHeight: `${minRows * 1.6}rem` }}
        />
      )}
    </div>
  );
}
