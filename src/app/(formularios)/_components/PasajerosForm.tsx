"use client";

// ---------------------------------------------------------------------------
// Formulario público de datos de pasajeros.
//
// Cinco campos por pasajero, todos obligatorios: nombre y apellido (UNO solo),
// documento de viaje, fecha de nacimiento, email y teléfono. Los adjuntos son
// los dos opcionales y NINGUNO bloquea el envío (cliente, 26/08/2026).
//
// Bloques repetibles: "Pasajero 1", "Pasajero 2", … Un bloque SOLO se puede
// plegar cuando está completo (usamos el checkValidity() nativo de cada
// input). Esa regla no es cosmética: si dejáramos plegar un bloque incompleto,
// el navegador intentaría enfocar un campo requerido que está a altura cero y
// la validación nativa se rompe con "invalid form control is not focusable".
//
// Los campos van con el índice adelante (p0__nombres, p1__nombres, …) y el
// índice sale de la POSICIÓN en el array. Los bloques están keyeados por un id
// estable, así que al borrar uno del medio React mueve los nodos del DOM (con
// sus valores) y solo reescribe el atributo name.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Plus, Trash2, UserRound } from "lucide-react";
import { submitEnvioPasajeros, type FormResult } from "@/actions/datos-publico.actions";
import type { FormField } from "@/lib/cotizador-form";
import { AdjuntoField, type Adjunto } from "./AdjuntoField";
import { CamposExtra } from "./CamposExtra";
import {
  ACENTO,
  Campo,
  ErrorMsg,
  Exito,
  Honeypot,
  Label,
  Seccion,
  Separador,
  SubmitButton,
  inputClass,
} from "./ui";

interface Slot {
  id: string;
}

// `pasaporte` es el nombre histórico de la columna (pasaporteArchivoUrl); en
// la UI es "Adjuntar archivo" · el archivo adicional opcional.
type Adjuntos = { documento: Adjunto | null; pasaporte: Adjunto | null };

/** id local para keyear los bloques. No viaja al server. */
function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** UUID del lote de adjuntos. randomUUID solo existe en contexto seguro. */
function nuevoLote(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback manual con el formato exacto que valida el route handler.
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
}

