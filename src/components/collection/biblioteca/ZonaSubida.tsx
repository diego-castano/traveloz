"use client";

// Piezas de subida que comparten la Biblioteca, el selector de medios y los
// lugares de una sola foto (portadas, retratos): la zona para soltar o elegir
// archivos, la tarjeta de cada subida con su progreso y el envoltorio que deja
// soltar un archivo directo sobre un lugar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Film, RotateCw, Upload } from "lucide-react";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useApi } from "../constructor/api";
import { CheckAnimado, DIST, DUR, EASE, ESCALA, transiciones } from "../movimiento";
import { esDeSesion, esReintentable, useSubidas, type Subida } from "./useSubidas";
import { errorAmigable } from "../shell/Avisos";
import { MENSAJE_MOV, TIPOS_VIDEO, esMov, motivoPortada, motivoVideo } from "@/lib/collection/limites-video";

export const ACEPTA_FOTO = "image/jpeg,image/png,image/webp,image/avif";
export const ACEPTA_VIDEO = TIPOS_VIDEO.join(",");
export const ACEPTA_TODO = `${ACEPTA_FOTO},${ACEPTA_VIDEO}`;

const MB = 1024 * 1024;
const TOPE_FOTO = 30 * MB;

export function aceptaDe(tipo?: "FOTO" | "VIDEO") {
  return tipo === "FOTO" ? ACEPTA_FOTO : tipo === "VIDEO" ? ACEPTA_VIDEO : ACEPTA_TODO;
}

function textoLimites(acepta: string, portada?: boolean) {
  const fotos = acepta.includes("image/") ? "Fotos JPG, PNG, WebP o AVIF hasta 30 MB." : "";
  const videos = !acepta.includes("video/")
    ? ""
    : portada
      ? "Videos MP4 o WebM hasta 10 MB y 20 segundos."
      : "Videos MP4 o WebM hasta 50 MB y 2 minutos.";
  return [fotos, videos].filter(Boolean).join(" ");
}

/**
 * Separa lo que se puede subir de lo que no, con el motivo en criollo. La
 * duración de los videos la revisa useSubidas antes de subir.
 */
export function revisarArchivos(files: File[], acepta: string, portada?: boolean) {
  const tipos = acepta.split(",");
  const validos: File[] = [];
  const motivos: string[] = [];
  for (const f of files) {
    const video = f.type.startsWith("video/");
    const motivoTope = video ? (portada ? motivoPortada(f.size, null) : motivoVideo(f.size, null)) : null;
    if (esMov(f) && acepta.includes("video/")) motivos.push(`${f.name}: ${MENSAJE_MOV}`);
    else if (!tipos.includes(f.type)) motivos.push(`${f.name}: formato no admitido`);
    else if (f.type.startsWith("image/") && f.size > TOPE_FOTO) motivos.push(`${f.name}: pesa más de 30 MB`);
    else if (motivoTope) motivos.push(`${f.name}: ${motivoTope}`);
    else validos.push(f);
  }
  return { validos, motivos };
}

/** Las capturas pegadas llegan como "image.png": les damos un nombre útil. */
export function nombrarPegados(files: File[]) {
  const sello = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return files.map((f, i) =>
    /^image\.\w+$/.test(f.name) ? new File([f], `pegada-${sello}-${i + 1}.${f.name.split(".")[1]}`, { type: f.type }) : f,
  );
}

function cuantosArchivos(e: React.DragEvent) {
  return Array.from(e.dataTransfer.items ?? []).filter((i) => i.kind === "file").length;
}

const conArchivos = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

/**
 * Zona grande para subir: soltar, pegar (si `pegar`) o elegir. Es un botón, así
 * que se abre con Enter o espacio. Al arrastrar encima se ilumina en dorado y
 * cuenta los archivos.
 */
