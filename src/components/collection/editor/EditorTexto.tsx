"use client";

// Editor de texto rico de Collection (TipTap). Solo lo que el sitio sabe
// dibujar y el sanitizador deja pasar: párrafos, negrita, cursiva, subtítulo
// (h3), listas, cita y enlaces. Devuelve HTML.

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Popover } from "radix-ui";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, Quote, Unlink } from "lucide-react";
import { textoPlano } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, inputLinea } from "../ui";
import "./editor.css";

export function EditorTexto({
  valor,
  onCambio,
  placeholder,
  etiqueta,
  minAlto = 140,
  maxAlto = 420,
  maximo,
  recomendado,
  compacto,
  deshabilitado,
}: {
  valor: string;
  onCambio: (html: string) => void;
  placeholder?: string;
  /** Nombre accesible del área de texto. */
  etiqueta: string;
  minAlto?: number;
  maxAlto?: number;
  /** Tope de caracteres de texto plano (solo avisa). */
  maximo?: number;
  /** Mínimo sugerido: el contador se pone dorado al alcanzarlo. */
  recomendado?: number;
  compacto?: boolean;
  deshabilitado?: boolean;
}) {
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
  // TipTap normaliza el HTML que recibe (un <li> pasa a <li><p>), así que el
  // valor guardado y lo que devuelve el editor no coinciden aunque nadie haya
  // tocado nada. Guardamos las dos cosas: el último valor que llegó de afuera
  // y cómo lo dejó el editor. Solo es un cambio lo que difiere de lo segundo.
  const ultimoExterno = useRef(valor);
  const ultimoNormalizado = useRef<string | null>(null);
  const htmlDe = (e: Editor) => (e.isEmpty ? "" : e.getHTML());

  const editor = useEditor({
    immediatelyRender: false,
    editable: !deshabilitado,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: valor,
    editorProps: {
      attributes: {
        "aria-label": etiqueta,
        "aria-multiline": "true",
        role: "textbox",
        class: "col-prosa-editor focus:outline-none",
      },
    },
    onCreate: ({ editor: e }) => {
      ultimoNormalizado.current = htmlDe(e);
    },
    onUpdate: ({ editor: e }) => {
      const html = htmlDe(e);
      // Al abrir, TipTap puede emitir su versión normalizada del mismo texto.
      if (ultimoNormalizado.current === null || html === ultimoNormalizado.current) {
        ultimoNormalizado.current = html;
        return;
      }
      ultimoNormalizado.current = html;
      ultimoExterno.current = html;
      onCambioRef.current(html);
    },
  });

  // Si el valor cambia desde afuera (deshacer, "armar días"), lo reflejamos.
  useEffect(() => {
    if (!editor || valor === ultimoExterno.current) return;
    ultimoExterno.current = valor;
    editor.commands.setContent(valor, { emitUpdate: false });
    ultimoNormalizado.current = htmlDe(editor);
  }, [editor, valor]);

  useEffect(() => {
    editor?.setEditable(!deshabilitado);
  }, [editor, deshabilitado]);

  const largo = textoPlano(valor).length;

  return (
    <div
      className={cn(
        "group/editor rounded-sm border border-col-line bg-col-surface transition-colors duration-200 ease-col focus-within:border-col-gold",
        deshabilitado && "opacity-70",
      )}
    >
      {!deshabilitado && <Barra editor={editor} compacto={compacto} />}
      <div
        className="overflow-y-auto px-4 py-3"
        style={{ minHeight: compacto ? Math.min(minAlto, 96) : minAlto, maxHeight: maxAlto }}
        onClick={() => editor?.commands.focus()}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            className="col-prosa-editor text-col-slate/60"
            dangerouslySetInnerHTML={{ __html: valor || `<p>${placeholder ?? ""}</p>` }}
          />
        )}
      </div>
      {(maximo || recomendado) && (
        <div className="flex justify-end border-t border-col-line/70 px-4 py-1.5 text-[11px] tracking-wide text-col-slate/70">
          <span
            className={cn(
              recomendado && largo >= recomendado && "text-[#B07A2A]",
              maximo && largo > maximo && "text-col-alerta",
            )}
          >
            {largo.toLocaleString("es-UY")}
            {recomendado && largo < recomendado ? ` de ${recomendado} recomendados` : " caracteres"}
          </span>
        </div>
      )}
    </div>
  );
}

