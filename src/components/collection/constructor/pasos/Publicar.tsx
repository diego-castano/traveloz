"use client";

// Paso 9: publicar. Lista de requisitos (obligatorios y recomendados) que
// lleva a cada paso, el estado y las acciones según permiso, y el historial.

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { PASOS, puedePublicar, requisitos, type Requisito } from "@/lib/collection/experiencia/contenido";
import type { AccionEstado } from "@/actions/collection/experiencias.actions";
import { cn } from "@/components/lib/cn";
import { Boton, Estado, VerEnSitio } from "../../ui";
import { rutaSitio } from "../../sitio/tarjetas";
import { Grupo } from "../campos";
import { useConstructor } from "../contexto";
import { EstadoPill, ListaHistorial } from "../formato";
import { CheckExito, DUR, sacudir, useLogro } from "../../movimiento";

const TEXTO_ESTADO = {
  BORRADOR: "Solo la ve el equipo. Cuando esté lista, mandala a revisión o publicala.",
  EN_REVISION: "Esperando que alguien con permiso la revise y la publique.",
  PUBLICADA: "Está en el sitio.",
  PAUSADA: "No se ve en el sitio. Se puede volver a publicar cuando quieras.",
  ARCHIVADA: "Guardada fuera de la vista. No se borra nada.",
} as const;

