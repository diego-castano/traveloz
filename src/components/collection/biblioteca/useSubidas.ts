"use client";

// Cola de subidas de la biblioteca: hasta 4 en paralelo. Cada archivo pide
// URL firmada (prepararSubidaMedio), sube directo al bucket con progreso y
// después se registra (registrarMedio), que genera variantes y metadatos.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  prepararSubidaMedio,
  registrarMedio,
  type ColMedioDto,
} from "@/actions/collection/medios.actions";
import { motivoPortada, motivoVideo } from "@/lib/collection/limites-video";

const MAX_PARALELO = 4;

export type EstadoSubida = "espera" | "subiendo" | "procesando" | "listo" | "error";

export interface Subida {
  id: string;
  file: File;
  preview: string | null;
  estado: EstadoSubida;
  progreso: number;
  error?: string;
}

/** Errores que no se arreglan reintentando: sesión vencida, permisos o formato. */
export function esReintentable(s: Subida) {
  return s.estado === "error" && !/no autorizado|sesión venció|acceso restringido|permiso|formato|pesa|dura|\.MOV/i.test(s.error ?? "");
}
export const esDeSesion = (s: Subida) => /no autorizado|sesión venció/i.test(s.error ?? "");

// presignedUpload firma su propia URL contra /api/upload/presigned; acá la
// URL y la key las da prepararSubidaMedio, así que el PUT va directo.
function subirPut(url: string, blob: Blob, onProgreso?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    // getPresignedPutUrl firma Cache-Control como cabecera: si el PUT no la
    // manda con el mismo valor, el bucket rechaza la firma (403).
    xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("El archivo no llegó a subirse. Probá de nuevo."));
    xhr.onerror = () => reject(new Error("Se cortó la conexión durante la subida."));
    xhr.send(blob);
  });
}

function esperar(el: HTMLVideoElement, evento: string, ms = 15000) {
  return new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    el.addEventListener(
      evento,
      () => {
        window.clearTimeout(t);
        resolve();
      },
      { once: true },
    );
    el.addEventListener("error", () => reject(new Error("video")), { once: true });
  });
}

/** Duración y un cuadro cerca del segundo 1 como póster (webp si el navegador puede). */
async function leerVideo(file: File): Promise<{ duracion?: number; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await esperar(v, "loadedmetadata");
    const duracion = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : undefined;
    v.currentTime = Math.min(1, (duracion ?? 2) / 2);
    await esperar(v, "seeked");
    const escala = Math.min(1, 1920 / Math.max(v.videoWidth, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * escala);
    canvas.height = Math.round(v.videoHeight * escala);
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
    return { duracion, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Para la ruta de prueba del constructor: reemplaza las actions y el PUT. */
export interface OpcionesSubidas {
  preparar?: typeof prepararSubidaMedio;
  registrar?: typeof registrarMedio;
  put?: typeof subirPut;
  /** Lugar de portada o fondo: videos de hasta 10 MB y 20 segundos. */
  portada?: boolean;
}

export function useSubidas(onListo: (m: ColMedioDto) => void, opciones: OpcionesSubidas = {}) {
  const preparar = opciones.preparar ?? prepararSubidaMedio;
  const registrar = opciones.registrar ?? registrarMedio;
  const put = opciones.put ?? subirPut;
  const portada = !!opciones.portada;
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [vuelta, setVuelta] = useState(0);
  const activas = useRef(new Set<string>());
  const onListoRef = useRef(onListo);
  useEffect(() => {
    onListoRef.current = onListo;
  }, [onListo]);

  const actualizar = useCallback((id: string, cambio: Partial<Subida>) => {
    setSubidas((s) => s.map((x) => (x.id === id ? { ...x, ...cambio } : x)));
  }, []);

  const procesar = useCallback(
    async (s: Subida) => {
      const { file } = s;
      try {
        let posterKey: string | undefined;
        let duracion: number | undefined;
        if (file.type.startsWith("video/")) {
          const info = await leerVideo(file).catch(() => null);
          duracion = info?.duracion;
          // Antes de subir nada: un video largo no entra.
          const motivo = portada ? motivoPortada(file.size, duracion) : motivoVideo(file.size, duracion);
          if (motivo) throw new Error(motivo);
          if (info?.poster) {
            actualizar(s.id, { preview: URL.createObjectURL(info.poster) });
            const ext = info.poster.type === "image/webp" ? "webp" : "png";
            const base = file.name.replace(/\.[^.]+$/, "");
            const prep = await preparar({
              nombre: `${base}-poster.${ext}`,
              contentType: info.poster.type,
              peso: info.poster.size,
            });
            if (prep.ok) {
              await put(prep.data.url, info.poster);
              posterKey = prep.data.key;
            }
          }
        }

        const prep = await preparar({ nombre: file.name, contentType: file.type, peso: file.size });
        if (!prep.ok) throw new Error(prep.error);
        actualizar(s.id, { estado: "subiendo", progreso: 0 });
        await put(prep.data.url, file, (p) => actualizar(s.id, { progreso: p }));

        actualizar(s.id, { estado: "procesando", progreso: 100 });
        const reg = await registrar({
          key: prep.data.key,
          nombre: file.name,
          contentType: file.type,
          peso: file.size,
          posterKey,
          duracion,
        });
        if (!reg.ok) throw new Error(reg.error);
        actualizar(s.id, { estado: "listo" });
        onListoRef.current(reg.data);
      } catch (err) {
        actualizar(s.id, {
          estado: "error",
          error: err instanceof Error ? err.message : "No pudimos subir el archivo.",
        });
      }
    },
    [actualizar, preparar, registrar, put, portada],
  );

  useEffect(() => {
    const libres = MAX_PARALELO - activas.current.size;
    if (libres <= 0) return;
    subidas
      .filter((s) => s.estado === "espera" && !activas.current.has(s.id))
      .slice(0, libres)
      .forEach((s) => {
        activas.current.add(s.id);
        void procesar(s).finally(() => {
          activas.current.delete(s.id);
          setVuelta((v) => v + 1);
        });
      });
  }, [subidas, vuelta, procesar]);

  const agregar = useCallback((files: File[]) => {
    const nuevas: Subida[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      estado: "espera",
      progreso: 0,
    }));
    setSubidas((s) => [...s, ...nuevas]);
  }, []);

  const reintentar = useCallback(
    (id: string) => actualizar(id, { estado: "espera", progreso: 0, error: undefined }),
    [actualizar],
  );

  const reintentarTodo = useCallback(
    () => setSubidas((s) => s.map((x) => (esReintentable(x) ? { ...x, estado: "espera", progreso: 0, error: undefined } : x))),
    [],
  );

  /** Saca de la lista lo terminado (listo o con error). */
  const limpiar = useCallback(() => {
    setSubidas((s) => {
      s.filter((x) => x.estado === "listo" || x.estado === "error").forEach((x) => {
        if (x.preview) URL.revokeObjectURL(x.preview);
      });
      return s.filter((x) => x.estado !== "listo" && x.estado !== "error");
    });
  }, []);

  return { subidas, agregar, reintentar, reintentarTodo, limpiar };
}