export function PasajerosForm({
  slug,
  token,
  campos,
  maxPasajeros,
  avisoDesde,
  accept,
  maxAdjuntoBytes,
  destinoInicial,
  referenciaInicial,
  emailInicial,
}: {
  slug: string;
  token: string | null;
  campos: FormField[];
  maxPasajeros: number;
  avisoDesde: number;
  accept: string;
  maxAdjuntoBytes: number;
  destinoInicial: string | null;
  referenciaInicial: string | null;
  emailInicial: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [slots, setSlots] = useState<Slot[]>(() => [{ id: "p1" }]);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({ p1: true });
  const [adjuntos, setAdjuntos] = useState<Record<string, Adjuntos>>({});
  const [resumen, setResumen] = useState<Record<string, string>>({});
  const [avisoPliegue, setAvisoPliegue] = useState<string | null>(null);
  const [quiereFactura, setQuiereFactura] = useState(false);
  // El lote agrupa los adjuntos de este envío dentro del bucket. Se genera
  // después del montaje para no romper la hidratación con un valor distinto
  // en server y cliente.
  const [lote, setLote] = useState("");
  useEffect(() => setLote(nuevoLote()), []);

  const action = useMemo(
    () => submitEnvioPasajeros.bind(null, slug, token),
    [slug, token],
  );
  const [state, formAction] = useFormState<FormResult | null, FormData>(action, null);

  // Si el server rechazó el envío, abrimos todo: el campo problemático puede
  // estar en un bloque plegado y el mensaje ya dice de qué pasajero se trata.
  useEffect(() => {
    if (state && !state.ok) {
      setAbiertos(Object.fromEntries(slots.map((s) => [s.id, true])));
    }
    // slots a propósito fuera de las deps: solo reaccionamos al cambio de state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const adj = (id: string): Adjuntos => adjuntos[id] ?? { documento: null, pasaporte: null };

  function setAdjunto(id: string, campo: keyof Adjuntos, valor: Adjunto | null) {
    setAdjuntos((prev) => ({ ...prev, [id]: { ...adj(id), [campo]: valor } }));
  }

  /**
   * ¿Todos los controles del bloque pasan la validación nativa? Los adjuntos
   * NO entran: desde el 26/08/2026 son opcionales y no frenan ni el pliegue ni
   * el envío.
   */
  function bloqueCompleto(id: string): boolean {
    const el = formRef.current?.querySelector<HTMLElement>(`[data-bloque="${id}"]`);
    if (!el) return false;
    const controles = Array.from(
      el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    );
    return controles.every((c) => c.checkValidity());
  }

  function plegar(id: string) {
    if (!bloqueCompleto(id)) {
      setAvisoPliegue(id);
      return;
    }
    setAvisoPliegue(null);
    setAbiertos((a) => ({ ...a, [id]: false }));
  }

  function alternar(id: string) {
    if (abiertos[id]) plegar(id);
    else setAbiertos((a) => ({ ...a, [id]: true }));
  }

  function agregar() {
    if (slots.length >= maxPasajeros) return;
    const id = nuevoId();
    // Plegamos los que ya estén completos; los incompletos quedan a la vista.
    const cerrados: Record<string, boolean> = { ...abiertos };
    for (const s of slots) if (bloqueCompleto(s.id)) cerrados[s.id] = false;
    setAbiertos({ ...cerrados, [id]: true });
    setSlots((s) => [...s, { id }]);
  }

  function quitar(id: string) {
    setSlots((s) => s.filter((x) => x.id !== id));
    setAdjuntos(({ [id]: _borrado, ...resto }) => resto);
    setResumen(({ [id]: _r, ...resto }) => resto);
  }

  if (state?.ok) {
    return (
      <Exito
        titulo={state.message}
        detalle="Tu asesor ya recibió el aviso y se pondrá en contacto a la brevedad."
      />
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6 sm:space-y-7">
      <Honeypot />
      <input type="hidden" name="cantidadPasajeros" value={slots.length} />

      {/* El viaje ya no se le pregunta al pasajero: el vendedor sabe de quién
          es su link. Si la solicitud (?s=token) traía destino o referencia,
          viajan ocultos para que el envío quede igual de atado que antes. */}
      {destinoInicial && <input type="hidden" name="destino" value={destinoInicial} />}
      {referenciaInicial && (
        <input type="hidden" name="referencia" value={referenciaInicial} />
      )}

      {/* ── Pasajeros ───────────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <Seccion>Pasajeros</Seccion>

        <AnimatePresence initial={false}>
          {slots.map((slot, idx) => {
            const p = `p${idx}__`;
            const abierto = abiertos[slot.id] ?? true;
            const nombre = resumen[slot.id]?.trim();
            return (
              <motion.div
                key={slot.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                data-bloque={slot.id}
                className="overflow-hidden rounded-[14px] border border-neutral-900/[0.1] bg-white shadow-[0_1px_2px_rgba(17,17,36,0.04)]"
              >
                {/* Cabecera plegable */}
                <div className="flex items-center gap-2.5 pl-3 pr-2">
                  {/* Chip fino en vez de círculo macizo: numera sin gritar. */}
                  <span
                    className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full border px-1.5 text-[11.5px] font-bold"
                    style={{
                      borderColor: "rgba(244,62,85,0.28)",
                      background: "rgba(244,62,85,0.07)",
                      color: ACENTO,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => alternar(slot.id)}
                    className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-3 text-left transition-colors hover:bg-neutral-900/[0.02]"
                    aria-expanded={abierto}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold leading-tight text-neutral-900">
                        Pasajero {idx + 1}
                      </span>
                      {nombre && !abierto && (
                        <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-neutral-500">
                          {nombre}
                        </span>
                      )}
                    </span>
                    {/* La flecha va en su propio botón redondo: deja claro que
                        la fila entera pliega, no solo el texto. */}
                    <motion.span
                      animate={{ rotate: abierto ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100/80 text-neutral-500"
                    >
                      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </motion.span>
                  </button>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitar(slot.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Quitar pasajero ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>

                {avisoPliegue === slot.id && abierto && (
                  <p className="px-3 pb-2.5 text-[11.5px] leading-snug text-neutral-500">
                    Completá los datos de este pasajero para poder plegarlo.
                  </p>
                )}

                {/* Cuerpo · se mantiene montado al plegar para no perder valores. */}
                <motion.div
                  data-plegable
                  initial={false}
                  animate={{ height: abierto ? "auto" : 0, opacity: abierto ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="space-y-3.5 border-t border-neutral-900/[0.06] px-3 py-3.5 sm:px-4 sm:py-4">
                    {/* Un solo campo de nombre: a 390 px dos columnas para
                        "nombres" y "apellidos" partían el nombre en dos cajas
                        angostas y la gente escribía todo en la primera. */}
                    <Campo
                      name={`${p}nombres`}
                      label="Nombre y apellido"
                      requerido
                      required
                      maxLength={200}
                      autoComplete="name"
                      ayuda="Tal cual figura en el documento de viaje."
                      onChange={(e) => {
                        // El value se captura ANTES del updater: React puede
                        // ejecutarlo despues de que el evento terminó y ahí
                        // currentTarget ya es null (crash con autofill).
                        const v = e.currentTarget.value;
                        setResumen((r) => ({ ...r, [slot.id]: v }));
                      }}
                    />

                    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                      <Campo
                        name={`${p}documento`}
                        label="Documento de viaje"
                        requerido
                        required
                        maxLength={40}
                        ayuda="Cédula o pasaporte."
                      />
                      <div>
                        <Label requerido htmlFor={`${p}fechaNacimiento`}>
                          Fecha de nacimiento
                        </Label>
                        <input
                          id={`${p}fechaNacimiento`}
                          name={`${p}fechaNacimiento`}
                          type="date"
                          required
                          max={new Date().toISOString().slice(0, 10)}
                          min="1900-01-01"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                      <Campo
                        name={`${p}email`}
                        label="Email"
                        type="email"
                        requerido
                        required
                        maxLength={254}
                        autoComplete="email"
                        defaultValue={idx === 0 ? (emailInicial ?? "") : ""}
                      />
                      <Campo
                        name={`${p}telefono`}
                        label="Teléfono"
                        type="tel"
                        requerido
                        required
                        maxLength={40}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+598 99 123 456"
                      />
                    </div>

                    {/* Los dos adjuntos son opcionales y ninguno frena el
                        envío: si el pasajero no tiene la foto a mano, manda
                        igual y el vendedor se la pide después. */}
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                      <AdjuntoField
                        name={`${p}documentoKey`}
                        label="Foto del documento"
                        cta="Subir foto"
                        ayuda="Opcional · JPG, PNG o PDF."
                        slug={slug}
                        lote={lote}
                        accept={accept}
                        maxBytes={maxAdjuntoBytes}
                        value={adj(slot.id).documento}
                        onChange={(a) => setAdjunto(slot.id, "documento", a)}
                      />
                      <AdjuntoField
                        name={`${p}pasaporteKey`}
                        label="Adjuntar archivo"
                        ayuda="Opcional · cualquier otro documento del viaje."
                        slug={slug}
                        lote={lote}
                        accept={accept}
                        maxBytes={maxAdjuntoBytes}
                        value={adj(slot.id).pasaporte}
                        onChange={(a) => setAdjunto(slot.id, "pasaporte", a)}
                      />
                    </div>

                    <CamposExtra campos={campos} prefijo={p} />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {slots.length >= avisoDesde && slots.length < maxPasajeros && (
          <p className="px-0.5 text-[11.5px] leading-relaxed text-neutral-500">
            Son muchos pasajeros para un solo envío. Si el grupo es más grande que{" "}
            {maxPasajeros}, mandá los datos en varias tandas o coordinalo con tu asesor.
          </p>
        )}

        {slots.length < maxPasajeros ? (
          <button
            type="button"
            onClick={agregar}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-neutral-900/20 bg-white text-[13.5px] font-semibold text-neutral-700 transition-colors hover:border-neutral-900/40 hover:bg-neutral-50/70 sm:h-[44px]"
          >
            <Plus className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2.2} />
            Agregar pasajero
          </button>
        ) : (
          <p className="rounded-[12px] border border-neutral-900/[0.08] bg-neutral-50/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-neutral-500">
            Llegaste al máximo de {maxPasajeros} pasajeros por envío. Mandá estos y cargá el resto
            en un envío nuevo.
          </p>
        )}
      </section>

      <Separador />

      {/* ── Facturación ─────────────────────────────────────────────────── */}
      <section className="space-y-3.5">
        {/* Fila entera clickeable: la casilla suelta era un target de 16px. */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-neutral-900/[0.14] bg-white px-3 py-3 transition-colors hover:border-neutral-900/25 has-[:checked]:border-[#F43E55]/70 has-[:checked]:bg-[#F43E55]/[0.04]">
          <input
            type="checkbox"
            name="quiereFactura"
            value="si"
            checked={quiereFactura}
            onChange={(e) => setQuiereFactura(e.target.checked)}
            className="fx-check !mt-0"
          />
          <span className="text-[13.5px] leading-snug text-neutral-700">Deseo factura con RUT</span>
        </label>

        <AnimatePresence initial={false}>
          {quiereFactura && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-3.5 rounded-[14px] border border-neutral-900/[0.1] bg-white p-3.5 shadow-[0_1px_2px_rgba(17,17,36,0.04)] sm:p-4">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                  <Campo
                    name="facturaRut"
                    label="RUT"
                    requerido
                    required
                    maxLength={20}
                    inputMode="numeric"
                  />
                  <Campo
                    name="facturaRazonSocial"
                    label="Razón social"
                    requerido
                    required
                    maxLength={200}
                  />
                </div>
                <Campo
                  name="facturaEmail"
                  label="Email de facturación"
                  type="email"
                  requerido
                  required
                  maxLength={254}
                />
                <Campo
                  name="facturaDireccion"
                  label="Dirección fiscal"
                  maxLength={200}
                  placeholder="Opcional"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="space-y-2.5">
        {state && !state.ok && <ErrorMsg>{state.message}</ErrorMsg>}

        {/* El único gate que queda es el lote (se genera al montar): sin él la
            key del bucket no valida. Los adjuntos ya no bloquean nada. */}
        <SubmitButton disabled={!lote}>Enviar los datos</SubmitButton>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] leading-snug text-neutral-400">
          <UserRound className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
          Tus datos van directo a tu asesor y se usan solo para emitir los servicios.
        </p>
      </div>
    </form>
  );
}
