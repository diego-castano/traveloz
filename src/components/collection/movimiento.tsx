"use client";

// Microanimaciones de Collection en un solo lugar. Todo pasa por motion, así
// que MotionConfig reducedMotion="user" (en el shell) las apaga solas cuando
// el sistema pide menos movimiento.

import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Resorte blando para hojas y paneles grandes. */
export const resorteHoja = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;
/** Resorte corto para piezas chicas: chips, avisos, reordenar. */
export const resorteSuave = { type: "spring", stiffness: 440, damping: 36, mass: 0.8 } as const;

export const transiciones = {
  /** Hoja lateral derecha. */
  hoja: {
    initial: { x: "100%" },
    animate: { x: 0, transition: resorteHoja },
    exit: { x: "100%", transition: { duration: 0.3, ease: EASE } },
  },
  /** Velo detrás de hojas y diálogos. */
  velo: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  /** Diálogo centrado. */
  dialogo: {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: resorteSuave },
    exit: { opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.18, ease: EASE } },
  },
  /** Aviso (toast) y paneles flotantes que entran desde abajo. */
  aviso: {
    initial: { opacity: 0, y: 18, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1, transition: resorteSuave },
    exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.2, ease: EASE } },
  },
  /** Pieza chica que aparece en su lugar (chips, insignias). */
  pop: {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1, transition: resorteSuave },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: EASE } },
  },
};

/** Fade-up escalonado para ítems de listas y grillas. Va con `layout` para sumar, quitar y reordenar. */
export function subeItem(i = 0) {
  return {
    layout: true as const,
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.18, ease: EASE } },
    transition: { duration: 0.4, ease: EASE, delay: Math.min(i, 10) * 0.035, layout: resorteSuave },
  };
}

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
        transition={{ duration: 0.35, ease: EASE }}
      />
      <motion.path
        d="M5 8.4 7.1 10.4 11 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}
      />
    </svg>
  );
}
