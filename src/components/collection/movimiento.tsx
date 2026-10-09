"use client";

// Microanimaciones de Collection en un solo lugar. Todo pasa por motion, así
// que MotionConfig reducedMotion="user" (en el shell) apaga solas las
// transformaciones cuando el sistema pide menos movimiento. Lo que motion no
// cubre (desenfoques, conteos, sacudidas) lo frena useReducedMotion acá.
//
// Una sola escala: las mismas cifras viven como variables CSS en
// collection.css y como duraciones en tailwind.config.ts.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, spring, useReducedMotion } from "motion/react";
import { cn } from "@/components/lib/cn";

// ── Escala ────────────────────────────────────────────────────────────────

/** Duraciones en segundos (motion). En CSS: --col-dur-*. */
export const DUR = {
  /** Desfase por ítem de una lista. */
  stagger: 0.04,
  /** Demora de intención (globos), tramo de sacudida, trazo del tilde. */
  micro: 0.08,
  /** Cierre de diálogos y desplegables, cambio de texto, globo. */
  quick: 0.15,
  /** Apertura de diálogos y desplegables, pestañas, paso a paso, acordeón. */
  fast: 0.25,
  /** Cierre de paneles y avisos. */
  medium: 0.35,
  /** Apertura de paneles, entrada de grillas. */
  slow: 0.4,
  /** Momentos de énfasis: insignias, conteos, tilde de logro. */
  verySlow: 0.5,
} as const;

export const CURVA = {
  /** La curva por defecto: abrir, cerrar, deslizar, reacomodar. */
  smoothOut: [0.22, 1, 0.36, 1],
  /** Solo entradas chicas (insignias, chips). Nunca en un cierre. */
  bounce: [0.34, 1.36, 0.64, 1],
  bounceStrong: [0.34, 3.85, 0.64, 1],
} as const;

/** Recorridos en px. */
export const DIST = { micro: 4, small: 6, base: 8, medium: 12 } as const;

/** Escalas de partida (siempre terminan en 1). */
export const ESCALA = { modal: 0.96, dropdown: 0.97, tooltip: 0.98, dropdownClose: 0.99, pop: 0.92 } as const;

/** Desenfoques de partida en px (siempre terminan en 0). */
export const BLUR = { small: 2, medium: 3, large: 8 } as const;

/** Alias histórico de la curva por defecto. */
export const EASE = CURVA.smoothOut;

export const desenfoque = (px: number) => `blur(${px}px)`;


/** Al soltar un arrastre, la tarjeta se asienta con este resorte. */
export const resorteSoltar = { type: "spring", stiffness: 380, damping: 30 } as const;

/** El mismo resorte pasado a CSS (duración + linear()) para dnd-kit. */
const resorteCss = String(spring({ keyframes: [0, 1], stiffness: resorteSoltar.stiffness, damping: resorteSoltar.damping }));
export const TRANSICION_SOLTAR = {
  duration: parseInt(resorteCss, 10),
  easing: resorteCss.slice(resorteCss.indexOf(" ") + 1),
};

/** Reacomodo de ítems que se quedan (filtrar, sumar, quitar). */
const deslizar = { duration: DUR.fast, ease: CURVA.smoothOut };

// ── Presets ───────────────────────────────────────────────────────────────

export const transiciones = {
  /** Hoja lateral derecha: abre en 400, cierra en 350. */
  hoja: {
    initial: { x: "100%" },
    animate: { x: 0, transition: { duration: DUR.slow, ease: CURVA.smoothOut } },
    exit: { x: "100%", transition: { duration: DUR.medium, ease: CURVA.smoothOut } },
  },
  /** Velo detrás de hojas y diálogos. */
  velo: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: DUR.fast, ease: CURVA.smoothOut } },
    exit: { opacity: 0, transition: { duration: DUR.quick, ease: CURVA.smoothOut } },
  },
  /** Diálogo centrado: abre en 250 desde 0.96, cierra en 150 hacia 0.99. */
  dialogo: {
    initial: { opacity: 0, scale: ESCALA.modal },
    animate: { opacity: 1, scale: 1, transition: { duration: DUR.fast, ease: CURVA.smoothOut } },
    exit: { opacity: 0, scale: ESCALA.dropdownClose, transition: { duration: DUR.quick, ease: CURVA.smoothOut } },
  },
  /** Aviso (toast) y paneles flotantes que entran desde abajo. */
  aviso: {
    initial: { opacity: 0, y: DIST.medium, scale: ESCALA.modal },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.slow, ease: CURVA.smoothOut } },
    exit: { opacity: 0, y: DIST.base, transition: { duration: DUR.medium, ease: CURVA.smoothOut } },
  },
  /** Pieza chica que aparece en su lugar (chips, insignias): entra con rebote, sale sin. */
  pop: {
    initial: { opacity: 0, scale: ESCALA.pop },
    animate: { opacity: 1, scale: 1, transition: { duration: DUR.fast, ease: CURVA.bounce } },
    exit: { opacity: 0, scale: ESCALA.modal, transition: { duration: DUR.quick, ease: CURVA.smoothOut } },
  },
  /** Acordeón: alto y opacidad, 250 en los dos sentidos. */
  acordeon: {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: DUR.fast, ease: CURVA.smoothOut },
  },
};