export function ZonaSubida({
  acepta = ACEPTA_TODO,
  multiple = true,
  pegar = false,
  compacta = false,
  abierta = false,
  portada,
  onArchivos,
  className,
}: {
  acepta?: string;
  /** Lugar de portada o fondo: videos más cortos y livianos. */
  portada?: boolean;
  multiple?: boolean;
  /** Escucha ⌘V mientras la zona está en pantalla. */
  pegar?: boolean;
  /** Franja finita (cuando ya hay medios); se agranda al arrastrar archivos encima. */
  compacta?: boolean;
  /** Fuerza la franja agrandada (por ejemplo, si arrastran archivos sobre el diálogo). */
  abierta?: boolean;
  onArchivos: (files: File[]) => void;
  className?: string;
}) {
  const [encima, setEncima] = useState(0);
  const [motivos, setMotivos] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const profundidad = useRef(0);

  const recibir = useCallback(
    (files: File[]) => {
      const { validos, motivos } = revisarArchivos(files, acepta, portada);
      setMotivos(motivos);
      if (validos.length) onArchivos(multiple ? validos : validos.slice(0, 1));
    },
    [acepta, multiple, onArchivos, portada],
  );

  useEffect(() => {
    if (!motivos.length) return;
    const t = window.setTimeout(() => setMotivos([]), 7000);
    return () => window.clearTimeout(t);
  }, [motivos]);

  useEffect(() => {
    if (!pegar) return;
    const alPegar = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      recibir(nombrarPegados(files));
    };
    window.addEventListener("paste", alPegar);
    return () => window.removeEventListener("paste", alPegar);
  }, [pegar, recibir]);

  const fotos = acepta.includes("image/");
  const videos = acepta.includes("video/");
  const que = fotos && videos ? "fotos o videos" : videos ? (multiple ? "videos" : "un video") : multiple ? "fotos" : "una foto";
  const finita = compacta && !encima && !abierta;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <motion.button
        type="button"
        data-zona-subida
        onClick={() => input.current?.click()}
        onDragEnter={(e) => {
          if (!conArchivos(e)) return;
          e.preventDefault();
          profundidad.current++;
          setEncima(Math.max(1, cuantosArchivos(e)));
        }}
        onDragOver={(e) => {
          if (!conArchivos(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!conArchivos(e)) return;
          profundidad.current = Math.max(0, profundidad.current - 1);
          if (profundidad.current === 0) setEncima(0);
        }}
        onDrop={(e) => {
          e.preventDefault();
          profundidad.current = 0;
          setEncima(0);
          recibir(Array.from(e.dataTransfer.files));
        }}
        animate={{ scale: encima ? 1.012 : 1 }}
        transition={{ duration: DUR.fast, ease: EASE }}
        className={cn(
          "col-anillo group relative flex w-full flex-1 items-center overflow-hidden rounded-md border-[1.5px] border-dashed transition-[border-color,background-color,box-shadow,min-height] duration-col ease-col focus-visible:shadow-col-anillo",
          finita
            ? "min-h-14 flex-row gap-3 px-4 py-2.5 text-left"
            : cn("flex-col justify-center px-6 text-center", compacta ? "min-h-[140px] gap-3 py-6" : "min-h-[240px] gap-4 py-10"),
          encima || abierta
            ? "border-col-gold bg-[#FDF6EA] shadow-col-3"
            : "border-col-slate/30 bg-col-surface hover:border-col-slate/60 hover:bg-[#FCFCFB]",
        )}
      >
        <motion.span
          aria-hidden
          animate={{ y: encima ? -DIST.micro : 0, scale: encima ? 1.06 : 1 }}
          transition={{ duration: DUR.fast, ease: EASE }}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-colors duration-col ease-col",
            finita ? "h-9 w-9" : "h-14 w-14",
            encima || abierta ? "bg-col-gold text-col-noche" : "bg-col-base text-col-gold group-hover:bg-[#FDF6EA]",
          )}
        >
          <Upload className={finita ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.5} />
        </motion.span>
        {finita ? (
          <>
            <span className="min-w-0 flex-1 text-col-md text-col-slate">
              Arrastrá {que} acá o <span className="text-col-ink underline decoration-col-gold underline-offset-4">elegí {multiple ? "archivos" : "un archivo"}</span>
              {pegar && <span className="hidden md:inline">. También podés pegar con ⌘V</span>}
            </span>
            <span className="hidden shrink-0 text-col-xs text-col-muted lg:block">{textoLimites(acepta, portada)}</span>
          </>
        ) : (
          <>
            <span className={cn("font-col-display leading-tight text-col-ink", compacta ? "text-col-xl" : "min-h-[34px] text-col-2xl")} aria-live="polite">
              {encima ? `Soltá ${encima === 1 ? "el archivo" : `${encima} archivos`}` : `Arrastrá ${que} acá`}
            </span>
            <span className="max-w-[60ch] text-col-md leading-relaxed text-col-slate">
              {pegar ? "Pegá desde el portapapeles con ⌘V o " : "O "}
              <span className="text-col-ink underline decoration-col-gold underline-offset-4">elegí {multiple ? "archivos" : "un archivo"}</span> de
              tu computadora.
            </span>
            <span className="text-col-xs text-col-muted">{textoLimites(acepta, portada)}</span>
          </>
        )}
      </motion.button>
      <input
        ref={input}
        type="file"
        multiple={multiple}
        accept={acepta}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          recibir(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <AnimatePresence>
        {motivos.length > 0 && (
          <motion.ul
            role="alert"
            initial={{ opacity: 0, y: -DIST.micro }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.quick, ease: EASE }}
            className="flex flex-col gap-1 rounded-col bg-col-alerta/[0.07] px-4 py-3 text-col-sm text-col-alerta"
          >
            {motivos.slice(0, 4).map((m) => (
              <li key={m} className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                {m}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Anillo de progreso. Sin `valor`, gira (procesando). */
export function ProgresoCircular({ valor, tam = 40, className }: { valor?: number; tam?: number; className?: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 36 36"
      width={tam}
      height={tam}
      aria-hidden
      className={cn("-rotate-90", valor === undefined && "animate-spin [animation-duration:1.1s]", className)}
    >
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="#F4B860"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${c * (valor === undefined ? 0.28 : Math.max(valor, 2) / 100)} ${c}`}
        className="transition-[stroke-dasharray] duration-col-lento ease-col"
      />
    </svg>
  );
}

export function textoEstado(s: Subida) {
  if (s.estado === "espera") return "En espera";
  if (s.estado === "subiendo") return `Subiendo, ${s.progreso} %`;
  if (s.estado === "procesando") return "Procesando";
  if (s.estado === "listo") return "Listo";
  return s.error ? errorAmigable(s.error) : "No pudimos subirlo";
}

/** Tarjeta de una subida: miniatura en vivo, anillo de progreso y estado. */
export function TarjetaSubida({ s, onReintentar, listo = "Listo" }: { s: Subida; onReintentar: (id: string) => void; listo?: string }) {
  const enCurso = s.estado === "espera" || s.estado === "subiendo" || s.estado === "procesando";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: DIST.base }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: ESCALA.modal, transition: { duration: DUR.quick, ease: EASE } }}
      transition={{ duration: DUR.slow, ease: EASE, layout: { duration: DUR.fast, ease: EASE } }}
      className="overflow-hidden rounded-col bg-col-surface ring-1 ring-col-line"
    >
      <div className="relative aspect-[4/3] bg-col-base">
        {s.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.preview} alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-[filter] duration-col-lento", enCurso && "brightness-[0.7]")} />
        ) : (
          <Film className="absolute inset-0 m-auto h-6 w-6 text-col-muted" strokeWidth={1.25} aria-hidden />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {enCurso && (
              <motion.span key="p" exit={{ opacity: 0, scale: ESCALA.modal, transition: { duration: DUR.quick } }} className="relative flex items-center justify-center text-white">
                <ProgresoCircular valor={s.estado === "subiendo" ? s.progreso : s.estado === "espera" ? 0 : undefined} tam={48} />
                {s.estado === "subiendo" && (
                  <span className="absolute text-col-xs tabular-nums text-white">{s.progreso}</span>
                )}
              </motion.span>
            )}
            {s.estado === "listo" && (
              <motion.span
                key="ok"
                {...transiciones.pop}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-col-gold text-col-noche shadow-col-3"
              >
                <CheckAnimado className="h-5 w-5" />
              </motion.span>
            )}
            {s.estado === "error" && (
              <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-col-alerta/55">
                {esDeSesion(s) ? (
                  <a
                    href="/backend/login"
                    className="col-anillo flex h-9 items-center rounded-col bg-white px-3 text-col-md font-medium text-col-alerta focus-visible:shadow-col-anillo"
                  >
                    Volvé a entrar
                  </a>
                ) : esReintentable(s) ? (
                  <button
                    type="button"
                    onClick={() => onReintentar(s.id)}
                    aria-label={`Reintentar ${s.file.name}`}
                    className="col-anillo flex h-9 items-center gap-1.5 rounded-col bg-white px-3 text-col-md font-medium text-col-alerta transition-transform active:scale-[0.97] focus-visible:shadow-col-anillo"
                  >
                    <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Reintentar
                  </button>
                ) : (
                  <AlertCircle className="h-6 w-6 text-white" strokeWidth={1.5} aria-hidden />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-col-sm text-col-ink" title={s.file.name}>
          {s.file.name}
        </p>
        <p
          title={s.estado === "error" ? textoEstado(s) : undefined}
          className={cn("mt-0.5 line-clamp-2 text-col-xs leading-snug", s.estado === "error" ? "text-col-alerta" : "text-col-slate")}
        >
          {s.estado === "listo" ? listo : textoEstado(s)}
        </p>
      </div>
    </motion.li>
  );
}

/**
 * Envuelve un lugar de una sola foto (portada, retrato): soltar un archivo
 * encima lo sube y lo asigna. Mientras sube muestra la miniatura con el anillo.
 */
export function SoltarAqui({
  tipo,
  portada,
  onMedio,
  deshabilitado,
  className,
  children,
}: {
  tipo?: "FOTO" | "VIDEO";
  /** Lugar de portada o fondo: videos de hasta 10 MB y 20 segundos. */
  portada?: boolean;
  onMedio: (m: MedioVista) => void;
  deshabilitado?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const api = useApi();
  const { puede } = useCollection();
  const activo = !deshabilitado && puede("medios.editar");
  const [encima, setEncima] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const profundidad = useRef(0);
  const onMedioRef = useRef(onMedio);
  onMedioRef.current = onMedio;

  const opciones = useMemo(
    () => ({ preparar: api.prepararSubidaMedio, registrar: api.registrarMedio, put: api.subirArchivo, portada }),
    [api, portada],
  );
  const alListo = useCallback(
    async (m: ColMedioDto) => {
      const r = await api.obtenerMediosVista([m.id]).catch(() => null);
      if (r?.ok && r.data[0]) onMedioRef.current(r.data[0]);
      else setAviso("Se subió, pero no pudimos asignarla. Elegila desde la biblioteca.");
    },
    [api],
  );
  const { subidas, agregar, reintentar, limpiar } = useSubidas(alListo, opciones);
  const actual = subidas[subidas.length - 1];

  useEffect(() => {
    if (actual?.estado !== "listo") return;
    const t = window.setTimeout(limpiar, 1200);
    return () => window.clearTimeout(t);
  }, [actual?.estado, limpiar]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 7000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  if (!activo) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(e) => {
        if (!conArchivos(e)) return;
        e.preventDefault();
        profundidad.current++;
        setEncima(true);
      }}
      onDragOver={(e) => {
        if (!conArchivos(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!conArchivos(e)) return;
        profundidad.current = Math.max(0, profundidad.current - 1);
        if (profundidad.current === 0) setEncima(false);
      }}
      onDrop={(e) => {
        if (!conArchivos(e)) return;
        e.preventDefault();
        profundidad.current = 0;
        setEncima(false);
        const { validos, motivos } = revisarArchivos(Array.from(e.dataTransfer.files), aceptaDe(tipo), portada);
        if (validos[0]) {
          setAviso(null);
          limpiar();
          agregar([validos[0]]);
        } else if (motivos[0]) setAviso(motivos[0]);
      }}
    >
      {children}
      <AnimatePresence>
        {encima && (
          <motion.div
            key="encima"
            {...transiciones.velo}
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-col border-[1.5px] border-dashed border-col-gold bg-col-noche/60 text-center text-white backdrop-blur-[2px]"
          >
            <Upload className="h-5 w-5 text-col-gold" strokeWidth={1.5} aria-hidden />
            <span className="px-3 text-col-sm font-medium">Soltá para subir y usar</span>
          </motion.div>
        )}
        {actual && actual.estado !== "error" && (
          <motion.div
            key="subiendo"
            {...transiciones.velo}
            className="absolute inset-0 z-10 overflow-hidden rounded-col"
            aria-live="polite"
          >
            {actual.preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={actual.preview} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.65]" />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-col-noche/30 text-white">
              {actual.estado === "listo" ? (
                <motion.span
                  {...transiciones.pop}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-col-gold text-col-noche"
                >
                  <CheckAnimado className="h-5 w-5" />
                </motion.span>
              ) : (
                <ProgresoCircular valor={actual.estado === "subiendo" ? actual.progreso : undefined} tam={44} />
              )}
              <span className="text-col-xs">{textoEstado(actual)}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {(aviso || actual?.estado === "error") && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-col-sm text-col-alerta">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">{aviso ?? actual?.error}</span>
          {!aviso && actual && (
            <button type="button" onClick={() => reintentar(actual.id)} className="text-col-sm font-medium text-col-ink underline decoration-col-gold underline-offset-4">
              Reintentar
            </button>
          )}
        </p>
      )}
    </div>
  );
}
