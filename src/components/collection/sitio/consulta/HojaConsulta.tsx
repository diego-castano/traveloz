"use client";

// "Hablar con un especialista" desde una experiencia: hoja a la derecha en
// escritorio y desde abajo en el celular, con el formulario corto (propuesta
// 5.7) ya sabiendo de qué experiencia viene. Manda a la misma action y a la
// misma página de gracias que Contactanos.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { ArrowRight, LoaderCircle, RotateCcw, X } from "lucide-react";
import type { EspecialistaVista } from "@/lib/collection/experiencia/contenido";
import { boton } from "@/components/collection/ui";
import { fuenteDisplay, fuenteTexto } from "@/components/collection/shell/fuentes";
import { cn } from "@/components/lib/cn";
import { MedioImagen } from "../medios";
import {
  armarEnvio,
  Campo,
  CampoTelefono,
  CampoTrampa,
  Casilla,
  claseInput,
  Contador,
  DATOS_VACIOS,
  ErrorCampo,
  erroresContacto,
  etiqueta,
  InterruptorFechas,
  proximosMeses,
  SelectorCanal,
  type DatosConsulta,
  type ErroresConsulta,
} from "./campos";
import { useEnvios } from "./envios";

const EASE = [0.22, 1, 0.36, 1] as const;

function useEscritorio() {
  const [si, setSi] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const leer = () => setSi(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);
  return si;
}

