"use client";

// Formulario de Contactanos en cuatro pasos (propuesta 5.5 y mockup P01):
// tu viaje, fechas, viajeros y contacto. Valida cada paso al avanzar, guarda
// un borrador en este navegador y lo ofrece al volver, y si el envío falla no
// se pierde nada: se puede reintentar o pasar a WhatsApp.

import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, LoaderCircle, RotateCcw } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { boton } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { MedioImagen } from "../medios";
import {
  armarEnvio,
  CalendarioRango,
  Campo,
  CampoTelefono,
  CampoTrampa,
  Casilla,
  Chip,
  claseInput,
  Contador,
  DATOS_VACIOS,
  ErrorCampo,
  erroresContacto,
  erroresFechas,
  ESTILOS,
  etiqueta,
  INVERSIONES,
  InterruptorFechas,
  OCASIONES,
  proximosMeses,
  resumenFechas,
  resumenViajeros,
  SelectorCanal,
  type DatosConsulta,
  type ErroresConsulta,
} from "./campos";
import { useEnvios } from "./envios";

const CLAVE = "col-consulta-borrador";
const VIGENCIA = 30 * 24 * 3600 * 1000;
const PASOS = ["Tu viaje", "Fechas", "Viajeros", "Contacto"] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

export interface ExperienciaConsultada {
  slug: string;
  titulo: string;
  /** "10 noches · 3 destinos". */
  datos: string;
  portada: MedioVista | null;
}

interface Borrador {
  v: 1;
  t: number;
  paso: number;
  datos: DatosConsulta;
}

const tieneAlgo = (d: DatosConsulta) =>
  !!(d.nombre || d.email || d.ocasion || d.destinos.length || d.destinoLibre || d.comentarios || d.fechaTipo || d.estilos.length);

