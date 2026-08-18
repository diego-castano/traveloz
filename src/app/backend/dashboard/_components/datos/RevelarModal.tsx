"use client";

// ---------------------------------------------------------------------------
// RevelarModal - abrir la bóveda de un registro de pago, en tres pasos:
//
//   1. confirmar   → qué tarjeta es, cuánto le queda, y que la apertura queda
//                    en la auditoría. Nada sensible todavía.
//   2. credencial  → segundo factor (PIN o contraseña) contra revelarPago.
//   3. revelado    → los datos en claro, para copiar y usar.
//
// REGLA DURA: lo que devuelve `revelarPago` vive SOLO en el estado local de
// este componente. No va a un provider, ni a localStorage, ni a la URL, ni al
// console. Cerrar el modal desmonta el estado y los datos se van con él; por
// eso `cerrar()` resetea a mano antes de avisarle al padre (el estado no se
// desmonta hasta que termina la animación de salida del Modal).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  Copy,
  CreditCard,
  Eye,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  getPagoMeta,
  revelarPago,
  type DatosRevelados,
  type PagoMetaView,
} from "@/actions/datos-boveda.actions";

interface RevelarModalProps {
  /** id del registro a abrir. `null` mantiene el modal cerrado. */
  pagoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se dispara tras un revelado exitoso: el registro pasó a "visto". */
  onRevelado?: () => void;
}

type Paso = "confirmar" | "credencial" | "revelado";

const AVISO_AUDITORIA = "Esta apertura queda registrada en la auditoría.";

