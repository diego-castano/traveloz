"use client";

// ---------------------------------------------------------------------------
// Adjunto (documento / pasaporte) con subida inmediata.
//
// El archivo NO viaja en la server action: apenas se elige, se sube solo a
// POST /api/datos/upload y lo único que queda en el formulario es la key del
// bucket, en un input hidden. Motivo: las server actions de Next bufean el
// body entero en RAM con un tope de 1 MB, y un grupo grande de pasajeros
// serían decenas de MB en la memoria de la única instancia.
//
// Usamos XHR y no fetch a propósito: fetch no expone progreso de subida y una
// foto de 6 MB desde un celular en 4G sin barra se siente colgada.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, FileText, Loader2, Paperclip, X } from "lucide-react";
import { ACENTO, Label } from "./ui";

export interface Adjunto {
  key: string;
  nombre: string;
  /** objectURL local para la miniatura. null en PDFs. */
  previewUrl: string | null;
}

type Estado =
  | { fase: "vacio" }
  | { fase: "subiendo"; progreso: number }
  | { fase: "error"; message: string };

export function AdjuntoField({
  name,
  label,
  ayuda,
  requerido,
  cta = "Adjuntar archivo",
  slug,
  lote,
  accept,
  maxBytes,
  value,
  onChange,
}: {
  name: string;
  label: string;
  ayuda?: string;
  requerido?: boolean;
  /** Texto del botón vacío. Se separa del label para no repetirlo dos veces
   *  cuando el campo YA se llama "Adjuntar archivo". */
  cta?: string;
  slug: string;
  /** Agrupa los archivos de este envío dentro del bucket. */
  lote: string;
  accept: string;
  maxBytes: number;
  value: Adjunto | null;
  onChange: (a: Adjunto | null) => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "vacio" });
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // Guardamos el objectURL vivo aparte para revocarlo aunque el padre ya haya
  // cambiado `value` (si no, se fuga memoria en formularios largos).
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function limpiarPreview() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  function subir(file: File) {
    if (file.size > maxBytes) {
      setEstado({
        fase: "error",
        message: `El archivo supera los ${Math.round(maxBytes / 1024 / 1024)} MB. Sacale una foto más liviana o mandá un PDF.`,
      });
      return;
    }

    limpiarPreview();
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    urlRef.current = previewUrl;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("slug", slug);
    fd.append("lote", lote);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/datos/upload");
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      setEstado({ fase: "subiendo", progreso: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onerror = () =>
      setEstado({ fase: "error", message: "Se cortó la conexión. Probá de nuevo." });
    xhr.onload = () => {
      let body: { ok?: boolean; key?: string; message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no-JSON: cae al mensaje genérico de abajo */
      }
      if (xhr.status === 200 && body.ok && body.key) {
        setEstado({ fase: "vacio" });
        onChange({ key: body.key, nombre: file.name, previewUrl });
        return;
      }
      limpiarPreview();
      setEstado({
        fase: "error",
        message: body.message ?? "No pudimos subir el archivo. Probá de nuevo.",
      });
    };
    setEstado({ fase: "subiendo", progreso: 0 });
    xhr.send(fd);
  }

  function quitar() {
    xhrRef.current?.abort();
    limpiarPreview();
    onChange(null);
    setEstado({ fase: "vacio" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <Label requerido={requerido}>{label}</Label>

      {/* La key subida es lo único que ve la server action. */}
      <input type="hidden" name={name} value={value?.key ?? ""} />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Reseteamos el input para poder reelegir el MISMO archivo después
          // de un error (si no, el onChange no vuelve a dispararse).
          e.target.value = "";
          if (f) subir(f);
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div
            key="listo"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex min-h-[46px] items-center gap-2.5 rounded-[10px] border border-emerald-300/70 bg-emerald-50/50 p-1.5 pr-1 sm:min-h-[42px]"
          >
            {value.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.previewUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-black/5"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-neutral-400 ring-1 ring-black/5">
                <FileText className="h-4 w-4" strokeWidth={1.7} />
              </div>
            )}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-700">
              {value.nombre}
            </span>
            <button
              type="button"
              onClick={quitar}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white hover:text-neutral-700"
              aria-label={`Quitar ${label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : estado.fase === "subiendo" ? (
          <motion.div
            key="subiendo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[46px] flex-col justify-center gap-2 rounded-[10px] border border-neutral-900/[0.14] bg-white px-3 py-2.5 sm:min-h-[42px]"
          >
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-neutral-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="flex-1">Subiendo…</span>
              <span className="tabular-nums text-neutral-400">{estado.progreso}%</span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="h-full rounded-full"
                style={{ background: ACENTO }}
                animate={{ width: `${estado.progreso}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="vacio"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-neutral-900/20 bg-neutral-50/50 px-3 text-[13px] font-medium text-neutral-600 transition-colors hover:border-neutral-900/40 hover:bg-neutral-50 hover:text-neutral-900 sm:h-[42px] sm:text-[12.5px]"
          >
            <Paperclip className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.8} />
            {cta}
          </motion.button>
        )}
      </AnimatePresence>

      {estado.fase === "error" && (
        <p className="mt-1 text-[11.5px] font-medium leading-snug text-red-600">{estado.message}</p>
      )}
      {ayuda && estado.fase !== "error" && (
        <p className="mt-1 text-[11.5px] leading-snug text-neutral-400">{ayuda}</p>
      )}
    </div>
  );
}