/**
 * Entrada de grillas y listas. Solo la primera vez que la lista tiene ítems:
 * sube 8 px desenfocada en 400, con 40 ms entre los seis primeros (el resto
 * entra junto, total 240 ms). Después, filtrar o sumar no vuelve a escalonar:
 * los que quedan se deslizan, los nuevos aparecen y los que se van se achican.
 * `atenuado` baja la opacidad mientras se arrastra otro ítem.
 */
export function useEntradaLista(hayItems = true) {
  const primera = useRef(true);
  const reducido = useReducedMotion();
  useEffect(() => {
    if (hayItems) primera.current = false;
  }, [hayItems]);
  const esPrimera = primera.current;
  return (i: number, atenuado = false) => {
    const opacidad = atenuado ? 0.6 : 1;
    if (reducido) {
      return {
        layout: true as const,
        initial: esPrimera ? { opacity: 0 } : false,
        animate: { opacity: opacidad },
        exit: { opacity: 0, transition: { duration: DUR.quick } },
        transition: { duration: DUR.fast },
      };
    }
    return {
      layout: true as const,
      initial: esPrimera ? { opacity: 0, y: DIST.base, filter: desenfoque(BLUR.small) } : { opacity: 0 },
      animate: { opacity: opacidad, y: 0, filter: desenfoque(0), transitionEnd: { filter: "none" } },
      exit: { opacity: 0, scale: ESCALA.modal, transition: { duration: DUR.quick, ease: CURVA.smoothOut } },
      transition: esPrimera
        ? { duration: DUR.slow, ease: CURVA.smoothOut, delay: Math.min(i, 6) * DUR.stagger, layout: deslizar }
        : { duration: DUR.fast, ease: CURVA.smoothOut, layout: deslizar },
    };
  };
}

/**
 * Cambio de paso con dirección: adelante entra por la derecha, atrás por la
 * izquierda (8 px, desenfoque 3 px, 250; sale en 150). Va como variants con
 * `custom={dir}` en el hijo y en AnimatePresence; dir 0 = menos movimiento,
 * solo opacidad.
 */
export const pasoConDireccion = {
  entra: (dir: number) => (dir ? { opacity: 0, x: DIST.base * dir, filter: desenfoque(BLUR.medium) } : { opacity: 0 }),
  queda: (dir: number) =>
    dir
      ? {
          opacity: 1,
          x: 0,
          filter: desenfoque(0),
          transition: { duration: DUR.fast, ease: CURVA.smoothOut },
          transitionEnd: { filter: "none" },
        }
      : { opacity: 1, transition: { duration: DUR.fast } },
  sale: (dir: number) => ({
    opacity: 0,
    ...(dir ? { x: -DIST.base * dir, filter: desenfoque(BLUR.medium) } : {}),
    transition: { duration: DUR.quick, ease: CURVA.smoothOut },
  }),
};

/** 1 si el índice avanzó, -1 si volvió; se mantiene hasta el próximo cambio. */
export function useDireccion(indice: number) {
  const previo = useRef(indice);
  const dir = useRef(1);
  if (indice !== previo.current) {
    dir.current = indice > previo.current ? 1 : -1;
    previo.current = indice;
  }
  return dir.current;
}

// ── Piezas ────────────────────────────────────────────────────────────────

/**
 * Cambio de texto en su lugar ("Guardando…" → "Guardado"): el viejo sube y se
 * va, el nuevo sube desde 4 px desenfocado, 150 ms. Para hijos con key dentro
 * de AnimatePresence mode="wait" o "popLayout".
 */
export function useCambioTexto() {
  const reducido = useReducedMotion();
  if (reducido) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: DUR.quick } };
  }
  return {
    initial: { opacity: 0, y: DIST.micro, filter: desenfoque(BLUR.small) },
    animate: { opacity: 1, y: 0, filter: desenfoque(0), transitionEnd: { filter: "none" } },
    exit: { opacity: 0, y: -DIST.micro, filter: desenfoque(BLUR.small) },
    transition: { duration: DUR.quick, ease: "easeInOut" as const },
  };
}