export function HojaConsulta({
  abierta,
  onCerrar,
  experiencia,
}: {
  abierta: boolean;
  onCerrar: () => void;
  experiencia: { slug: string; titulo: string; especialista: EspecialistaVista | null };
}) {
  const escritorio = useEscritorio();
  const reducido = useReducedMotion();
  const fuera = reducido ? { opacity: 0 } : escritorio ? { x: "100%" } : { y: "100%" };
  const dentro = reducido ? { opacity: 1 } : escritorio ? { x: 0 } : { y: 0 };
  const e = experiencia.especialista;

  return (
    <Dialog.Root open={abierta} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {abierta && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-col-noche/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={fuera}
                animate={dentro}
                exit={fuera}
                transition={{ duration: 0.5, ease: EASE }}
                className={cn(
                  // El portal cae en <body>: las fuentes van acá.
                  `sitio ${fuenteDisplay.variable} ${fuenteTexto.variable}`,
                  "fixed z-[60] flex flex-col overflow-hidden bg-col-surface font-col-text text-col-ink shadow-[0_-24px_60px_-30px_rgba(4,7,31,0.55)] focus:outline-none",
                  "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[4px]",
                  "md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-[min(520px,100vw)] md:rounded-none",
                )}
              >
                <header className="relative flex shrink-0 items-start gap-4 bg-col-noche px-5 pb-6 pt-6 text-white sm:px-8">
                  <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 md:hidden" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    
                    <Dialog.Title className="font-col-display text-[30px] font-light leading-[1.1]">Hablar con un especialista</Dialog.Title>
                    <p className="text-[14px] leading-5 text-white/70">
                      Sobre <span className="text-white">{experiencia.titulo}</span>
                    </p>
                    {e && (
                      <div className="mt-1 flex items-center gap-3">
                        <div className="w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-col-gold ring-offset-2 ring-offset-col-noche">
                          {e.retrato ? <MedioImagen medio={e.retrato} aspecto={1} sizes="40px" /> : <div className="aspect-square bg-col-noche-2" />}
                        </div>
                        <span className="min-w-0 text-[14px] leading-5 text-white/85">
                          Te escribe <span className="text-white">{e.nombre}</span>
                          {e.region ? `, especialista en ${e.region}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Cerrar"
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-white/70 transition-colors duration-200 ease-col hover:text-white"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </Dialog.Close>
                </header>
                <FormularioCorto experienciaSlug={experiencia.slug} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function FormularioCorto({ experienciaSlug }: { experienciaSlug: string }) {
  const router = useRouter();
  const { enviarConsulta, rutaGracias } = useEnvios();
  const [d, setD] = useState<DatosConsulta>(DATOS_VACIOS);
  const [errores, setErrores] = useState<ErroresConsulta>({});
  const [envio, setEnvio] = useState<{ estado: "quieto" | "enviando" | "error"; mensaje?: string }>({ estado: "quieto" });
  const [website, setWebsite] = useState("");

  const cambiar = (p: Partial<DatosConsulta>) => {
    setD((x) => ({ ...x, ...p }));
    if (Object.keys(errores).length) setErrores({});
  };

  const enviar = async () => {
    const e = erroresContacto(d);
    if (d.fechaTipo === "rango" && d.fechaDesde && d.fechaHasta && d.fechaHasta < d.fechaDesde) e.fechas = "La vuelta es anterior a la salida.";
    setErrores(e);
    const primero = Object.keys(e)[0];
    if (primero) {
      document.querySelector<HTMLElement>(`[data-hoja] [data-campo="${primero}"]`)?.focus();
      return;
    }
    setEnvio({ estado: "enviando" });
    try {
      const r = await enviarConsulta(armarEnvio(d, { experienciaSlug, website }));
      if (!r.ok) return setEnvio({ estado: "error", mensaje: r.error });
      router.push(rutaGracias(r.data, experienciaSlug));
    } catch {
      setEnvio({ estado: "error" });
    }
  };

  return (
    <form
      data-hoja=""
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        if (envio.estado !== "enviando") void enviar();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8">
        <Campo id="hoja-nombre" titulo="Nombre" error={errores.nombre}>
          <input
            id="hoja-nombre"
            data-campo="nombre"
            autoComplete="name"
            value={d.nombre}
            maxLength={200}
            onChange={(e) => cambiar({ nombre: e.target.value })}
            placeholder="Tu nombre"
            aria-invalid={!!errores.nombre}
            className={claseInput(!!errores.nombre)}
          />
        </Campo>
        <Campo id="hoja-email" titulo="Email" error={errores.email}>
          <input
            id="hoja-email"
            data-campo="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={d.email}
            maxLength={254}
            onChange={(e) => cambiar({ email: e.target.value })}
            placeholder="tu@correo.com"
            aria-invalid={!!errores.email}
            className={claseInput(!!errores.email)}
          />
        </Campo>
        <CampoTelefono id="hoja-telefono" pais={d.telPais} valor={d.tel} error={errores.tel} onChange={(v) => cambiar(v)} />
        <SelectorCanal nombre="hoja-canal" valor={d.canal} onChange={(c) => cambiar({ canal: c })} />

        <div className="flex flex-col gap-4">
          <span className={cn(etiqueta, "text-col-slate")}>¿Tenés fechas?</span>
          <InterruptorFechas valor={d.fechaTipo} onChange={(v) => cambiar({ fechaTipo: v })} />
          {d.fechaTipo === "rango" && (
            <div className="grid grid-cols-2 gap-4">
              <Campo id="hoja-desde" titulo="Salida">
                <input
                  id="hoja-desde"
                  type="date"
                  value={d.fechaDesde}
                  onChange={(e) => cambiar({ fechaDesde: e.target.value })}
                  className={claseInput()}
                />
              </Campo>
              <Campo id="hoja-hasta" titulo="Vuelta">
                <input
                  id="hoja-hasta"
                  data-campo="fechas"
                  type="date"
                  min={d.fechaDesde || undefined}
                  value={d.fechaHasta}
                  onChange={(e) => cambiar({ fechaHasta: e.target.value })}
                  className={claseInput(!!errores.fechas)}
                />
              </Campo>
            </div>
          )}
          {d.fechaTipo === "mes" && (
            <Campo id="hoja-mes" titulo="Mes aproximado">
              <select
                id="hoja-mes"
                value={d.mesAproximado}
                onChange={(e) => cambiar({ mesAproximado: e.target.value })}
                className={cn(claseInput(), "cursor-pointer")}
              >
                <option value="">Elegí un mes</option>
                {proximosMeses().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          {errores.fechas && <ErrorCampo>{errores.fechas}</ErrorCampo>}
        </div>

        <div>
          <Contador titulo="Adultos" valor={d.adultos} min={1} max={20} onChange={(v) => cambiar({ adultos: v ?? 1 })} />
          <Contador titulo="Niños" ayuda="Hasta 12 años" valor={d.ninos} min={0} max={12} onChange={(v) => cambiar({ ninos: v ?? 0 })} />
        </div>

        <Campo id="hoja-comentarios" titulo="Comentarios · opcional">
          <textarea
            id="hoja-comentarios"
            rows={3}
            maxLength={2000}
            value={d.comentarios}
            onChange={(e) => cambiar({ comentarios: e.target.value })}
            placeholder="Lo que te imaginás, una fecha especial, edades de los chicos…"
            className={cn(claseInput(), "h-auto resize-none py-2.5 leading-[26px]")}
          />
        </Campo>
        <Casilla checked={d.aceptaNovedades} onChange={(v) => cambiar({ aceptaNovedades: v })}>
          Quiero recibir novedades de Collection, pocas veces al año.
        </Casilla>
        <CampoTrampa valor={website} onChange={setWebsite} />

        {envio.estado === "error" && (
          <div role="alert" className="flex flex-col gap-3 border-2 border-col-ink px-5 py-4">
            <span className="font-col-display text-[22px] leading-tight">No pudimos enviarla</span>
            <span className="text-[14px] leading-[22px] text-col-slate">
              {envio.mensaje ?? "Guardamos lo que escribiste. Probá de nuevo en un momento."}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-col-line bg-col-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
        <button
          type="submit"
          disabled={envio.estado === "enviando"}
          className={cn(boton({ tam: "lg" }), "group h-[52px] w-full gap-3 disabled:opacity-80")}
        >
          {envio.estado === "enviando" ? (
            <>
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : envio.estado === "error" ? (
            <>
              <RotateCcw aria-hidden className="h-4 w-4" strokeWidth={1.5} />
              Reintentar
            </>
          ) : (
            <>
              Enviar consulta
              <ArrowRight aria-hidden className="h-[18px] w-[18px] transition-transform duration-200 ease-col group-hover:translate-x-1" strokeWidth={1.25} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
