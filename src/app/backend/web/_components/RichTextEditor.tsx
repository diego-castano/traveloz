"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, List, Eraser } from "lucide-react";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
};

/**
 * Tiny WYSIWYG built on contenteditable + document.execCommand.
 * execCommand is deprecated but still supported in every evergreen browser
 * and is the lowest-overhead way to give admins formatted text without
 * pulling in a 200kb editor framework.
 */
export function RichTextEditor({ value, onChange, rows = 6, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value into the DOM only when it differs — otherwise typing
  // would constantly reset the caret to the start.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const insertLink = () => {
    const url = window.prompt("URL del link", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  // Pegado limpio: el HTML del portapapeles (Word, Docs, webs) trae estilos,
  // spans y clases que ensuciarían el contenido publicado. Lo pasamos por el
  // whitelist antes de insertarlo; si no hay HTML, insertamos el texto plano
  // conservando los saltos de línea.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html
      ? sanitizeRichHtml(html)
      : text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\r?\n/g, "<br>");
    document.execCommand("insertHTML", false, clean);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="border border-neutral-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400">
      <div className="flex items-center gap-0.5 bg-neutral-50 border-b border-neutral-200 px-1.5 py-1">
        <ToolbarBtn label="Negrita (Ctrl+B)" onClick={() => exec("bold")}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Cursiva (Ctrl+I)" onClick={() => exec("italic")}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Subrayado (Ctrl+U)" onClick={() => exec("underline")}>
          <Underline className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Link" onClick={insertLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Lista" onClick={() => exec("insertUnorderedList")}>
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Quitar formato" onClick={() => exec("removeFormat")}>
          <Eraser className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
        className="rich-editable px-3 py-2.5 text-sm leading-relaxed outline-none bg-white"
        style={{ minHeight: `${rows * 1.5}rem` }}
      />
      <style jsx>{`
        .rich-editable:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-editable :global(p) {
          margin: 0 0 0.6em;
        }
        .rich-editable :global(p:last-child) {
          margin-bottom: 0;
        }
        .rich-editable :global(ul),
        .rich-editable :global(ol) {
          margin: 0 0 0.6em;
          padding-left: 1.4em;
        }
        .rich-editable :global(a) {
          color: #7c3aed;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // onMouseDown prevents the editor from losing focus before the command runs.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={label}
      className="p-1.5 text-neutral-600 hover:bg-neutral-200 rounded"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-neutral-300" />;
}
