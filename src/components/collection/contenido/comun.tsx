"use client";

// Piezas que comparten los módulos de contenido (Destinos, Especialistas,
// Aliados, Testimonios y Preguntas): la hoja lateral de edición,
// el guardado automático, el alta con nombre en línea y el borrado con
// confirmación.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import type { useSortable } from "@dnd-kit/sortable";
import { GripVertical, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import type { Resultado } from "@/lib/collection/ejecutar";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, BotonIcono, Entrada } from "../ui";
import { EASE, transiciones } from "../movimiento";
import { IndicadorGuardado, type EstadoGuardado } from "../biblioteca/DetalleMedio";
import { errorAmigable } from "../shell/Avisos";

/**
 * Asa para mover una tarjeta de grilla. Lleva los listeners de dnd-kit (mouse,
 * toque y teclado: Espacio levanta, flechas mueven, Espacio suelta), así la
 * tarjeta queda libre para abrirse con clic, Enter o Espacio. Se ve al pasar
 * el mouse o al enfocarla, y siempre en pantallas táctiles.
 */
export function AsaTarjeta({
  nombre,
  orden,
  className,
}: {
  nombre: string;
  orden: Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">;
  className?: string;
}) {
  return (
    <button
      type="button"
      ref={orden.setActivatorNodeRef}
      {...orden.attributes}
      {...orden.listeners}
      aria-label={`Mover ${nombre}`}
      title="Arrastrá para cambiar el orden"
      className={cn(
        "absolute right-3 top-3 z-10 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-col bg-col-surface/95 text-col-slate opacity-0 shadow-col-1 backdrop-blur-sm transition-opacity duration-col ease-col hover:text-col-ink focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        className,
      )}
    >
      <GripVertical className="h-4 w-4" strokeWidth={1.5} aria-hidden />
    </button>
  );
}

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
              <motion.div className="fixed inset-0 z-50 bg-col-ink/35 backdrop-blur-[1px]" {...transiciones.velo} />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // El foco va al panel y no al primer botón, así no se abre su globo.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.target as HTMLElement | null)?.focus();
              }}
            >
              <motion.div
                className="col-anillo fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col bg-col-surface shadow-col-3 focus:outline-none"
                {...transiciones.hoja}
              >
                <header className="flex h-16 shrink-0 items-center gap-3 border-b border-col-line pl-6 pr-3">
                  <Dialog.Title className="min-w-0 flex-1 truncate font-col-display text-col-xl font-normal text-col-ink">
                    {titulo}
                  </Dialog.Title>
                  <IndicadorGuardado estado={estado} />
                  <Dialog.Close asChild>
                    <BotonIcono etiqueta="Cerrar" lado="left">
                      <X strokeWidth={1.5} />
                    </BotonIcono>
                  </Dialog.Close>
                </header>
                <motion.div
                  className="flex-1 overflow-y-auto"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.12 }}
                >
                  {children}
                </motion.div>
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
    setError(r.ok ? null : errorAmigable(r.error));
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

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {!abierto ? (
        <motion.div key="b" {...transiciones.pop}>
          <Boton onClick={() => setAbierto(true)}>
            <Plus strokeWidth={1.5} />
            {etiqueta}
          </Boton>
        </motion.div>
      ) : (
        <motion.form
          key="f"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.25, ease: EASE }}
          onSubmit={(e) => {
            e.preventDefault();
            void crear();
          }}
          className="flex max-w-full flex-wrap items-center gap-2"
        >
          <Entrada
            autoFocus
            aria-label={placeholder}
            value={nombre}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
            placeholder={placeholder}
            className="min-h-10 w-64 max-w-full py-[7px]"
          />
          <Boton type="submit" disabled={!nombre.trim()} cargando={creando}>
            {!creando && <Plus strokeWidth={1.5} />}
            Crear
          </Boton>
          <BotonIcono etiqueta="Cancelar" onClick={() => setAbierto(false)}>
            <X strokeWidth={1.5} />
          </BotonIcono>
        </motion.form>
      )}
    </AnimatePresence>
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
    setError(e && errorAmigable(e));
    if (e) setConfirmar(false);
  };
  return (
    <section className="border-t border-col-line pt-8">
      <div className="flex flex-wrap items-center gap-3">
        {confirmar ? (
          <>
            <p className="mr-auto text-col-md text-col-ink">{texto}</p>
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
            className="flex h-9 items-center gap-2 text-col-sm font-medium text-col-slate transition-colors duration-col ease-col hover:text-col-alerta"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} /> Eliminar
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-col-sm text-col-alerta">
          {error}
        </p>
      )}
    </section>
  );
}

/** Vuelve a poner `x` en la posición `i` (para deshacer un borrado). */
export function reponer<T extends { id: string }>(lista: T[], i: number, x: T) {
  if (lista.some((y) => y.id === x.id)) return lista;
  return [...lista.slice(0, i), x, ...lista.slice(i)];
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
    <div ref={caja} className="overflow-hidden rounded-col-sm" style={{ height: medidas.alto || undefined }}>
      <div ref={interior} style={{ width: ancho, transform: `scale(${medidas.escala})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