/** "quedan 51 h" / "quedan 40 min". null si ya venció. */
function restante(expiraAt: Date): string | null {
  const ms = new Date(expiraAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `${Math.max(1, minutos)} min`;
  return `${Math.floor(minutos / 60)} h`;
}

/** El número agrupado de a 4 se lee y se dicta mucho mejor por teléfono. */
function agrupar(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.replace(/(.{4})/g, "$1 ").trim() || numero;
}

export function RevelarModal({ pagoId, open, onOpenChange, onRevelado }: RevelarModalProps) {
  const { toast } = useToast();

  const [meta, setMeta] = useState<PagoMetaView | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [paso, setPaso] = useState<Paso>("confirmar");
  const [credencial, setCredencial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [datos, setDatos] = useState<DatosRevelados | null>(null);

  const reset = useCallback(() => {
    setMeta(null);
    setMetaError(null);
    setPaso("confirmar");
    setCredencial("");
    setError(null);
    setVerificando(false);
    // Lo primero que se suelta al cerrar: los datos en claro.
    setDatos(null);
  }, []);

  const cerrar = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  // La cabecera se pide al abrir. No trae nada cifrado, así que es seguro
  // mostrarla antes del segundo factor.
  useEffect(() => {
    if (!open || !pagoId) return;
    let vivo = true;
    setMeta(null);
    setMetaError(null);
    getPagoMeta(pagoId)
      .then((m) => {
        if (!vivo) return;
        if (!m) setMetaError("No encontramos estos datos de pago.");
        else setMeta(m);
      })
      .catch(() => {
        if (vivo) setMetaError("No pudimos leer el registro. Probá de nuevo.");
      });
    return () => {
      vivo = false;
    };
  }, [open, pagoId]);

  async function confirmarCredencial(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (verificando || !pagoId) return;
    setVerificando(true);
    setError(null);
    try {
      const r = await revelarPago({ id: pagoId, credencial });
      if (r.ok) {
        setDatos(r.datos);
        // La credencial no se queda en memoria un segundo más de lo necesario.
        setCredencial("");
        setPaso("revelado");
        onRevelado?.();
      } else {
        setError(r.message);
      }
    } catch {
      setError("No se pudieron abrir los datos. Intentá de nuevo.");
    } finally {
      setVerificando(false);
    }
  }

  const disponible = meta?.estado === "DISPONIBLE" || meta?.estado === "VISTO";
  const quedan = meta ? restante(meta.expiraAt) : null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) cerrar();
        else onOpenChange(true);
      }}
      size="sm"
    >
      <ModalHeader
        title={paso === "revelado" ? "Datos de la tarjeta" : "Abrir datos de pago"}
        description={
          paso === "revelado"
            ? "Usalos ahora: al cerrar esta ventana desaparecen."
            : "Necesitamos confirmar que sos vos."
        }
        icon={paso === "revelado" ? <Eye size={18} /> : <CreditCard size={18} />}
        onClose={cerrar}
      />

      <ModalBody>
        {metaError ? (
          <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            {metaError}
          </p>
        ) : !meta ? (
          <div className="space-y-2.5">
            <Skeleton height={72} rounded="lg" />
            <Skeleton height={44} rounded="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cabecera de la tarjeta: se mantiene visible en los tres pasos. */}
            <div className="rounded-[12px] border border-hairline bg-[#FBFAFF] px-4 py-3">
              <p className="text-[14px] font-bold text-neutral-900">{meta.titular}</p>
              <p className="mt-0.5 font-mono text-[12.5px] tabular-nums text-neutral-500">
                {meta.emisor ?? "Tarjeta"} •••• {meta.ultimos4}
              </p>
              <p className="mt-1.5 text-[11.5px] text-neutral-400">
                {quedan
                  ? `Se borra en ${quedan}.`
                  : "Ya no está disponible: se borró de la bóveda."}
              </p>
            </div>

            {!disponible ? (
              <p className="rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-neutral-600">
                Estos datos ya no se pueden abrir. Pedile al pasajero que los cargue de nuevo con
                tu link.
              </p>
            ) : paso === "confirmar" ? (
              <div className="flex items-start gap-2.5 rounded-[12px] border border-[#8B5CF6]/20 bg-[#F5F3FF] px-4 py-3">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#8B5CF6]" />
                <p className="text-[12.5px] leading-relaxed text-[#5B21B6]">
                  {AVISO_AUDITORIA} Quedan tu nombre, la fecha y la tarjeta que abriste.
                </p>
              </div>
            ) : paso === "credencial" ? (
              <form onSubmit={(e) => void confirmarCredencial(e)} className="space-y-2.5">
                <label
                  htmlFor="revelar-credencial"
                  className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-400"
                >
                  Confirmá con tu PIN o tu contraseña
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    id="revelar-credencial"
                    type="password"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    value={credencial}
                    onChange={(e) => {
                      setCredencial(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••"
                    className="h-11 w-full rounded-[10px] border border-neutral-200 bg-white pl-10 pr-3 text-[14px] tracking-[0.2em] text-neutral-800 placeholder:tracking-normal placeholder:text-neutral-300 focus:border-[#8B5CF6]/60 focus:outline-none focus:ring-4 focus:ring-[#8B5CF6]/10"
                  />
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-1.5 text-[12.5px] font-medium text-[#CC2030]"
                  >
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
                <p className="text-[11.5px] text-neutral-400">{AVISO_AUDITORIA}</p>
                {/* Submit oculto: deja que Enter mande el formulario aunque el
                    botón visible viva en el footer del modal. */}
                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
              </form>
            ) : datos ? (
              <DatosCard datos={datos} onCopiar={(t, d) => toast("success", t, d)} />
            ) : null}
          </div>
        )}
      </ModalBody>

      {meta && disponible && paso !== "revelado" && (
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          {paso === "confirmar" ? (
            <Button type="button" onClick={() => setPaso("credencial")} leftIcon={<Eye size={14} />}>
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              loading={verificando}
              disabled={credencial.length < 4}
              onClick={() => void confirmarCredencial()}
              leftIcon={<Eye size={14} />}
            >
              Ver datos
            </Button>
          )}
        </ModalFooter>
      )}

      {paso === "revelado" && (
        <ModalFooter>
          <Button type="button" onClick={cerrar}>
            Listo, cerrar
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta con los datos en claro
// ---------------------------------------------------------------------------

function DatosCard({
  datos,
  onCopiar,
}: {
  datos: DatosRevelados;
  onCopiar: (titulo: string, detalle?: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiarNumero() {
    try {
      // Sin espacios: es lo que espera el formulario de la pasarela.
      await navigator.clipboard.writeText(datos.numero.replace(/\s/g, ""));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
      onCopiar("Número copiado", "Se borra del portapapeles cuando copies otra cosa.");
    } catch {
      onCopiar("No pudimos copiar", "Copialo a mano desde la tarjeta.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="rounded-[14px] border border-hairline bg-white p-4 shadow-[0_1px_2px_rgba(26,26,46,0.04)]">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
          Número
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="select-all font-mono text-[18px] font-bold tabular-nums tracking-wide text-neutral-900">
            {agrupar(datos.numero)}
          </span>
          <button
            type="button"
            onClick={() => void copiarNumero()}
            aria-label="Copiar el número de tarjeta"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-hairline bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#8B5CF6] transition hover:border-[#8B5CF6] hover:bg-[#F8F7FF]"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3">
          <Campo label="Vencimiento" valor={datos.vencimiento} mono />
          <Campo label="CVV" valor={datos.cvv} mono />
          <Campo label="Documento del titular" valor={datos.documentoTitular} />
          <Campo label="Cuotas" valor={datos.cuotas} />
          {datos.extras.map((e) => (
            <Campo key={e.id || e.etiqueta} label={e.etiqueta} valor={e.valor} />
          ))}
        </dl>
      </div>

      <p className="flex items-start gap-2 rounded-[12px] bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        Al cerrar esta ventana los datos desaparecen y hay que volver a confirmar la credencial
        para verlos otra vez.
      </p>
    </motion.div>
  );
}

function Campo({
  label,
  valor,
  mono = false,
}: {
  label: string;
  valor: string | null;
  mono?: boolean;
}) {
  if (!valor || !valor.trim()) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-[13.5px] font-semibold text-neutral-900 ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
