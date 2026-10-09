"use client";

// Avisos breves (toasts) con la estética de Collection: abajo a la derecha,
// con cerrar, pausa al pasar el mouse y una acción opcional ("Deshacer").
// Los errores van a una región assertive; el resto, a una polite.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { CheckAnimado, transiciones } from "../movimiento";

type TipoAviso = "ok" | "error";

export interface OpcionesAviso {
  accion?: { texto: string; alHacer: () => void };
  /** Milisegundos a la vista. Por defecto 5 s (errores, 7 s). */
  duracion?: number;
  /** Se llama una vez cuando el aviso se va sin que hayan tocado la acción. */
  alVencer?: () => void;
}

interface Aviso extends OpcionesAviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

type Avisar = (texto: string, tipo?: TipoAviso, opciones?: OpcionesAviso) => void;

const AvisosContext = createContext<Avisar>(() => {});

export const useAviso = () => useContext(AvisosContext);

/** Los mensajes crudos del servidor (sesión, permisos) nunca llegan tal cual a la pantalla. */
export function errorAmigable(texto: string) {
  if (/^no autorizado/i.test(texto)) return "Tu sesión venció. Volvé a entrar para seguir.";
  if (/^acceso restringido/i.test(texto)) return "Esto solo lo puede hacer un administrador.";
  if (/^tu rol no tiene permisos/i.test(texto)) return "No tenés permiso para editar esto.";
  return texto;
}

/**
 * Cambio con "Deshacer" para lo que toca el sitio público. Dos estrategias:
 *
 * - Diferida (`confirmar`): `aplicar` cambia la pantalla al toque y el
 *   servidor recién se entera cuando el aviso vence (6 s). "Deshacer" no
 *   llama a nadie. Para borrados, que no tienen vuelta atrás en el servidor.
 *   Si el servidor rechaza, `confirmar` vuelve atrás y avisa.
 * - Inversa (sin `confirmar`): `aplicar` ya guardó; "Deshacer" llama a la
 *   acción contraria. Para publicar y ocultar.
 *
 * Lo pendiente se confirma igual si se cierra la pestaña o el aviso.
 */
export function useDeshacer() {
  const avisar = useAviso();
  return useCallback(
    async (o: { mensaje: string; aplicar: () => unknown; deshacer: () => void; confirmar?: () => void }) => {
      // Si `aplicar` devuelve false (el servidor dijo que no), no hay nada que deshacer.
      if ((await o.aplicar()) === false) return;
      avisar(o.mensaje, "ok", { accion: { texto: "Deshacer", alHacer: o.deshacer }, duracion: 6000, alVencer: o.confirmar });
    },
    [avisar],
  );
}

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const n = useRef(0);
  const pendientes = useRef(new Map<number, () => void>());

  const quitar = useCallback((id: number, vence: boolean) => {
    const fn = pendientes.current.get(id);
    pendientes.current.delete(id);
    if (vence) fn?.();
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);

  const avisar = useCallback<Avisar>((texto, tipo = "ok", opciones = {}) => {
    const id = ++n.current;
    if (tipo === "error") texto = errorAmigable(texto);
    if (opciones.alVencer) pendientes.current.set(id, opciones.alVencer);
    setAvisos((a) => {
      // Entran hasta tres; el más viejo se va (y si tenía algo pendiente, se confirma).
      const fuera = a.length >= 3 ? a[0] : null;
      if (fuera) window.setTimeout(() => quitar(fuera.id, true));
      return [...(fuera ? a.slice(1) : a), { id, texto, tipo, ...opciones }];
    });
  }, [quitar]);

  // Si se cierra la pestaña con un borrado esperando, se manda igual.
  useEffect(() => {
    const vaciar = () => {
      pendientes.current.forEach((fn) => fn());
      pendientes.current.clear();
    };
    window.addEventListener("pagehide", vaciar);
    return () => window.removeEventListener("pagehide", vaciar);
  }, []);

  const lista = (tipo: TipoAviso) =>
    avisos.filter((a) => a.tipo === tipo).map((a) => <Tostada key={a.id} a={a} onIrse={(vence) => quitar(a.id, vence)} />);

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col items-end gap-2 md:right-6">
        <div aria-live="assertive" role="alert" className="contents">
          <AnimatePresence initial={false}>{lista("error")}</AnimatePresence>
        </div>
        <div aria-live="polite" role="status" className="contents">
          <AnimatePresence initial={false}>{lista("ok")}</AnimatePresence>
        </div>
      </div>
    </AvisosContext.Provider>
  );
}

function Tostada({ a, onIrse }: { a: Aviso; onIrse: (vence: boolean) => void }) {
  const [pausa, setPausa] = useState(false);
  const resta = useRef(a.duracion ?? (a.tipo === "error" ? 7000 : 5000));
  const irse = useRef(onIrse);
  irse.current = onIrse;

  // El reloj se frena con el mouse o el foco encima y sigue desde donde quedó.
  useEffect(() => {
    if (pausa) return;
    const desde = Date.now();
    const t = window.setTimeout(() => irse.current(true), resta.current);
    return () => {
      window.clearTimeout(t);
      resta.current -= Date.now() - desde;
    };
  }, [pausa]);

  return (
    <motion.div
      layout
      {...transiciones.aviso}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-col bg-col-noche py-2 pl-4 pr-2 text-col-md text-white shadow-col-3 ring-1 ring-white/10"
    >
      {a.tipo === "ok" ? (
        <CheckAnimado className="h-4 w-4 shrink-0 text-col-gold" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-[#E9A08F]" strokeWidth={1.75} aria-hidden />
      )}
      <span className="min-w-0 flex-1 py-1.5">{a.texto}</span>
      {a.accion && (
        <button
          type="button"
          onClick={() => {
            a.accion!.alHacer();
            onIrse(false);
          }}
          className="h-9 shrink-0 rounded-col px-3 text-col-md font-medium text-col-gold transition-colors duration-col ease-col hover:bg-white/10"
        >
          {a.accion.texto}
        </button>
      )}
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => onIrse(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-col text-white/70 transition-colors duration-col ease-col hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
    </motion.div>
  );
}