export function PasoPublicar() {
  const c = useConstructor();
  const { borrador, estado, revision, publicadoRevision, irAPaso, historial } = c;
  const req = requisitos(borrador);
  // Lo que falta primero.
  const primeroFaltantes = (a: Requisito, b: Requisito) => Number(a.ok) - Number(b.ok);
  const obligatorios = req.filter((r) => r.obligatorio).sort(primeroFaltantes);
  const recomendados = req.filter((r) => !r.obligatorio).sort(primeroFaltantes);
  const listos = obligatorios.filter((r) => r.ok).length;
  const cambiosSinPublicar = estado === "PUBLICADA" && publicadoRevision !== revision;
  const recienPublicada = useLogro(estado === "PUBLICADA");

  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-col-sm bg-col-ink p-6 text-col-base">
        <div className="flex flex-wrap items-center gap-3">
          <EstadoPill estado={estado} animado />
          <AnimatePresence>
            {recienPublicada && (
              <motion.span key="ok" className="flex text-col-gold" exit={{ opacity: 0, transition: { duration: DUR.quick } }}>
                <CheckExito className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
          {cambiosSinPublicar && <Estado tono="aviso">Cambios sin publicar</Estado>}
        </div>
        <p className="mt-4 max-w-[52ch] font-col-display text-col-xl leading-snug">{TEXTO_ESTADO[estado]}</p>
        {estado === "PUBLICADA" && borrador.campos.slug && (
          <VerEnSitio ruta={rutaSitio.experiencia(borrador.campos.slug)} className="mt-3 text-col-base/80 hover:text-col-base" />
        )}
        <div className="mt-6 flex items-center gap-4">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-col-base/15">
            <div
              className="h-full bg-col-gold transition-[width] duration-col-lento ease-col"
              style={{ width: `${(listos / obligatorios.length) * 100}%` }}
            />
          </div>
          <span className="text-col-sm tabular-nums lining-nums text-col-base/70">
            {listos} de {obligatorios.length} obligatorios
          </span>
        </div>
        <Acciones />
      </section>

      <Grupo titulo="Obligatorio" ayuda="Sin esto no se puede publicar.">
        <ListaRequisitos items={obligatorios} onIr={irAPaso} />
      </Grupo>
      <Grupo titulo="Recomendado" ayuda="Hace la página más completa.">
        <ListaRequisitos items={recomendados} onIr={irAPaso} />
      </Grupo>
      <Grupo titulo="Historial">
        <div className="-mx-3">
          <ListaHistorial historial={historial} />
        </div>
      </Grupo>
    </div>
  );
}

function ListaRequisitos({ items, onIr }: { items: Requisito[]; onIr: (p: Requisito["paso"]) => void }) {
  return (
    <ul className="-mt-2 flex flex-col">
      {items.map((r) => {
        const paso = PASOS.find((p) => p.id === r.paso);
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onIr(r.paso)}
              className="group flex w-full items-center gap-4 rounded-col-sm px-2 py-3 text-left transition-colors hover:bg-col-surface"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  r.ok ? "border-col-gold bg-col-gold text-col-ink" : "border-col-slate/30",
                )}
              >
                {r.ok && <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
              </span>
              <span className={cn("flex-1 text-col-cuerpo", r.ok ? "text-col-slate" : "text-col-ink")}>
                {r.texto}
                <span className="sr-only">{r.ok ? ", listo" : ", falta"}</span>
              </span>
              <span className="flex items-center gap-1.5 text-col-sm font-medium text-col-muted transition-colors group-hover:text-col-ink">
                {paso?.titulo}
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[opacity,transform] duration-col ease-col group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Acciones() {
  const c = useConstructor();
  const { estado, borrador, editable, puedePublicar: permisoPublicar } = c;
  const [enCurso, setEnCurso] = useState<AccionEstado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmarArchivo, setConfirmarArchivo] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const faltaRef = useRef<HTMLParagraphElement>(null);
  const listo = puedePublicar(borrador);
  const cambiosSinPublicar = estado === "PUBLICADA" && c.publicadoRevision !== c.revision;

  const hacer = async (accion: AccionEstado) => {
    setError(null);
    setEnCurso(accion);
    const guardado = await c.guardarYa();
    if (!guardado) {
      setEnCurso(null);
      setError("Primero hay que guardar los últimos cambios. Revisá la conexión y probá de nuevo.");
      sacudir(caja.current);
      return;
    }
    const r = await c.api.cambiarEstado(c.id, accion).catch(() => null);
    setEnCurso(null);
    setConfirmarArchivo(false);
    if (!r?.ok) {
      setError(r?.error ?? "Sin conexión. Probá de nuevo.");
      sacudir(caja.current);
      return;
    }
    if (accion === "publicar") c.setPublicadoRevision(c.revisionActual());
    c.sumarHistorial(accion === "publicar" && estado === "PUBLICADA" ? "publicar-cambios" : accion);
    c.setEstado(r.data.estado);
  };

  const botones: { accion: AccionEstado; label: string; primario?: boolean; deshabilitado?: boolean }[] = [];
  if (estado === "BORRADOR" && editable) botones.push({ accion: "enviar-revision", label: "Enviar a revisión", primario: !permisoPublicar });
  if (permisoPublicar && (estado === "BORRADOR" || estado === "EN_REVISION" || estado === "PAUSADA")) {
    botones.push({ accion: "publicar", label: "Publicar", primario: true, deshabilitado: !listo });
  }
  if (permisoPublicar && estado === "PUBLICADA") {
    botones.push({ accion: "publicar", label: "Publicar cambios", primario: true, deshabilitado: !listo || !cambiosSinPublicar });
    botones.push({ accion: "pausar", label: "Pausar" });
  }
  if (editable && (estado === "EN_REVISION" || estado === "PAUSADA" || estado === "ARCHIVADA")) {
    botones.push({ accion: "volver-borrador", label: "Volver a borrador" });
  }
  const puedeArchivar = permisoPublicar && estado !== "ARCHIVADA";
  const faltan = requisitos(borrador)
    .filter((r) => r.obligatorio && !r.ok)
    .map((r) => r.texto.charAt(0).toLowerCase() + r.texto.slice(1))
    .join(", ");

  if (!botones.length && !puedeArchivar) {
    return (
      <p className="mt-6 text-col-sm text-col-base/60">Tu usuario no tiene permiso para cambiar el estado.</p>
    );
  }

  return (
    <div ref={caja} className="mt-6 border-t border-col-base/10 pt-5">
      {/* Publicar bloqueado: tocar la fila sacude la lista de lo que falta. */}
      <div
        className="flex flex-wrap items-center gap-3"
        onPointerDown={(e) => {
          if (!listo && (e.target as HTMLElement).closest("button:disabled")) sacudir(faltaRef.current);
        }}
      >
        {botones.map((b) => (
          <Boton
            key={b.label}
            tam="sm"
            disabled={b.deshabilitado || !!enCurso}
            motivo={!listo ? `Falta: ${faltan}` : "No hay cambios para publicar"}
            onClick={() => void hacer(b.accion)}
            className={
              b.primario
                ? "bg-col-gold text-col-ink hover:bg-col-base"
                : "border border-col-base/30 bg-transparent text-col-base hover:border-col-base hover:bg-transparent"
            }
          >
            {enCurso === b.accion && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {b.label}
          </Boton>
        ))}
        {puedeArchivar &&
          (confirmarArchivo ? (
            <span className="ml-auto flex items-center gap-3 text-col-sm text-col-base/80">
              ¿Archivarla? Sale del sitio.
              <button
                type="button"
                onClick={() => void hacer("archivar")}
                disabled={!!enCurso}
                className="text-col-sm font-medium text-[#E9A08F] underline underline-offset-4"
              >
                {enCurso === "archivar" ? "Archivando…" : "Sí, archivar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarArchivo(false)}
                className="text-col-sm font-medium text-col-base/60 hover:text-col-base"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarArchivo(true)}
              className="ml-auto text-col-sm font-medium text-col-base/70 transition-colors hover:text-col-base"
            >
              Archivar
            </button>
          ))}
      </div>
      {!listo && permisoPublicar && estado !== "ARCHIVADA" && (
        <p ref={faltaRef} className="mt-4 rounded-col-sm text-col-sm text-col-base/60">
          Para publicar falta: {faltan}.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-col-md text-[#E9A08F]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
