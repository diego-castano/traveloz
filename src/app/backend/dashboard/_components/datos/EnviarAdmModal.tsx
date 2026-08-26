"use client";

// ---------------------------------------------------------------------------
// EnviarAdmModal - mandarle a Administración los datos de una tarjeta.
//
// Un solo dato de entrada: el número de file. Es obligatorio porque es la
// clave con la que Administración archiva el cobro, y viaja en el asunto del
// email ("Datos de pago · file 11000 · Ana Pérez").
//
// El envío NO pide PIN (decisión del cliente del 26/08/2026): la sesión del
// vendedor alcanza. La contrapartida es que queda auditado, y el modal lo
// dice antes de mandar - nadie tiene que enterarse después.
//
// De acá NO sale ni un dígito de la tarjeta: el componente solo manda el id y
// el file; el descifrado y el armado del email pasan enteros en el server.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Building2, Send, ShieldCheck } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { enviarPagoAAdm } from "@/actions/datos-vendedor.actions";

/**
 * Violeta de marca (brand-violet-500/600) para el CTA. Todo lo que toca la
 * tarjeta va en violeta y no en el rojo/teal por defecto: el color tiene que
 * transmitir seguridad, no alarma (pedido del cliente, 26/08/2026). Va inline
 * porque el Button primario trae su gradiente clay por `style`.
 */
const CTA_VIOLETA: React.CSSProperties = {
  background: "linear-gradient(145deg, #8B5CF6 0%, #6C2BD9 100%)",
  boxShadow:
    "6px 6px 16px rgba(108,43,217,0.22), -3px -3px 10px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.3)",
};

export interface EnviarAdmTarget {
  id: string;
  /** Con qué nombre se muestra el registro (pasajero, o titular en los viejos). */
  nombre: string;
  ultimos4: string;
  emisor: string | null;
  /** File anterior, si ya se había mandado: se precarga para reenviar igual. */
  numeroFile?: string | null;
}

export function EnviarAdmModal({
  target,
  open,
  onOpenChange,
  onEnviado,
}: {
  target: EnviarAdmTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se dispara tras un envío exitoso, para refrescar la fila. */
  onEnviado?: () => void;
}) {
  const { toast } = useToast();
  const [numeroFile, setNumeroFile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Cada apertura arranca limpia, con el file anterior precargado si lo hay.
  useEffect(() => {
    if (!open) return;
    setNumeroFile(target?.numeroFile ?? "");
    setError(null);
    setEnviando(false);
  }, [open, target?.numeroFile]);

  async function enviar(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (enviando || !target) return;
    const file = numeroFile.trim();
    if (!file) {
      setError("Ingresá el número de file.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const r = await enviarPagoAAdm(target.id, { numeroFile: file });
      if (r.ok) {
        toast("success", "Enviado a Administración", r.message);
        onEnviado?.();
        onOpenChange(false);
      } else {
        setError(r.message);
      }
    } catch {
      setError("No se pudo enviar. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalHeader
        title="Enviar a Administración"
        description="Les llegan los datos completos para procesar el cobro."
        icon={<Building2 size={18} />}
        onClose={() => onOpenChange(false)}
      />

      <ModalBody>
        <div className="space-y-4">
          {target && (
            <div className="rounded-[12px] border border-hairline bg-[#FBFAFF] px-4 py-3">
              <p className="text-[14px] font-bold text-neutral-900">{target.nombre}</p>
              <p className="mt-0.5 font-mono text-[12.5px] tabular-nums text-neutral-500">
                {target.emisor ?? "Tarjeta"} •••• {target.ultimos4}
              </p>
            </div>
          )}

          <form onSubmit={(e) => void enviar(e)} className="space-y-2">
            <label
              htmlFor="adm-file"
              className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-400"
            >
              Número de file
            </label>
            <input
              id="adm-file"
              type="text"
              maxLength={40}
              autoComplete="off"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={numeroFile}
              onChange={(e) => {
                setNumeroFile(e.target.value);
                if (error) setError(null);
              }}
              placeholder="11000"
              className="h-11 w-full rounded-[10px] border border-neutral-200 bg-white px-3 text-[14px] text-neutral-800 placeholder:text-neutral-300 focus:border-[#8B5CF6]/60 focus:outline-none focus:ring-4 focus:ring-[#8B5CF6]/10"
            />
            <p className="text-[11.5px] text-neutral-400">
              Va en el asunto del email para que Administración lo archive.
            </p>
            {error && (
              <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800">
                {error}
              </p>
            )}
            {/* Submit oculto: deja que Enter mande el formulario aunque el
                botón visible viva en el footer del modal. */}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>

          <p className="flex items-start gap-2.5 rounded-[12px] border border-[#8B5CF6]/20 bg-[#F5F3FF] px-4 py-3 text-[12.5px] leading-relaxed text-[#5B21B6]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#8B5CF6]" />
            El envío queda registrado en la auditoría con tu nombre, la fecha y el file. La
            tarjeta sigue en la bóveda hasta que venza.
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          loading={enviando}
          disabled={numeroFile.trim().length === 0}
          onClick={() => void enviar()}
          leftIcon={<Send size={14} />}
          style={CTA_VIOLETA}
        >
          Enviar a ADM
        </Button>
      </ModalFooter>
    </Modal>
  );
}
