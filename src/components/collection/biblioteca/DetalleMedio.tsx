"use client";

// Hoja lateral con el detalle de un medio: vista grande, punto de foco con
// recortes en vivo, textos con guardado automático y metadatos.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, LoaderCircle, Trash2, X } from "lucide-react";
import { actualizarMedio, eliminarMedio, type ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton, etiquetaCampo, inputLinea } from "../ui";
import { MedioImagen, aspectoDe, fmtDuracion, fmtPeso, srcDe } from "./MedioImagen";

const EASE = [0.22, 1, 0.36, 1] as const;
const RECORTES = [
  { label: "4:5", a: 4 / 5 },
  { label: "16:9", a: 16 / 9 },
  { label: "1:1", a: 1 },
];

export type EstadoGuardado = "quieto" | "guardando" | "guardado" | "error";
type Textos = { alt: string; leyenda: string; credito: string };

export function DetalleMedio({
  medio,
  posicion,
  subidoPor,
  onCerrar,
  onAnterior,
  onSiguiente,
  onCambio,
  onEliminado,
}: {
  medio: ColMedioDto | null;
  posicion: string;
  subidoPor: Record<string, string>;
  onCerrar: () => void;
  onAnterior: (() => void) | null;
  onSiguiente: (() => void) | null;
  onCambio: (m: ColMedioDto) => void;
  onEliminado: (id: string) => void;
}) {
  const { raiz } = useCollection();
  return (
    <Dialog.Root open={!!medio} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {medio && (
          <Dialog.Portal forceMount container={raiz}>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-col-ink/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-col-surface shadow-[-24px_0_60px_-30px_rgba(50,55,59,0.45)] focus:outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Cuerpo
                  key={medio.id}
                  medio={medio}
                  posicion={posicion}
                  subidoPor={subidoPor}
                  onAnterior={onAnterior}
                  onSiguiente={onSiguiente}
                  onCambio={onCambio}
                  onEliminado={onEliminado}
                />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Cuerpo({
  medio,
  posicion,
  subidoPor,
  onAnterior,
  onSiguiente,
  onCambio,
  onEliminado,
}: {
  medio: ColMedioDto;
  posicion: string;
  subidoPor: Record<string, string>;
  onAnterior: (() => void) | null;
  onSiguiente: (() => void) | null;
  onCambio: (m: ColMedioDto) => void;
  onEliminado: (id: string) => void;
}) {
  const { puede, usuario } = useCollection();
  const avisar = useAviso();
  const editable = puede("medios.editar");

  const [textos, setTextos] = useState<Textos>({ alt: medio.alt, leyenda: medio.leyenda, credito: medio.credito });
  const [foco, setFoco] = useState({ x: medio.focoX, y: medio.focoY });
  const [estado, setEstado] = useState<EstadoGuardado>("quieto");
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);

  // Último valor confirmado por el servidor, para mandar solo lo que cambió.
  const guardado = useRef(medio);
  const enVuelo = useRef(0);
  const eliminado = useRef(false);

  const guardar = useCallback(
    async (cambio: Parameters<typeof actualizarMedio>[1]) => {
      if (Object.keys(cambio).length === 0) return;
      const n = ++enVuelo.current;
      setEstado("guardando");
      const r = await actualizarMedio(medio.id, cambio);
      if (r.ok) {
        guardado.current = r.data;
        onCambio(r.data);
        if (n === enVuelo.current) setEstado("guardado");
      } else {
        setEstado("error");
        avisar(r.error, "error");
      }
    },
    [medio.id, onCambio, avisar],
  );

  const pendientes = useCallback((): Partial<Textos> => {
    const g = guardado.current;
    const c: Partial<Textos> = {};
    (["alt", "leyenda", "credito"] as const).forEach((k) => {
      if (textos[k].trim() !== g[k]) c[k] = textos[k];
    });
    return c;
  }, [textos]);

  // Guardado con pausa mientras escribe; el blur lo adelanta.
  useEffect(() => {
    if (!editable) return;
    const t = window.setTimeout(() => void guardar(pendientes()), 1200);
    return () => window.clearTimeout(t);
  }, [textos, editable, guardar, pendientes]);

  // Si se va a otro medio o cierra con cambios sin guardar, los manda igual.
  const flush = useRef<() => void>(() => {});
  flush.current = () => {
    if (editable && !eliminado.current) void guardar(pendientes());
  };
  useEffect(() => () => flush.current(), []);

  useEffect(() => {
    if (estado !== "guardado") return;
    const t = window.setTimeout(() => setEstado("quieto"), 2200);
    return () => window.clearTimeout(t);
  }, [estado]);

  // ←/→ entre medios, salvo que esté escribiendo o moviendo el foco.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [data-foco]")) return;
      if (e.key === "ArrowLeft" && onAnterior) onAnterior();
      if (e.key === "ArrowRight" && onSiguiente) onSiguiente();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnterior, onSiguiente]);

  const eliminar = async () => {
    setBorrando(true);
    const r = await eliminarMedio(medio.id);
    setBorrando(false);
    if (!r.ok) {
      avisar(r.error, "error");
      return;
    }
    eliminado.current = true;
    avisar("Medio eliminado.");
    onEliminado(medio.id);
  };

  const copiarUrl = async () => {
    try {
      await navigator.clipboard.writeText(new URL(medio.url, window.location.origin).toString());
      avisar("URL copiada.");
    } catch {
      avisar("No pudimos copiar la URL.", "error");
    }
  };

  const fecha = new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Montevideo",
  }).format(new Date(medio.createdAt));
  const autor = medio.subidoPorId
    ? medio.subidoPorId === usuario.id
      ? "Vos"
      : (subidoPor[medio.subidoPorId] ?? "Alguien del equipo")
    : "Sin registro";

  const a = aspectoDe(medio);
  const posicionCss = `${foco.x * 100}% ${foco.y * 100}%`;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-col-line pl-5 pr-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onAnterior?.()}
            disabled={!onAnterior}
            aria-label="Medio anterior"
            className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onSiguiente?.()}
            disabled={!onSiguiente}
            aria-label="Medio siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <span className="ml-1 text-[12px] tabular-nums text-col-slate">{posicion}</span>
        </div>
        <Dialog.Title className="min-w-0 flex-1 truncate px-2 text-[14px] font-normal text-col-ink">
          {medio.nombre}
        </Dialog.Title>
        <IndicadorGuardado estado={estado} />
        <Dialog.Close
          aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </Dialog.Close>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-col-base px-5 py-6">
          {medio.tipo === "VIDEO" ? (
            <video
              key={medio.id}
              src={medio.url}
              poster={medio.posterUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="mx-auto max-h-[420px] w-full rounded-sm bg-col-ink"
            />
          ) : (
            <EditorFoco medio={medio} aspecto={a} foco={foco} editable={editable} onMover={setFoco} onSoltar={(f) => void guardar({ focoX: f.x, focoY: f.y })} />
          )}
          {medio.tipo === "FOTO" && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-col-slate">Así se recorta</p>
              <div className="flex items-end gap-3">
                {RECORTES.map((r) => (
                  <figure key={r.label} className="min-w-0" style={{ flexGrow: r.a, flexBasis: 0 }}>
                    <MedioImagen
                      medio={medio}
                      sizes="200px"
                      ancho={480}
                      aspecto={r.a}
                      objectPosition={posicionCss}
                      className="w-full rounded-sm"
                    />
                    <figcaption className="mt-1.5 text-[11px] tracking-wide text-col-slate">{r.label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-7 px-5 py-7">
          <Campo
            id="alt"
            label="Texto alternativo"
            ayuda="Describí la foto para Google y lectores de pantalla."
            aviso={medio.tipo === "FOTO" && !textos.alt.trim()}
          >
            <textarea
              id="alt"
              rows={2}
              value={textos.alt}
              readOnly={!editable}
              maxLength={300}
              onChange={(e) => setTextos((t) => ({ ...t, alt: e.target.value }))}
              onBlur={() => flush.current()}
              placeholder="Atardecer sobre las dunas de Sossusvlei, Namibia"
              className={cn(inputLinea, "resize-none leading-relaxed")}
            />
          </Campo>
          <Campo id="leyenda" label="Leyenda" ayuda="Se muestra debajo de la foto en el sitio.">
            <input
              id="leyenda"
              value={textos.leyenda}
              readOnly={!editable}
              maxLength={300}
              onChange={(e) => setTextos((t) => ({ ...t, leyenda: e.target.value }))}
              onBlur={() => flush.current()}
              className={inputLinea}
            />
          </Campo>
          <Campo id="credito" label="Crédito" ayuda="Fotógrafo o fuente." aviso={!textos.credito.trim()}>
            <input
              id="credito"
              value={textos.credito}
              readOnly={!editable}
              maxLength={300}
              onChange={(e) => setTextos((t) => ({ ...t, credito: e.target.value }))}
              onBlur={() => flush.current()}
              className={inputLinea}
            />
          </Campo>
          <Etiquetas
            valor={medio.etiquetas}
            editable={editable}
            onCambio={(etiquetas) => void guardar({ etiquetas })}
          />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-col-line pt-6 text-[14px]">
            {medio.ancho && medio.alto ? <Dato t="Dimensiones">{`${medio.ancho} × ${medio.alto} px`}</Dato> : null}
            {medio.tipo === "VIDEO" && medio.duracion ? <Dato t="Duración">{fmtDuracion(medio.duracion)}</Dato> : null}
            <Dato t="Peso">{fmtPeso(medio.peso)}</Dato>
            {medio.colorDominante && (
              <Dato t="Color">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-4 w-4 rounded-sm ring-1 ring-col-line"
                    style={{ backgroundColor: medio.colorDominante }}
                  />
                  {medio.colorDominante.toUpperCase()}
                </span>
              </Dato>
            )}
            <Dato t="Subido">{fecha}</Dato>
            <Dato t="Por">{autor}</Dato>
          </dl>

          <div className="flex flex-wrap items-center gap-2 border-t border-col-line pt-6">
            <Boton variante="secundario" tam="sm" onClick={copiarUrl}>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Copiar URL
            </Boton>
            <a
              href={medio.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-col-ink/25 px-4 text-[12px] uppercase tracking-[0.12em] text-col-ink transition-colors duration-200 ease-col hover:border-col-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Abrir original
            </a>
            {editable && !confirmar && (
              <Boton variante="fantasma" tam="sm" className="ml-auto hover:text-col-alerta" onClick={() => setConfirmar(true)}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Eliminar
              </Boton>
            )}
          </div>
          {editable && confirmar && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-sm bg-col-base px-4 py-3">
              <p className="flex-1 text-[14px] text-col-ink">¿Eliminar este medio? No se puede deshacer.</p>
              <Boton variante="fantasma" tam="sm" onClick={() => setConfirmar(false)} disabled={borrando}>
                Cancelar
              </Boton>
              <Boton variante="peligro" tam="sm" onClick={eliminar} disabled={borrando} autoFocus>
                {borrando ? "Eliminando" : "Eliminar"}
              </Boton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EditorFoco({
  medio,
  aspecto,
  foco,
  editable,
  onMover,
  onSoltar,
}: {
  medio: ColMedioDto;
  aspecto: number;
  foco: { x: number; y: number };
  editable: boolean;
  onMover: (f: { x: number; y: number }) => void;
  onSoltar: (f: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  const ultimo = useRef(foco);
  const teclas = useRef<number | undefined>(undefined);

  const desde = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const f = {
      x: Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 1000) / 1000,
      y: Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 1000) / 1000,
    };
    ultimo.current = f;
    onMover(f);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const paso = e.shiftKey ? 0.1 : 0.02;
    const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!d) return;
    e.preventDefault();
    const f = {
      x: Math.round(Math.min(1, Math.max(0, foco.x + d[0])) * 1000) / 1000,
      y: Math.round(Math.min(1, Math.max(0, foco.y + d[1])) * 1000) / 1000,
    };
    onMover(f);
    window.clearTimeout(teclas.current);
    teclas.current = window.setTimeout(() => onSoltar(f), 600);
  };

  const src = srcDe(medio, 1600);
  return (
    <div
      ref={ref}
      data-foco
      tabIndex={editable ? 0 : undefined}
      role={editable ? "application" : undefined}
      aria-label={
        editable
          ? `Punto de foco en ${Math.round(foco.x * 100)} % horizontal y ${Math.round(foco.y * 100)} % vertical. Hacé clic o usá las flechas para moverlo.`
          : undefined
      }
      onPointerDown={(e) => {
        if (!editable) return;
        arrastrando.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        desde(e);
      }}
      onPointerMove={(e) => arrastrando.current && desde(e)}
      onPointerUp={() => {
        if (!arrastrando.current) return;
        arrastrando.current = false;
        onSoltar(ultimo.current);
      }}
      onKeyDown={editable ? onKeyDown : undefined}
      className={cn(
        "relative mx-auto touch-none select-none overflow-hidden rounded-sm",
        editable && "cursor-crosshair",
      )}
      style={{
        aspectRatio: String(aspecto),
        width: `min(100%, ${Math.round(420 * aspecto)}px)`,
        backgroundColor: medio.colorDominante ?? "#E2E2E2",
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={medio.alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-col-gold shadow-[0_0_0_1px_rgba(50,55,59,0.35),inset_0_0_0_1px_rgba(50,55,59,0.35)]"
        style={{ left: `${foco.x * 100}%`, top: `${foco.y * 100}%` }}
      >
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-col-gold" />
      </span>
    </div>
  );
}

export function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  return (
    <span aria-live="polite" className="flex w-24 items-center justify-end gap-1.5 text-[12px] text-col-slate">
      <AnimatePresence mode="wait" initial={false}>
        {estado === "guardando" && (
          <motion.span key="g" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} aria-hidden />
            Guardando
          </motion.span>
        )}
        {estado === "guardado" && (
          <motion.span key="ok" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Check className="h-3.5 w-3.5 text-col-gold" strokeWidth={2} aria-hidden />
            Guardado
          </motion.span>
        )}
        {estado === "error" && (
          <motion.span key="e" className="text-col-alerta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Sin guardar
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function Campo({
  id,
  label,
  ayuda,
  aviso,
  children,
}: {
  id: string;
  label: string;
  ayuda: string;
  aviso?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={cn(etiquetaCampo, "flex items-center gap-2")}>
        {label}
        {aviso && <span className="rounded-sm bg-col-gold/30 px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-col-ink">Falta</span>}
      </label>
      {children}
      <p className="text-[12px] text-col-slate">{ayuda}</p>
    </div>
  );
}

function Dato({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-col-slate">{t}</dt>
      <dd className="mt-1 text-col-ink">{children}</dd>
    </div>
  );
}

function Etiquetas({
  valor,
  editable,
  onCambio,
}: {
  valor: string[];
  editable: boolean;
  onCambio: (v: string[]) => void;
}) {
  const [lista, setLista] = useState(valor);
  const [texto, setTexto] = useState("");

  const cambiar = (v: string[]) => {
    setLista(v);
    onCambio(v);
  };
  const agregar = () => {
    const e = texto.trim().toLowerCase().slice(0, 40);
    setTexto("");
    if (!e || lista.includes(e) || lista.length >= 20) return;
    cambiar([...lista, e]);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="etiquetas" className={etiquetaCampo}>
        Etiquetas
      </label>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-col-slate/40 py-1.5 transition-colors duration-200 ease-col focus-within:border-col-gold">
        {lista.map((e) => (
          <span key={e} className="inline-flex items-center gap-1 rounded-sm bg-col-base py-1 pl-2 pr-1 text-[13px] text-col-ink">
            {e}
            {editable && (
              <button
                type="button"
                onClick={() => cambiar(lista.filter((x) => x !== e))}
                aria-label={`Quitar ${e}`}
                className="flex h-5 w-5 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        ))}
        {editable && (
          <input
            id="etiquetas"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                agregar();
              } else if (e.key === "Backspace" && !texto && lista.length) {
                cambiar(lista.slice(0, -1));
              }
            }}
            onBlur={() => texto.trim() && agregar()}
            placeholder={lista.length ? "" : "playa, safari, invierno"}
            className="min-w-[120px] flex-1 border-0 bg-transparent px-0 py-1 text-[15px] text-col-ink placeholder:text-col-slate/60 focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
        )}
        {!editable && lista.length === 0 && <span className="py-1 text-[14px] text-col-slate">Sin etiquetas</span>}
      </div>
      {editable && <p className="text-[12px] text-col-slate">Enter para agregar. Sirven para buscar.</p>}
    </div>
  );
}
