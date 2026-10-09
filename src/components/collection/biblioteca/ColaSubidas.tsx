"use client";

// Panel flotante con la cola de subidas (abajo a la derecha).

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Film, LoaderCircle, RotateCw, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import type { Subida } from "./useSubidas";

export function ColaSubidas({
  subidas,
  onReintentar,
  onLimpiar,
}: {
  subidas: Subida[];
  onReintentar: (id: string) => void;
  onLimpiar: () => void;
}) {
  const [plegada, setPlegada] = useState(false);
  const enCurso = subidas.filter((s) => s.estado !== "listo" && s.estado !== "error").length;
  const errores = subidas.filter((s) => s.estado === "error").length;
  const listas = subidas.filter((s) => s.estado === "listo").length;
  const total = subidas.length;
  const avance = total ? subidas.reduce((a, s) => a + (s.estado === "listo" ? 100 : s.progreso * 0.9), 0) / total : 0;

  const titulo =
    enCurso > 0
      ? `Subiendo ${Math.min(listas + errores + 1, total)} de ${total}`
      : errores > 0
        ? `${errores} ${errores === 1 ? "archivo" : "archivos"} con error`
        : `${listas} ${listas === 1 ? "medio listo" : "medios listos"}`;

  return (
    <AnimatePresence>
      {total > 0 && (
        <motion.section
          aria-label="Subidas"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded bg-col-surface shadow-[0_24px_48px_-20px_rgba(50,55,59,0.4)] ring-1 ring-col-line"
        >
          <div className="relative flex h-12 items-center gap-2 border-b border-col-line pl-4 pr-2">
            <p className="flex-1 truncate text-[13px] uppercase tracking-[0.12em] text-col-ink" aria-live="polite">
              {titulo}
            </p>
            <button
              type="button"
              onClick={() => setPlegada((p) => !p)}
              aria-label={plegada ? "Mostrar subidas" : "Ocultar subidas"}
              aria-expanded={!plegada}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200 ease-col", plegada && "rotate-180")}
                strokeWidth={1.5}
              />
            </button>
            {enCurso === 0 && (
              <button
                type="button"
                onClick={onLimpiar}
                aria-label="Cerrar panel de subidas"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            {enCurso > 0 && (
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-px bg-col-gold transition-[width] duration-500 ease-col"
                style={{ width: `${avance}%` }}
              />
            )}
          </div>
          {!plegada && (
            <ul className="max-h-[320px] divide-y divide-col-line overflow-y-auto">
              {subidas.map((s) => (
                <li key={s.id} className="relative flex items-center gap-3 px-4 py-3">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-col-base">
                    {s.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Film className="m-auto h-full w-4 text-col-slate" strokeWidth={1.5} aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-col-ink">{s.file.name}</span>
                    <span
                      className={cn(
                        "block truncate text-[12px]",
                        s.estado === "error" ? "text-col-alerta" : "text-col-slate",
                      )}
                    >
                      {s.estado === "espera" && "En espera"}
                      {s.estado === "subiendo" && `${s.progreso} %`}
                      {s.estado === "procesando" && "Procesando"}
                      {s.estado === "listo" && "Listo"}
                      {s.estado === "error" && s.error}
                    </span>
                  </span>
                  {s.estado === "listo" && <Check className="h-4 w-4 text-col-gold" strokeWidth={2} aria-label="Listo" />}
                  {s.estado === "procesando" && (
                    <LoaderCircle className="h-4 w-4 animate-spin text-col-slate" strokeWidth={1.5} aria-hidden />
                  )}
                  {s.estado === "error" && (
                    <button
                      type="button"
                      onClick={() => onReintentar(s.id)}
                      className="flex h-8 items-center gap-1.5 rounded-sm px-2 text-[12px] uppercase tracking-[0.12em] text-col-ink hover:bg-col-base"
                    >
                      <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      Reintentar
                    </button>
                  )}
                  {s.estado === "subiendo" && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-0.5 bg-col-gold transition-[width] duration-200 ease-col"
                      style={{ width: `${s.progreso}%` }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
