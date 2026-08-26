"use client";

// ---------------------------------------------------------------------------
// LinkModal - el link personal del vendedor, en tres formas de compartirlo:
// mostrarlo (QR), mandarlo por email, o abrir el formulario para ver qué le
// llega al pasajero.
//
// El link y el QR se piden recién al abrir el modal: el QR es un PNG en
// data-URL que arma el server (la lib `qrcode` nunca entra al bundle).
//
// En la variante PAGO el CTA va en VIOLETA y no en el rojo/teal del Button
// primario: la tarjeta es el trámite más delicado del panel y el color tiene
// que transmitir seguridad, no alarma (pedido del cliente, 26/08/2026).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Mail,
  QrCode,
  RefreshCw,
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
  previewSolicitudEmail,
  type MiLink,
  type PreviewSolicitud,
  type SolicitudResumen,
} from "@/actions/datos-vendedor.actions";
import {
  listarPresupuestos,
  type FilaPresupuesto,
} from "@/actions/presupuesto.actions";

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
      "Así lo ve el pasajero: los datos de la tarjeta viajan cifrados y se borran solos a las 96 horas.",
  },
};

/**
 * Violeta de marca (brand-violet-600/700) para el CTA de la pantalla de
 * tarjeta. Va inline porque el Button primario trae su gradiente clay por
 * `style` y una clase de Tailwind no lo pisaría.
 */
const CTA_VIOLETA: React.CSSProperties = {
  background: "linear-gradient(145deg, #8B5CF6 0%, #6C2BD9 100%)",
  boxShadow:
    "6px 6px 16px rgba(108,43,217,0.22), -3px -3px 10px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.3)",
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
  // Últimas cotizaciones del vendedor, para el autocompletado de la referencia.
  // Si eligiendo un COT-… se precarga el destino, lo que vuelva del pasajero
  // queda atado a esa cotización sin que nadie escriba nada a mano.
  const [cotizaciones, setCotizaciones] = useState<FilaPresupuesto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ email: "", nombre: "", destino: "", referencia: "" });

  // Vista previa del email ("Ver cómo le llega"): plegada por defecto, se
  // pide recién al expandir por primera vez.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewSolicitud | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Contador de pedidos del link: la respuesta que llega tarde (modal cerrado,
  // solapa cambiada, "Reintentar" apretado dos veces) se descarta sola.
  const pedidoLink = useRef(0);

  const cargarLink = useCallback(() => {
    const pedido = pedidoLink.current + 1;
    pedidoLink.current = pedido;
    setLink(null);
    setLinkError(null);
    getMiLink(tipo)
      .then((r) => {
        if (pedidoLink.current !== pedido) return;
        if (r.ok) setLink(r);
        else setLinkError(r.message);
      })
      .catch(() => {
        if (pedidoLink.current !== pedido) return;
        setLinkError("No pudimos armar tu link. Probá de nuevo en un rato.");
      });
  }, [tipo]);

  const cargarSolicitudes = useCallback(() => {
    getMisSolicitudes(tipo)
      .then(setSolicitudes)
      .catch(() => setSolicitudes([]));
  }, [tipo]);

  const cargarPreview = useCallback(() => {
    setPreviewLoading(true);
    setPreviewError(null);
    previewSolicitudEmail(tipo, {
      destinatarioNombre: form.nombre,
      destino: form.destino,
      referencia: form.referencia,
    })
      .then((p) => {
        if (p.ok) setPreview(p);
        else setPreviewError(p.message);
      })
      .catch((err: unknown) => {
        setPreviewError(
          err instanceof Error ? err.message : "No pudimos armar la vista previa.",
        );
      })
      .finally(() => setPreviewLoading(false));
  }, [tipo, form.nombre, form.destino, form.referencia]);

  function togglePreview() {
    setPreviewOpen((abierto) => {
      const next = !abierto;
      if (next && !preview && !previewLoading) cargarPreview();
      return next;
    });
  }

  // Carga perezosa: nada de esto se pide hasta que el vendedor abre el modal.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setSolicitudes(null);
    setPreviewOpen(false);
    setPreview(null);
    setPreviewError(null);
    cargarLink();
    cargarSolicitudes();
    void listarPresupuestos({ take: 20 }).then((res) => {
      if (vivo && res.ok) setCotizaciones(res.data);
    });
    return () => {
      vivo = false;
      // Descarta la respuesta en vuelo del link al cerrar el modal.
      pedidoLink.current += 1;
    };
  }, [open, tipo, cargarLink, cargarSolicitudes]);

  // Escribir (o elegir) un número de cotización trae el destino de arrastre.
  function setReferencia(valor: string) {
    const cot = cotizaciones.find((c) => c.numero === valor.trim());
    setForm((f) => ({
      ...f,
      referencia: valor,
      destino: cot?.destino?.trim() || f.destino,
      nombre:
        f.nombre ||
        [cot?.clienteNombre, cot?.clienteApellido].filter(Boolean).join(" ").trim(),
      email: f.email || cot?.clienteEmail || "",
    }));
  }

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
          <div className="space-y-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] text-amber-800">{linkError}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={13} />}
              onClick={() => cargarLink()}
            >
              Reintentar
            </Button>
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
                  label="Referencia (nº de cotización)"
                  placeholder="COT-2026-0148, apellido del grupo…"
                  list="linkmodal-cotizaciones"
                  value={form.referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
                <datalist id="linkmodal-cotizaciones">
                  {cotizaciones.map((c) => (
                    <option key={c.id} value={c.numero}>
                      {[c.clienteNombre, c.clienteApellido].filter(Boolean).join(" ")}
                      {c.destino ? ` · ${c.destino}` : ""}
                    </option>
                  ))}
                </datalist>
                <Button
                  type="submit"
                  loading={enviando}
                  leftIcon={<Send size={14} />}
                  className="w-full"
                  style={tipo === "PAGO" ? CTA_VIOLETA : undefined}
                >
                  Enviar el formulario
                </Button>
              </form>

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={togglePreview}
                  className="flex w-full items-center justify-between text-left text-[12.5px] font-semibold text-neutral-700"
                  aria-expanded={previewOpen}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} /> Ver cómo le llega
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-neutral-400 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {previewOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="pt-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11.5px] text-neutral-400">
                            Así lo ve el pasajero en su casilla.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={previewLoading}
                            leftIcon={<RefreshCw size={12} />}
                            onClick={() => cargarPreview()}
                          >
                            Actualizar vista previa
                          </Button>
                        </div>

                        {previewError ? (
                          <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                            {previewError}
                          </p>
                        ) : !preview || previewLoading ? (
                          <Skeleton height={420} rounded="lg" />
                        ) : (
                          <div className="overflow-hidden rounded-[12px] border border-neutral-200">
                            <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2">
                              <p className="truncate text-[12px] text-neutral-500">
                                <span className="font-semibold text-neutral-700">Asunto: </span>
                                {preview.subject}
                              </p>
                            </div>
                            <iframe
                              srcDoc={preview.html}
                              sandbox=""
                              title="Vista previa del email"
                              className="h-[420px] w-full bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