/** Texto que cambia en su lugar (por ejemplo "Borrador" → "Publicada"). */
export function TextoCambiante({ texto, className }: { texto: React.ReactNode; className?: string }) {
  const cambio = useCambioTexto();
  const clave = typeof texto === "string" || typeof texto === "number" ? String(texto) : undefined;
  return (
    <span className={cn("relative inline-flex min-w-0 max-w-full", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={clave} className="block truncate" {...cambio}>
          {texto}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const useLayoutSeguro = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Número que cuenta de 0 al valor al montar (500 ms) y, cuando cambia, entra
 * con un pop desenfocado. Con menos movimiento muestra el valor final.
 */
export function Numero({ valor, formato = String, className }: { valor: number; formato?: (n: number) => string; className?: string }) {
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState(0);
  const [clave, setClave] = useState(0);
  const previo = useRef<number | null>(null);

  useLayoutSeguro(() => {
    const antes = previo.current;
    previo.current = valor;
    if (antes !== null && antes !== valor) {
      setMostrado(valor);
      if (!reducido) setClave((k) => k + 1);
      return;
    }
    // Primera vez (o la segunda pasada de StrictMode): cuenta desde 0.
    if (reducido || valor === 0) {
      setMostrado(valor);
      return;
    }
    const a = animate(0, valor, { duration: DUR.verySlow, ease: "easeOut", onUpdate: (v) => setMostrado(Math.round(v)) });
    return () => a.stop();
  }, [valor, reducido]);

  return (
    <span className={cn("relative inline-flex tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={clave}
          className="inline-block"
          initial={{ opacity: 0, y: DIST.base, filter: desenfoque(BLUR.small) }}
          animate={{ opacity: 1, y: 0, filter: desenfoque(0), transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0, transition: { duration: DUR.quick } }}
          transition={{ duration: DUR.fast, ease: CURVA.bounce }}
        >
          {formato(mostrado)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Aparición de insignias (conteo de consultas): rebote en 500. */
export const insignia = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: { duration: DUR.verySlow, ease: CURVA.bounce } },
  exit: { opacity: 0, scale: ESCALA.modal, transition: { duration: DUR.quick, ease: CURVA.smoothOut } },
};

/** Tilde que se dibuja: para "Guardado" y subidas listas. */
export function CheckAnimado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("h-3.5 w-3.5", className)}>
      <motion.circle
        cx="8"
        cy="8"
        r="7"
        stroke="currentColor"
        strokeWidth="1.25"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.35 }}
        transition={{ duration: DUR.medium, ease: CURVA.smoothOut }}
      />
      <motion.path
        d="M5 8.4 7.1 10.4 11 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: DUR.fast, ease: CURVA.smoothOut, delay: DUR.micro }}
      />
    </svg>
  );
}

/**
 * Tilde de logro (paso completo, publicada): aparece en 500 desde un
 * desenfoque de 8 px y el trazo se dibuja 80 ms después.
 */
export function CheckExito({ className, fondo = true }: { className?: string; fondo?: boolean }) {
  const reducido = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("h-4 w-4 overflow-visible", className)}
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: ESCALA.modal, filter: desenfoque(BLUR.large) }}
      animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, filter: desenfoque(0), transitionEnd: { filter: "none" } }}
      transition={{ duration: DUR.verySlow, ease: CURVA.smoothOut }}
    >
      {fondo && <circle cx="8" cy="8" r="7.25" fill="currentColor" />}
      <motion.path
        d="M5 8.4 7.1 10.4 11 6"
        stroke={fondo ? "#fff" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reducido ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: DUR.verySlow, ease: CURVA.smoothOut, delay: DUR.micro }}
      />
    </motion.svg>
  );
}

/**
 * Momento de logro: true durante `ms` cuando `activo` pasa de false a true
 * (por ejemplo, el estado llega a "Publicada"). Al montar ya activo, no festeja.
 */
export function useLogro(activo: boolean, ms = 2400) {
  const [festejo, setFestejo] = useState(false);
  const previo = useRef(activo);
  useEffect(() => {
    const antes = previo.current;
    previo.current = activo;
    if (!activo || antes) return;
    setFestejo(true);
    const t = window.setTimeout(() => setFestejo(false), ms);
    return () => window.clearTimeout(t);
  }, [activo, ms]);
  return festejo;
}

/**
 * Sacude un campo o sección cuando algo bloquea guardar o publicar (seis
 * tramos de 80 ms, 8 y 6 px). Con menos movimiento, collection.css lo cambia
 * por un pulso de color. El mensaje lo pone quien llama.
 */
export function sacudir(el: Element | null | undefined) {
  if (!el) return;
  el.classList.remove("col-sacudir");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("col-sacudir");
  el.addEventListener("animationend", () => el.classList.remove("col-sacudir"), { once: true });
}
