"use client";

// ---------------------------------------------------------------------------
// LinkModal — el link personal del vendedor, en tres formas de compartirlo:
// mostrarlo (QR), mandarlo por email, o abrir el formulario para ver qué le
// llega al pasajero.
//
// El link y el QR se piden recién al abrir el modal: el QR es un PNG en
// data-URL que arma el server (la lib `qrcode` nunca entra al bundle).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Mail,
  QrCode,
  Send,
  Users,
} from "lucide-react";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  crearSolicitud,
  getMiLink,
  getMisSolicitudes,
  type MiLink,
  type SolicitudResumen,
} from "@/actions/datos-vendedor.actions";

export type TipoDato = "PASAJEROS" | "PAGO";

interface LinkModalProps {
  tipo: TipoDato;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<
  TipoDato,
  { titulo: string; descripcion: string; ayudaForm: string }
> = {
  PASAJEROS: {
    titulo: "Datos de pasajeros",
    descripcion: "Tu link para que el pasajero cargue los datos del grupo.",
    ayudaForm:
      "Así lo ve el pasajero: un formulario por persona, con documento y pasaporte adjuntos.",
  },
  PAGO: {
    titulo: "Datos de tarjeta",
    descripcion: "Tu link seguro para recibir los datos de pago.",
    ayudaForm:
      "Así lo ve el pasajero: los datos de la tarjeta viajan cifrados y se borran solos a las 72 horas.",
  },
};

const CHIP_ESTADO: Record<SolicitudResumen["estado"], { label: string; clase: string }> = {
  completada: { label: "Completada", clase: "bg-emerald-50 text-emerald-700" },
  vigente: { label: "Vigente", clase: "bg-neutral-100 text-neutral-500" },
  vencida: { label: "Vencida", clase: "bg-amber-50 text-amber-700" },
};

const fechaCorta = (d: Date) =>
  new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short" }).format(new Date(d));

export function LinkModal({ tipo, open, onOpenChange }: LinkModalProps) {
  const { toast } = useToast();
  const copy = COPY[tipo];

  const [link, setLink] = useState<MiLink | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ email: "", nombre: "", destino: "", referencia: "" });

  const cargarSolicitudes = useCallback(() => {
    getMisSolicitudes(tipo)
      .then(setSolicitudes)
      .catch(() => setSolicitudes([]));
  }, [tipo]);

  // Carga perezosa: nada de esto se pide hasta que el vendedor abre el modal.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setLink(null);
    setLinkError(null);
    setSolicitudes(null);
    getMiLink(tipo)
      .then((l) => {
        if (vivo) setLink(l);
      })
      .catch((err: unknown) => {
        if (vivo) setLinkError(err instanceof Error ? err.message : "No pudimos armar tu link.");
      });
    cargarSolicitudes();
    return () => {
      vivo = false;
    };
  }, [open, tipo, cargarSolicitudes]);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
      toast("success", "Link copiado", "Pegalo donde quieras compartirlo.");
    } catch {
      toast("error", "No pudimos copiar", "Copialo a mano desde el campo.");
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const r = await crearSolicitud({
        tipo,
        email: form.email,
        nombre: form.nombre,
        destino: form.destino,
        referencia: form.referencia,
      });
      if (r.ok) {
        toast("success", "Solicitud enviada", r.message);
        setForm({ email: "", nombre: "", destino: "", referencia: "" });
        cargarSolicitudes();
      } else {
        toast("error", "No se pudo enviar", r.message);
      }
    } catch (err) {
      toast(
        "error",
        "No se pudo enviar",
        err instanceof Error ? err.message : "Intentá de nuevo en un rato.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md">
      <ModalHeader
        title={copy.titulo}
        description={copy.descripcion}
        icon={tipo === "PAGO" ? <CreditCard size={18} /> : <Users size={18} />}
      />
      <ModalBody>
        {linkError ? (
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            {linkError}
          </div>
        ) : (
          <Tabs defaultValue="link" layoutId={`linkmodal-${tipo}`}>
            <TabsList>
              <TabsTrigger value="link">
                <span className="flex items-center gap-1.5">
                  <QrCode size={13} /> Mi link
                </span>
              </TabsTrigger>
              <TabsTrigger value="email">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} /> Enviar por email
                </span>
              </TabsTrigger>
              <TabsTrigger value="form">
                <span className="flex items-center gap-1.5">
                  <ExternalLink size={13} /> Ver formulario
                </span>
              </TabsTrigger>
            </TabsList>

            {/* ── Mi link ─────────────────────────────────────── */}
            <TabsContent value="link">
              {!link ? (
                <div className="space-y-3">
                  <Skeleton height={44} rounded="lg" />
                  <Skeleton height={200} rounded="xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-stretch gap-2">
                    <input
                      readOnly
                      value={link.url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-11 flex-1 rounded-[10px] border border-neutral-200 bg-neutral-50 px-3 font-mono text-[12.5px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/25"
                      aria-label="Tu link personal"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void copiar()}
                      leftIcon={copiado ? <Check size={14} /> : <Copy size={14} />}
                      className="shrink-0"
                    >
                      {copiado ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  {!link.linkActivo && (
                    <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                      Tu link está apagado: quien lo abra ve una página de cortesía. Pedile a un
                      administrador que lo prenda.
                    </p>
                  )}

                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="rounded-[16px] border border-neutral-200 bg-white p-4 shadow-[0_8px_24px_rgba(26,26,46,0.06)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={link.qrDataUrl}
                        alt="Código QR de tu link"
                        className="h-[190px] w-[190px]"
                      />
                    </div>
                    <p className="text-center text-[12px] text-neutral-500">
                      Mostralo desde el celu o pegalo en WhatsApp.
                    </p>
                  </motion.div>
                </div>
              )}
            </TabsContent>

            {/* ── Enviar por email ────────────────────────────── */}
            <TabsContent value="email">
              <form onSubmit={(e) => void enviar(e)} className="space-y-3">
                <Input
                  type="email"
                  required
                  label="Email del pasajero"
                  placeholder="pasajero@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Nombre"
                    placeholder="Opcional"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                  <Input
                    label="Destino"
                    placeholder="Opcional"
                    value={form.destino}
                    onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                  />
                </div>
                <Input
                  label="Referencia"
                  placeholder="Nº de reserva, apellido del grupo…"
                  value={form.referencia}
                  onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                />
                <Button
                  type="submit"
                  loading={enviando}
                  leftIcon={<Send size={14} />}
                  className="w-full"
                >
                  Enviar el formulario
                </Button>
              </form>

              <div className="mt-5">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                  Últimas solicitudes
                </p>
                {solicitudes === null ? (
                  <div className="space-y-2">
                    <Skeleton height={38} rounded="md" />
                    <Skeleton height={38} rounded="md" />
                  </div>
                ) : solicitudes.length === 0 ? (
                  <p className="rounded-[10px] bg-neutral-50 px-3 py-3 text-[12.5px] text-neutral-500">
                    Todavía no mandaste ninguna.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-100 overflow-hidden rounded-[10px] border border-neutral-200">
                    {solicitudes.map((s) => {
                      const chip = CHIP_ESTADO[s.estado];
                      return (
                        <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-neutral-800">
                              {s.destinatarioNombre || s.destinatarioEmail}
                            </p>
                            <p className="truncate text-[11px] text-neutral-400">
                              {fechaCorta(s.enviadoAt)}
                              {s.destino ? ` · ${s.destino}` : ""}
                              {s.referencia ? ` · ${s.referencia}` : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.clase}`}
                          >
                            {chip.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* ── Ver formulario ──────────────────────────────── */}
            <TabsContent value="form">
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-neutral-600">{copy.ayudaForm}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!link}
                  leftIcon={<ExternalLink size={14} />}
                  onClick={() => {
                    if (link) window.open(link.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Abrir el formulario
                </Button>
                <p className="text-[11.5px] text-neutral-400">
                  Se abre en una pestaña nueva. Es la misma página que ve el pasajero.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </ModalBody>
    </Modal>
  );
}