export function FormularioContacto({
  destinos,
  experiencia,
  whatsapp,
  pasoInicial = 1,
}: {
  destinos: string[];
  experiencia: ExperienciaConsultada | null;
  /** E.164 de Collection, para la salida por WhatsApp si falla el envío. */
  whatsapp?: string;
  /** Solo para las rutas de desarrollo. */
  pasoInicial?: number;
}) {
  const router = useRouter();
  const reducido = useReducedMotion();
  const { enviarConsulta, rutaGracias } = useEnvios();
  const [d, setD] = useState<DatosConsulta>(DATOS_VACIOS);
  const [paso, setPaso] = useState(pasoInicial);
  const [alcanzado, setAlcanzado] = useState(pasoInicial);
  const [errores, setErrores] = useState<ErroresConsulta>({});
  const [envio, setEnvio] = useState<{ estado: "quieto" | "enviando" | "error"; mensaje?: string }>({ estado: "quieto" });
  const [website, setWebsite] = useState("");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [leido, setLeido] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const pasoPrevio = useRef(pasoInicial);

  // Borrador: se lee una vez; si hay uno vigente, se ofrece antes de pisarlo.
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Borrador | null;
      if (b?.v === 1 && Date.now() - b.t < VIGENCIA && b.datos && tieneAlgo({ ...DATOS_VACIOS, ...b.datos })) setBorrador(b);
    } catch {
      // Sin localStorage o con basura: se arranca de cero.
    }
    setLeido(true);
  }, []);

  useEffect(() => {
    if (!leido || borrador || !tieneAlgo(d)) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ v: 1, t: Date.now(), paso, datos: d } satisfies Borrador));
    } catch {
      // Lleno o bloqueado: el formulario sigue igual, solo no se recuerda.
    }
  }, [d, paso, leido, borrador]);

  useEffect(() => {
    // Solo al cambiar de paso (no al montar, ni con el doble efecto de desarrollo).
    if (pasoPrevio.current === paso) return;
    pasoPrevio.current = paso;
    titulo.current?.focus({ preventScroll: true });
    const top = caja.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) caja.current?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  }, [paso, reducido]);

  const cambiar = (p: Partial<DatosConsulta>) => {
    // Si empieza a escribir sin elegir, el borrador viejo se descarta.
    if (borrador) setBorrador(null);
    setD((x) => ({ ...x, ...p }));
    if (Object.keys(errores).length) setErrores({});
  };

  const retomar = () => {
    if (!borrador) return;
    setD({ ...DATOS_VACIOS, ...borrador.datos });
    const p = Math.min(Math.max(borrador.paso, 1), 4);
    setPaso(p);
    setAlcanzado(p);
    setBorrador(null);
  };
  const descartar = () => {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // Ídem.
    }
    setBorrador(null);
  };

  const validar = (p: number): ErroresConsulta => {
    if (p === 2) return erroresFechas(d);
    if (p === 3) {
      const sinEdad = Array.from({ length: d.ninos }, (_, i) => d.edadesNinos[i] ?? null).some((x) => x === null);
      return sinEdad ? { edades: "Indicá la edad de cada niño." } : {};
    }
    if (p === 4) return erroresContacto(d);
    return {};
  };

  const marcar = (e: ErroresConsulta) => {
    setErrores(e);
    const primero = Object.keys(e)[0];
    if (primero) window.setTimeout(() => caja.current?.querySelector<HTMLElement>(`[data-campo="${primero}"]`)?.focus(), 0);
    return !primero;
  };

  const enviar = async () => {
    setEnvio({ estado: "enviando" });
    try {
      const r = await enviarConsulta(armarEnvio(d, { experienciaSlug: experiencia?.slug, website }));
      if (!r.ok) {
        setEnvio({ estado: "error", mensaje: r.error });
        return;
      }
      try {
        localStorage.removeItem(CLAVE);
      } catch {
        // Ídem.
      }
      router.push(rutaGracias(r.data, experiencia?.slug));
    } catch {
      setEnvio({ estado: "error" });
    }
  };

  const siguiente = () => {
    if (envio.estado === "enviando" || !marcar(validar(paso))) return;
    if (paso < 4) {
      setPaso(paso + 1);
      setAlcanzado((a) => Math.max(a, paso + 1));
    } else void enviar();
  };

  const irA = (n: number) => {
    if (n === paso || n > alcanzado) return;
    if (n > paso && !marcar(validar(paso))) return;
    setErrores({});
    setPaso(n);
  };

  const faltan = Object.keys(errores).length;
  const primeraSinEdad = Array.from({ length: d.ninos }, (_, i) => d.edadesNinos[i] ?? null).findIndex((x) => x === null);

  return (
    <div ref={caja} className="grid scroll-mt-24 overflow-hidden border border-col-line bg-col-surface lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          siguiente();
        }}
        className="relative flex min-w-0 flex-col gap-10 px-5 py-8 sm:px-10 sm:py-10 lg:min-h-[680px] lg:border-r lg:border-col-line lg:px-14 lg:py-12"
      >
        <ol className="grid grid-cols-4 gap-3 sm:gap-4">
          {PASOS.map((t, i) => {
            const n = i + 1;
            return (
              <li key={t} className="min-w-0">
                <button
                  type="button"
                  onClick={() => irA(n)}
                  disabled={n > alcanzado}
                  aria-current={n === paso ? "step" : undefined}
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-2 border-b-2 pb-3 text-left transition-colors duration-300 ease-col disabled:cursor-default",
                    n === paso ? "border-col-gold text-col-ink" : n < paso ? "border-col-ink text-col-ink" : "border-col-line text-col-slate",
                  )}
                >
                  <span className="font-mono text-[12px] leading-4">{String(n).padStart(2, "0")}</span>
                  <span className="truncate font-col-display text-[17px] leading-6 sm:text-[22px]">{t}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {borrador && (
          <div className="flex flex-col gap-4 border-l-2 border-col-gold bg-col-base px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] leading-6 text-col-ink">
              Tenés una consulta sin terminar{borrador.datos.nombre ? `, ${borrador.datos.nombre.split(" ")[0]}` : ""}. ¿Seguimos donde la dejaste?
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-4">
              <button type="button" onClick={retomar} className={cn(boton({ tam: "md" }))}>
                Seguir con mi consulta
              </button>
              <button type="button" onClick={descartar} className={cn(etiqueta, "text-[12px] text-col-slate underline decoration-col-line underline-offset-4 hover:text-col-ink")}>
                Empezar de nuevo
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: reducido ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducido ? 0 : -16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex min-w-0 flex-col gap-10"
          >
            {paso === 1 && (
              <>
                <Cabeza ref={titulo} titulo="¿Qué estás celebrando?" bajada="Nos ayuda a imaginar el ritmo del viaje." />
                {experiencia && <TarjetaConsultada e={experiencia} />}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {OCASIONES.map((o) => {
                    const activo = d.ocasion === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => cambiar({ ocasion: activo ? "" : o.id })}
                        className={cn(
                          "flex min-h-[112px] min-w-0 flex-col items-start justify-between gap-3 rounded-sm border p-4 text-left transition-colors duration-300 ease-col active:translate-y-px sm:p-5",
                          activo ? "border-col-ink bg-col-ink text-col-base" : "border-col-line bg-col-surface text-col-ink hover:border-col-ink",
                        )}
                      >
                        <span className="font-col-display text-[22px] leading-[1.15]">{o.id}</span>
                        <span className={cn("text-[13px] leading-[18px]", activo ? "text-col-line" : "text-col-slate")}>{o.texto}</span>
                      </button>
                    );
                  })}
                </div>
                {destinos.length > 0 && (
                  <fieldset className="flex flex-col gap-4">
                    <legend className={cn(etiqueta, "mb-4 text-col-ink")}>Destinos soñados · podés elegir varios</legend>
                    <div className="flex flex-wrap gap-3">
                      {destinos.map((x) => (
                        <Chip
                          key={x}
                          activo={d.destinos.includes(x)}
                          onClick={() =>
                            cambiar({ destinos: d.destinos.includes(x) ? d.destinos.filter((y) => y !== x) : [...d.destinos, x].slice(0, 10) })
                          }
                        >
                          {x}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                )}
                <Campo id="consulta-destino-libre" titulo={destinos.length ? "¿Otro lugar en mente?" : "¿Adónde te gustaría ir?"} className="max-w-[520px]">
                  <input
                    id="consulta-destino-libre"
                    value={d.destinoLibre}
                    maxLength={200}
                    onChange={(e) => cambiar({ destinoLibre: e.target.value })}
                    placeholder="Islandia, la costa amalfitana…"
                    className={claseInput()}
                  />
                </Campo>
                <fieldset className="flex flex-col gap-4">
                  <legend className={cn(etiqueta, "mb-4 text-col-ink")}>Estilo de viaje</legend>
                  <div className="flex flex-wrap gap-3">
                    {ESTILOS.map((x) => (
                      <Chip
                        key={x}
                        activo={d.estilos.includes(x)}
                        onClick={() => cambiar({ estilos: d.estilos.includes(x) ? d.estilos.filter((y) => y !== x) : [...d.estilos, x] })}
                      >
                        {x}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {paso === 2 && (
              <>
                <Cabeza ref={titulo} titulo="¿Ya tenés fechas?" bajada="Si todavía no, con el mes alcanza para empezar." />
                <InterruptorFechas valor={d.fechaTipo} onChange={(v) => cambiar({ fechaTipo: v })} />
                {d.fechaTipo === "rango" && (
                  <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-12">
                    <CalendarioRango
                      desde={d.fechaDesde}
                      hasta={d.fechaHasta}
                      onChange={(v) => cambiar({ fechaDesde: v.desde, fechaHasta: v.hasta })}
                    />
                    <div className="flex flex-col gap-4 md:pt-12">
                      <span className="font-col-display text-[26px] leading-tight" aria-live="polite">
                        {resumenFechas(d) || "Elegí la fecha de salida"}
                      </span>
                      <span className="text-[14px] leading-[22px] text-col-slate">
                        Tocá la salida y después la vuelta. Las fechas se pueden ajustar con tu especialista.
                      </span>
                    </div>
                  </div>
                )}
                {d.fechaTipo === "mes" && (
                  <fieldset className="flex flex-col gap-4">
                    <legend className={cn(etiqueta, "mb-4 text-col-ink")}>Mes aproximado</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                      {proximosMeses().map((m) => {
                        const activo = d.mesAproximado === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={activo}
                            onClick={() => cambiar({ mesAproximado: activo ? "" : m })}
                            className={cn(
                              "h-12 min-w-0 rounded-sm border px-2 text-[15px] transition-colors duration-200 ease-col",
                              activo ? "border-col-ink bg-col-ink text-col-base" : "border-col-line text-col-ink hover:border-col-ink",
                            )}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {errores.fechas && (
                  <div tabIndex={-1} data-campo="fechas" className="focus:outline-none">
                    <ErrorCampo>{errores.fechas}</ErrorCampo>
                  </div>
                )}
                <div className="max-w-[460px]">
                  <Contador titulo="Noches aproximadas" valor={d.noches} min={1} max={60} vacio="Sin definir" onChange={(v) => cambiar({ noches: v })} />
                </div>
              </>
            )}

            {paso === 3 && (
              <>
                <Cabeza ref={titulo} titulo="¿Quiénes viajan?" bajada="Contando a todos, también a los más chicos." />
                <div className="max-w-[520px]">
                  <Contador titulo="Adultos" valor={d.adultos} min={1} max={20} onChange={(v) => cambiar({ adultos: v ?? 1 })} />
                  <Contador
                    titulo="Niños"
                    ayuda="Hasta 12 años"
                    valor={d.ninos}
                    min={0}
                    max={12}
                    onChange={(v) => cambiar({ ninos: v ?? 0, edadesNinos: d.edadesNinos.slice(0, v ?? 0) })}
                  />
                </div>
                {d.ninos > 0 && (
                  <fieldset className="flex max-w-[640px] flex-col gap-4">
                    <legend className={cn(etiqueta, "mb-4 text-col-ink")}>Edad de cada niño</legend>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                      {Array.from({ length: d.ninos }, (_, i) => (
                        <label key={i} className="flex min-w-0 flex-col gap-2">
                          <span className="text-[13px] text-col-slate">Niño {i + 1}</span>
                          <select
                            data-campo={i === primeraSinEdad ? "edades" : undefined}
                            value={d.edadesNinos[i] ?? ""}
                            onChange={(e) => {
                              const edades = Array.from({ length: d.ninos }, (_, j) => d.edadesNinos[j] ?? null);
                              edades[i] = e.target.value === "" ? null : Number(e.target.value);
                              cambiar({ edadesNinos: edades });
                            }}
                            className={cn(claseInput(!!errores.edades && d.edadesNinos[i] == null), "cursor-pointer")}
                          >
                            <option value="">Edad</option>
                            {Array.from({ length: 13 }, (_, n) => (
                              <option key={n} value={n}>
                                {n === 0 ? "Menos de 1" : `${n} ${n === 1 ? "año" : "años"}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    {errores.edades && <ErrorCampo>{errores.edades}</ErrorCampo>}
                  </fieldset>
                )}
                {d.adultos + d.ninos > 12 && (
                  <p className="max-w-[560px] border-l-2 border-col-gold bg-col-base px-5 py-4 text-[15px] leading-6 text-col-ink">
                    Para más de 12 viajeros armamos una propuesta de grupo. Te contacta un especialista en grupos.
                  </p>
                )}
              </>
            )}

            {paso === 4 && (
              <>
                <Cabeza ref={titulo} titulo="¿Cómo te contactamos?" bajada="Un especialista te escribe en el día, por el canal que elijas." />
                {faltan > 0 && (
                  <div className="flex items-start gap-3 border-2 border-col-ink px-5 py-4 text-[15px] leading-6">
                    {faltan === 1
                      ? "Nos falta un dato para poder escribirte. Está marcado abajo."
                      : `Nos faltan ${faltan} datos para poder escribirte. Están marcados abajo.`}
                  </div>
                )}
                <div className="grid gap-8 sm:grid-cols-2">
                  <Campo id="consulta-nombre" titulo="Nombre" error={errores.nombre}>
                    <input
                      id="consulta-nombre"
                      data-campo="nombre"
                      autoComplete="name"
                      value={d.nombre}
                      maxLength={200}
                      onChange={(e) => cambiar({ nombre: e.target.value })}
                      placeholder="Tu nombre"
                      aria-invalid={!!errores.nombre}
                      aria-describedby={errores.nombre ? "consulta-nombre-error" : undefined}
                      className={claseInput(!!errores.nombre)}
                    />
                  </Campo>
                  <Campo id="consulta-email" titulo="Email" error={errores.email}>
                    <input
                      id="consulta-email"
                      data-campo="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={d.email}
                      maxLength={254}
                      onChange={(e) => cambiar({ email: e.target.value })}
                      placeholder="tu@correo.com"
                      aria-invalid={!!errores.email}
                      aria-describedby={errores.email ? "consulta-email-error" : undefined}
                      className={claseInput(!!errores.email)}
                    />
                  </Campo>
                </div>
                <div className="max-w-[520px]">
                  <CampoTelefono
                    id="consulta-telefono"
                    pais={d.telPais}
                    valor={d.tel}
                    error={errores.tel}
                    onChange={(v) => cambiar(v)}
                  />
                </div>
                <SelectorCanal nombre="consulta-canal" valor={d.canal} onChange={(c) => cambiar({ canal: c })} />
                <fieldset className="flex flex-col gap-4">
                  <legend className={cn(etiqueta, "mb-4 text-col-ink")}>Inversión por persona · opcional</legend>
                  <div className="flex flex-wrap gap-3">
                    {INVERSIONES.map((x) => (
                      <Chip key={x} activo={d.inversion === x} onClick={() => cambiar({ inversion: d.inversion === x ? "" : x })}>
                        {x}
                      </Chip>
                    ))}
                  </div>
                  <span className="text-[13px] leading-5 text-col-slate">
                    No lo mostramos ni lo compartimos. Sirve para proponerte hoteles que encajen.
                  </span>
                </fieldset>
                <Campo id="consulta-comentarios" titulo="Comentarios · opcional">
                  <textarea
                    id="consulta-comentarios"
                    rows={3}
                    maxLength={2000}
                    value={d.comentarios}
                    onChange={(e) => cambiar({ comentarios: e.target.value })}
                    placeholder="Algo que tengamos que saber: una fecha especial, una comida que no puede faltar…"
                    className={cn(claseInput(), "h-auto resize-none py-2.5 leading-[26px]")}
                  />
                </Campo>
                <Casilla checked={d.aceptaNovedades} onChange={(v) => cambiar({ aceptaNovedades: v })}>
                  Quiero recibir novedades de Collection, pocas veces al año.
                </Casilla>
                <CampoTrampa valor={website} onChange={setWebsite} />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {envio.estado === "error" && (
          <div role="alert" className="flex flex-col gap-4 border-2 border-col-ink px-5 py-5">
            <span className="font-col-display text-[24px] leading-tight">No pudimos enviarla</span>
            <span className="text-[15px] leading-6 text-col-slate">
              {envio.mensaje ?? "Guardamos todo lo que escribiste. Probá de nuevo en un momento o escribinos por WhatsApp."}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void enviar()} className={boton({ tam: "md" })}>
                <RotateCcw aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} />
                Reintentar
              </button>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola, quiero hacer una consulta para un viaje.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={boton({ variante: "secundario", tam: "md" })}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-col-line pt-8">
          <button
            type="button"
            onClick={() => irA(paso - 1)}
            disabled={paso === 1}
            className={cn(etiqueta, "inline-flex items-center gap-3 py-3 text-col-ink transition-colors duration-200 ease-col disabled:text-col-slate/50")}
          >
            <ArrowLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.25} />
            Volver
          </button>
          <span className="hidden font-mono text-[12px] text-col-slate sm:inline">Paso {paso} de 4</span>
          <button
            type="submit"
            disabled={envio.estado === "enviando"}
            className={cn(
              boton({ tam: "lg" }),
              "group h-[52px] gap-3 bg-[linear-gradient(#F4B860,#F4B860)] bg-[length:0%_2px] bg-[position:0_100%] bg-no-repeat px-6 transition-[background-size,gap] duration-[400ms] hover:gap-[18px] hover:bg-[length:100%_2px] sm:px-8 disabled:opacity-80",
            )}
          >
            {envio.estado === "enviando" ? (
              <>
                <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                {paso === 4 ? "Enviar consulta" : "Continuar"}
                <ArrowRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.25} />
              </>
            )}
          </button>
        </div>
      </form>

      <Resumen d={d} experiencia={experiencia} />
    </div>
  );
}

const Cabeza = forwardRef<HTMLHeadingElement, { titulo: string; bajada: string }>(function Cabeza({ titulo, bajada }, ref) {
  return (
    <div className="flex flex-col gap-2">
      <h2 ref={ref} tabIndex={-1} className="font-col-display text-[34px] font-normal leading-[1.15] focus:!outline-none sm:text-[40px]">
        {titulo}
      </h2>
      <p className="text-[16px] leading-[26px] text-col-slate">{bajada}</p>
    </div>
  );
});

function TarjetaConsultada({ e }: { e: ExperienciaConsultada }) {
  return (
    <div className="flex max-w-[560px] items-center gap-4 border border-col-line bg-col-base p-3">
      <div className="w-16 shrink-0">
        {e.portada ? <MedioImagen medio={e.portada} aspecto={4 / 5} sizes="64px" /> : <div className="aspect-[4/5] bg-col-line" />}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn(etiqueta, "text-[12px] text-col-slate")}>Consultás por</span>
        <span className="font-col-display text-[21px] leading-tight">{e.titulo}</span>
        {e.datos && <span className="text-[13px] text-col-slate">{e.datos}</span>}
      </div>
    </div>
  );
}

function Resumen({ d, experiencia }: { d: DatosConsulta; experiencia: ExperienciaConsultada | null }) {
  const destinos = [...d.destinos, ...d.destinoLibre.split(",").map((x) => x.trim()).filter(Boolean)];
  const filas = [
    { t: "Ocasión", v: d.ocasion },
    { t: experiencia ? "Experiencia" : "Destinos", v: experiencia ? experiencia.titulo : destinos.join(", ") },
    { t: "Fechas", v: resumenFechas(d) },
    { t: "Duración", v: d.noches ? `${d.noches} noches` : "" },
    { t: "Viajeros", v: resumenViajeros(d) },
  ];
  return (
    <aside aria-label="Tu viaje hasta ahora" className="hidden flex-col gap-6 bg-col-noche px-10 py-12 text-white lg:flex">
      <span className={cn(etiqueta, "flex items-center gap-3 text-white/70")}>
        <span aria-hidden className="h-px w-6 bg-col-gold" />
        Tu viaje hasta ahora
      </span>
      {experiencia?.portada && <MedioImagen medio={experiencia.portada} aspecto={16 / 10} sizes="360px" />}
      <dl className="flex flex-col">
        {filas.map((f) => (
          <div key={f.t} className="flex flex-col gap-1 border-b border-col-noche-linea py-4">
            <dt className={cn(etiqueta, "text-[12px] text-white/55")}>{f.t}</dt>
            <dd className={cn("font-col-display text-[21px] leading-tight", f.v ? "text-white" : "text-white/35")}>{f.v || "Sin definir"}</dd>
          </div>
        ))}
      </dl>
      <span className="mt-auto text-[13px] leading-5 text-white/60">Podés volver a cualquier paso tocando su nombre arriba.</span>
    </aside>
  );
}
