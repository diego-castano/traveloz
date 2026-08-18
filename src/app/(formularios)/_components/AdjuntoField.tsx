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
import { FileText, Loader2, Paperclip, X } from "lucide-react";
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
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5"
          >
            {value.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.previewUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-400">
                <FileText className="h-5 w-5" />
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{value.nombre}</span>
            <button
              type="button"
              onClick={quitar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white hover:text-neutral-700"
              aria-label={`Quitar ${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : estado.fase === "subiendo" ? (
          <motion.div
            key="subiendo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-neutral-300 bg-white p-3.5"
          >
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo… {estado.progreso}%
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm font-medium text-neutral-600 transition active:scale-[0.99] hover:border-neutral-500 hover:text-neutral-900"
          >
            <Paperclip className="h-4 w-4" />
            Adjuntar archivo
          </motion.button>
        )}
      </AnimatePresence>

      {estado.fase === "error" && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{estado.message}</p>
      )}
      {ayuda && estado.fase !== "error" && (
        <p className="mt-1.5 text-xs text-neutral-400">{ayuda}</p>
      )}
    </div>
  );
}
