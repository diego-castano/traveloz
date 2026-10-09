"use client";

// Panel flotante con la cola de subidas (abajo a la derecha): avance total
// arriba, cada archivo con su miniatura y anillo, y un resumen al terminar.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Film, RotateCw, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { CheckAnimado, EASE, transiciones } from "../movimiento";
import { ProgresoCircular, textoEstado } from "./ZonaSubida";
import { errorAmigable } from "../shell/Avisos";
import { esDeSesion, esReintentable, type Subida } from "./useSubidas";

export function ColaSubidas({
  subidas,
  onReintentar,
  onReintentarTodo,
  onLimpiar,
}: {
  subidas: Subida[];
  onReintentar: (id: string) => void;
  onReintentarTodo: () => void;
  onLimpiar: () => void;
}) {
  const [plegada, setPlegada] = useState(false);
  const enCurso = subidas.filter((s) => s.estado !== "listo" && s.estado !== "error").length;
  const errores = subidas.filter((s) => s.estado === "error").length;
  const listas = subidas.filter((s) => s.estado === "listo").length;
  const reintentables = subidas.filter(esReintentable).length;
  const total = subidas.length;
  const avance = total
    ? subidas.reduce((a, s) => a + (s.estado === "listo" || s.estado === "error" ? 100 : s.progreso * 0.9), 0) / total
    : 0;

  const titulo =
    enCurso > 0
      ? `Subiendo ${Math.min(listas + errores + 1, total)} de ${total}`
      : errores > 0
        ? `${errores} ${errores === 1 ? "archivo" : "archivos"} con error`
        : "Listo";
  const detalle =
    enCurso > 0
      ? `${Math.round(avance)} % del total`
      : `${listas} ${listas === 1 ? "medio subido" : "medios subidos"}${errores ? `, ${errores} sin subir` : ""}`;

  return (
    <AnimatePresence>
      {total > 0 && (
        <motion.section
          aria-label="Subidas"
          {...transiciones.aviso}
          className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md bg-col-surface shadow-col-3 ring-1 ring-col-line"
        >
          <div className="relative flex h-14 items-center gap-3 pl-3.5 pr-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-col-ink">
              {enCurso > 0 ? (
                <ProgresoCircular valor={avance} tam={30} />
              ) : errores > 0 ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-col-alerta/10 text-col-sm text-col-alerta">!</span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-col-gold text-col-noche">
                  <CheckAnimado className="h-4 w-4" />
                </span>
              )}
            </span>
            <p className="min-w-0 flex-1" aria-live="polite">
              <span className="block truncate text-col-md text-col-ink">{titulo}</span>
              <span className="block truncate text-col-xs text-col-slate">{detalle}</span>
            </p>
            {reintentables > 1 && (
              <button
                type="button"
                onClick={onReintentarTodo}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-col px-2 text-col-sm font-medium text-col-ink transition-colors hover:bg-col-base"
              >
                <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Reintentar todo
              </button>
            )}
            <button
              type="button"
              onClick={() => setPlegada((p) => !p)}
              aria-label={plegada ? "Mostrar subidas" : "Ocultar subidas"}
              aria-expanded={!plegada}
              className="flex h-8 w-8 items-center justify-center rounded-col text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-col ease-col", plegada && "rotate-180")} strokeWidth={1.5} />
            </button>
            {enCurso === 0 && (
              <button
                type="button"
                onClick={onLimpiar}
                aria-label="Cerrar panel de subidas"
                className="flex h-8 w-8 items-center justify-center rounded-col text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-col-line">
              <span
                className={cn("block h-full transition-[width] duration-col-lento ease-col", errores && !enCurso ? "bg-col-alerta/50" : "bg-col-gold")}
                style={{ width: `${avance}%` }}
              />
            </span>
          </div>
          <AnimatePresence initial={false}>
            {!plegada && (
              <motion.ul
                key="lista"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="max-h-[320px] overflow-y-auto"
              >
                <AnimatePresence initial={false}>
                  {subidas.map((s) => (
                    <motion.li
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="flex items-center gap-3 px-3.5 py-2.5"
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-col bg-col-base">
                        {s.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.preview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Film className="m-auto h-full w-4 text-col-slate" strokeWidth={1.5} aria-hidden />
                        )}
                        {(s.estado === "subiendo" || s.estado === "procesando" || s.estado === "espera") && (
                          <span className="absolute inset-0 flex items-center justify-center bg-col-noche/45 text-white">
                            <ProgresoCircular valor={s.estado === "subiendo" ? s.progreso : s.estado === "espera" ? 0 : undefined} tam={26} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-col-sm text-col-ink">{s.file.name}</span>
                        {/* El motivo del error en hasta dos renglones; completo en el globo. */}
                        <span
                          className={cn("block text-col-xs leading-snug", s.estado === "error" ? "line-clamp-2 text-col-alerta" : "truncate text-col-slate")}
                          title={s.error && errorAmigable(s.error)}
                        >
                          {textoEstado(s)}
                        </span>
                      </span>
                      {s.estado === "listo" && <CheckAnimado className="h-4 w-4 shrink-0 text-col-ok" />}
                      {s.estado === "error" && esDeSesion(s) && (
                        <a
                          href="/backend/login"
                          className="flex h-8 shrink-0 items-center rounded-col px-2 text-col-md font-medium text-col-ink underline decoration-col-gold underline-offset-4"
                        >
                          Volvé a entrar
                        </a>
                      )}
                      {esReintentable(s) && (
                        <button
                          type="button"
                          onClick={() => onReintentar(s.id)}
                          aria-label={`Reintentar ${s.file.name}`}
                          className="flex h-8 shrink-0 items-center gap-1.5 rounded-col px-2 text-col-md font-medium text-col-ink transition-colors hover:bg-col-base"
                        >
                          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          Reintentar
                        </button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
