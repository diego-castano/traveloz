"use client";

// Avisos breves (toasts) con la estética de Collection.

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";

type TipoAviso = "ok" | "error";
interface Aviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

const AvisosContext = createContext<(texto: string, tipo?: TipoAviso) => void>(() => {});

export const useAviso = () => useContext(AvisosContext);

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const n = useRef(0);

  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const avisar = useCallback(
    (texto: string, tipo: TipoAviso = "ok") => {
      const id = ++n.current;
      setAvisos((a) => [...a.slice(-2), { id, texto, tipo }]);
      window.setTimeout(() => quitar(id), tipo === "error" ? 6000 : 3500);
    },
    [quitar],
  );

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {avisos.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded bg-col-ink px-4 py-3 text-sm text-col-base shadow-[0_12px_32px_-12px_rgba(50,55,59,0.45)]"
            >
              {a.tipo === "ok" ? (
                <Check className="h-4 w-4 shrink-0 text-col-gold" strokeWidth={1.75} aria-hidden />
              ) : (
                <X className="h-4 w-4 shrink-0 text-[#E9A08F]" strokeWidth={1.75} aria-hidden />
              )}
              <span>{a.texto}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AvisosContext.Provider>
  );
}
