"use client";

// Piezas que comparten los módulos de contenido (Destinos, Especialistas,
// Aliados, Testimonios y Preguntas): la hoja lateral de edición,
// el guardado automático, el alta con nombre en línea y el borrado con
// confirmación.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import type { Resultado } from "@/lib/collection/ejecutar";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton } from "../ui";
import { IndicadorGuardado, type EstadoGuardado } from "../biblioteca/DetalleMedio";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hoja lateral derecha, mismo estilo que el detalle de la biblioteca. */
export function Hoja({
  abierta,
  titulo,
  estado,
  onCerrar,
  children,
}: {
  abierta: boolean;
  titulo: string;
  estado: EstadoGuardado;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const { raiz } = useCollection();
  return (
    <Dialog.Root open={abierta} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {abierta && (
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
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col bg-col-surface shadow-[-24px_0_60px_-30px_rgba(50,55,59,0.45)] focus:outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <header className="flex h-16 shrink-0 items-center gap-3 border-b border-col-line px-5">
                  <Dialog.Title className="min-w-0 flex-1 truncate font-col-display text-[22px] font-normal text-col-ink">
                    {titulo}
                  </Dialog.Title>
                  <IndicadorGuardado estado={estado} />
                  <Dialog.Close
                    aria-label="Cerrar"
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Dialog.Close>
                </header>
                <div className="flex-1 overflow-y-auto">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/**
 * Guarda `valor` 900 ms después del último cambio, un pedido a la vez (si
 * cambió mientras guardaba, sale otro con lo último). `clave` identifica qué
 * se edita: al cambiar, arranca de cero sin guardar. `ya()` fuerza lo
 * pendiente, por ejemplo al cerrar la hoja.
 */
export function useGuardadoDiferido<T>(
  valor: T,
  clave: string | null,
  guardar: (v: T) => Promise<Resultado<null>>,
  activo: boolean,
) {
  const [estado, setEstado] = useState<EstadoGuardado>("quieto");
  const [error, setError] = useState<string | null>(null);
  const ultimo = useRef(valor);
  ultimo.current = valor;
  const guardado = useRef(valor);
  const claveRef = useRef(clave);
  if (claveRef.current !== clave) {
    claveRef.current = clave;
    guardado.current = valor;
  }
  const fn = useRef(guardar);
  fn.current = guardar;
  const enVuelo = useRef(false);
  const timer = useRef<number>();

  const ya = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (enVuelo.current || ultimo.current === guardado.current) return;
    enVuelo.current = true;
    const foto = ultimo.current;
    setEstado("guardando");
    const r = await fn.current(foto);
    enVuelo.current = false;
    // Con error tampoco reintenta solo: el próximo cambio vuelve a probar.
    guardado.current = foto;
    setError(r.ok ? null : r.error);
    if (ultimo.current !== foto) return ya();
    setEstado(r.ok ? "guardado" : "error");
  }, []);

  useEffect(() => {
    setEstado("quieto");
    setError(null);
  }, [clave]);

  useEffect(() => {
    if (!activo || valor === guardado.current) return;
    timer.current = window.setTimeout(() => void ya(), 900);
    return () => window.clearTimeout(timer.current);
  }, [valor, activo, ya]);

  return { estado, error, ya };
}

/** "Nuevo …": el botón se abre en un campo para el nombre y crea con Enter. */
export function NuevoEnLinea({
  etiqueta,
  placeholder,
  onCrear,
}: {
  etiqueta: string;
  placeholder: string;
  onCrear: (nombre: string) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);

  const crear = async () => {
    const t = nombre.trim();
    if (!t || creando) return;
    setCreando(true);
    const ok = await onCrear(t);
    setCreando(false);
    if (ok) {
      setNombre("");
      setAbierto(false);
    }
  };

  if (!abierto) {
    return (
      <Boton onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        {etiqueta}
      </Boton>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void crear();
      }}
      className="flex items-center gap-3"
    >
      <input
        autoFocus
        aria-label={placeholder}
        value={nombre}
        maxLength={80}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        placeholder={placeholder}
        className="h-12 w-60 border-0 border-b border-col-gold bg-transparent px-0 font-col-display text-[22px] text-col-ink placeholder:text-col-slate/50 focus:outline-none focus:ring-0"
      />
      <Boton type="submit" disabled={!nombre.trim() || creando}>
        {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
        Crear
      </Boton>
      <button
        type="button"
        aria-label="Cancelar"
        onClick={() => setAbierto(false)}
        className="flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </form>
  );
}

/** Eliminar con confirmación en línea. El error del servidor queda a la vista. */
export function ZonaEliminar({ texto, onEliminar }: { texto: string; onEliminar: () => Promise<string | null> }) {
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eliminar = async () => {
    setBorrando(true);
    const e = await onEliminar();
    setBorrando(false);
    setError(e);
    if (e) setConfirmar(false);
  };
  return (
    <section className="border-t border-col-line pt-8">
      <div className="flex flex-wrap items-center gap-3">
        {confirmar ? (
          <>
            <p className="mr-auto text-[14px] text-col-ink">{texto}</p>
            <Boton variante="fantasma" tam="sm" onClick={() => setConfirmar(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" tam="sm" onClick={() => void eliminar()} disabled={borrando}>
              {borrando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
              Sí, eliminar
            </Boton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirmar(true);
            }}
            className="flex h-9 items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-col-slate transition-colors duration-200 ease-col hover:text-col-alerta"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} /> Eliminar
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-col-alerta">
          {error}
        </p>
      )}
    </section>
  );
}

/** Botones de filtro en mayúscula con su conteo (como en Experiencias). */
export function ChipFiltro({
  activo,
  n,
  onClick,
  children,
}: {
  activo: boolean;
  n?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-sm border px-4 text-[13px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col",
        activo ? "border-col-ink bg-col-ink text-col-base" : "border-col-line text-col-slate hover:border-col-slate/50 hover:text-col-ink",
      )}
    >
      {children}
      {!!n && <span className={cn("text-[11px] tabular-nums lining-nums", activo ? "text-col-gold" : "text-col-slate/60")}>{n}</span>}
    </button>
  );
}

/** Color estable por texto, para portadas y retratos que todavía no tienen foto. */
const TONOS = ["#3E7C86", "#8A6B52", "#C9A57A", "#2F6E73", "#B79C78", "#6E7F62", "#5D7F8C", "#8F6F5A"];
export function tonoDe(texto: string) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[h % TONOS.length];
}

/** Dibuja `children` a `ancho` px y lo escala para que entre en el contenedor. */
export function Escalado({ ancho, children }: { ancho: number; children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const interior = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ escala: 0.5, alto: 0 });
  useEffect(() => {
    const medir = () => {
      const escala = (caja.current?.clientWidth ?? ancho) / ancho;
      setMedidas({ escala, alto: (interior.current?.offsetHeight ?? 0) * escala });
    };
    const ro = new ResizeObserver(medir);
    if (caja.current) ro.observe(caja.current);
    if (interior.current) ro.observe(interior.current);
    return () => ro.disconnect();
  }, [ancho]);
  return (
    <div ref={caja} className="overflow-hidden rounded-sm" style={{ height: medidas.alto || undefined }}>
      <div ref={interior} style={{ width: ancho, transform: `scale(${medidas.escala})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