function Barra({ editor, compacto }: { editor: Editor | null; compacto?: boolean }) {
  const activo = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            negrita: e.isActive("bold"),
            cursiva: e.isActive("italic"),
            h3: e.isActive("heading", { level: 3 }),
            lista: e.isActive("bulletList"),
            numerada: e.isActive("orderedList"),
            cita: e.isActive("blockquote"),
            enlace: e.isActive("link"),
          }
        : null,
  });
  if (!editor) return <div className="h-10 border-b border-col-line/70" aria-hidden />;
  const c = () => editor.chain().focus();
  return (
    <div
      role="toolbar"
      aria-label="Formato del texto"
      className="flex h-10 items-center gap-0.5 border-b border-col-line/70 px-1.5"
    >
      <BotonBarra label="Negrita" atajo="Meta+B" activo={activo?.negrita} onClick={() => c().toggleBold().run()}>
        <Bold />
      </BotonBarra>
      <BotonBarra label="Cursiva" atajo="Meta+I" activo={activo?.cursiva} onClick={() => c().toggleItalic().run()}>
        <Italic />
      </BotonBarra>
      {!compacto && (
        <BotonBarra label="Subtítulo" activo={activo?.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          <Heading3 />
        </BotonBarra>
      )}
      <span aria-hidden className="mx-1 h-4 w-px bg-col-line" />
      <BotonBarra label="Lista" activo={activo?.lista} onClick={() => c().toggleBulletList().run()}>
        <List />
      </BotonBarra>
      {!compacto && (
        <BotonBarra label="Lista numerada" activo={activo?.numerada} onClick={() => c().toggleOrderedList().run()}>
          <ListOrdered />
        </BotonBarra>
      )}
      {!compacto && (
        <BotonBarra label="Cita" activo={activo?.cita} onClick={() => c().toggleBlockquote().run()}>
          <Quote />
        </BotonBarra>
      )}
      <span aria-hidden className="mx-1 h-4 w-px bg-col-line" />
      <Enlace editor={editor} activo={!!activo?.enlace} />
    </div>
  );
}

function BotonBarra({
  label,
  atajo,
  activo,
  onClick,
  children,
}: {
  label: string;
  atajo?: string;
  activo?: boolean;
  onClick: () => void;
  children: React.ReactElement;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={!!activo}
      aria-keyshortcuts={atajo}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm text-col-slate transition-colors duration-200 ease-col hover:bg-col-base hover:text-col-ink [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.6]",
        activo && "bg-col-base text-col-ink",
      )}
    >
      {children}
    </button>
  );
}

function Enlace({ editor, activo }: { editor: Editor; activo: boolean }) {
  const { raiz } = useCollection();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");

  const abrir = (o: boolean) => {
    if (o) setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setAbierto(o);
  };
  const aplicar = () => {
    const limpio = url.trim();
    const c = editor.chain().focus().extendMarkRange("link");
    if (!limpio) c.unsetLink().run();
    else c.setLink({ href: /^(https?:|mailto:|tel:)/.test(limpio) ? limpio : `https://${limpio}` }).run();
    setAbierto(false);
  };

  return (
    <Popover.Root open={abierto} onOpenChange={abrir}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Enlace"
          title="Enlace"
          aria-pressed={activo}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm text-col-slate transition-colors duration-200 ease-col hover:bg-col-base hover:text-col-ink",
            activo && "bg-col-base text-col-ink",
          )}
        >
          <Link2 className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={raiz}>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[60] w-80 rounded-sm border border-col-line bg-col-surface p-4 shadow-[0_16px_40px_-20px_rgba(50,55,59,0.45)]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              aplicar();
            }}
          >
            <label className="text-[12px] uppercase tracking-[0.12em] text-col-slate" htmlFor="col-enlace">
              Dirección del enlace
            </label>
            <input
              id="col-enlace"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="traveloz.com.uy/collection"
              className={inputLinea}
            />
            <div className="mt-4 flex items-center justify-between">
              {activo ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                    setAbierto(false);
                  }}
                  className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-col-slate hover:text-col-alerta"
                >
                  <Unlink className="h-3.5 w-3.5" strokeWidth={1.6} /> Quitar
                </button>
              ) : (
                <span />
              )}
              <Boton type="submit" tam="sm">
                Aplicar
              </Boton>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
