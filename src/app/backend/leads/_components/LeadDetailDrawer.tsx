"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  ExternalLink,
  Trash2,
  FileDown,
  UserCheck,
  Megaphone,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useToast } from "@/components/ui/Toast";
import { deleteLead, type LeadKind } from "@/actions/leads.actions";
import { EstadoBadge } from "./EstadoBadge";
import type { EstadoMensaje } from "@prisma/client";
import type { Touch } from "@/lib/atribucion";
import { coalesceClickId, formatTouchFecha } from "./atribucion-admin";

type Field = {
  label: string;
  value: string | number | null | undefined;
  href?: string;
  icon?: typeof Mail;
};

export interface AssignableUser {
  id: string;
  name: string;
  role: string;
}

export interface AssignmentControl {
  /** Currently assigned userId, or null if unassigned. */
  current: string | null;
  /** Eligible users to assign — typically vendedor/admin. */
  options: AssignableUser[];
  /** Callback executed when the operator picks a different option. */
  onAssign: (userId: string | null) => Promise<void> | void;
}

type Props = {
  kind: LeadKind;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  onEstadoChange?: (next: EstadoMensaje) => void;
  /** Optional — when present, shows an "Asignar a" picker in the drawer. */
  assignment?: AssignmentControl;
  /**
   * Atribución de pauta (cookie tvz_attr) snapshoteada al convertir el lead.
   * `first`/`last` llegan ya re-validados (touchSchema.safeParse) por el caller.
   */
  atribucion?: { first?: Touch | null; last?: Touch | null } | null;
  /**
   * Historial de páginas vistas por el visitante antes de convertir, en
   * orden cronológico (más vieja primero). `null`/vacío → no se renderiza.
   */
  recorrido?: { url: string; ts: Date }[] | null;
  data: {
    id: string;
    title: string;
    subtitle?: string;
    createdAt: Date;
    estado?: EstadoMensaje;
    fields: Field[];
    longText?: { label: string; value: string | null | undefined };
    actions?: { label: string; href: string; icon?: typeof FileDown }[];
  } | null;
};

export function LeadDetailDrawer({
  kind,
  open,
  onClose,
  onDeleted,
  onEstadoChange,
  assignment,
  atribucion,
  recorrido,
  data,
}: Props) {
  const { toast } = useToast();
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const onDelete = async () => {
    if (!data) return;
    if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;
    try {
      await deleteLead(kind, data.id);
      toast("success", "Lead eliminado");
      onClose();
      onDeleted?.();
    } catch (e) {
      toast("error", "Error al eliminar", (e as Error).message);
    }
  };

  if (!open || !data) return null;

  const hasAtribucion = Boolean(atribucion?.first || atribucion?.last);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {data.estado &&
                kind !== "newsletter" && (
                  <EstadoBadge
                    kind={kind as Exclude<LeadKind, "newsletter">}
                    id={data.id}
                    estado={data.estado}
                    onChange={onEstadoChange}
                  />
                )}
              <span className="text-[11px] text-neutral-400">
                {data.createdAt.toLocaleString("es-UY", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 truncate">
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="text-sm text-neutral-500 truncate">
                {data.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-3">
            {data.fields.map((f, i) => {
              if (!f.value && f.value !== 0) return null;
              const Icon = f.icon;
              const content = (
                <div className="flex items-start gap-3">
                  {Icon && (
                    <Icon className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">
                      {f.label}
                    </div>
                    <div className="text-sm text-neutral-900 break-words">
                      {f.value}
                    </div>
                  </div>
                </div>
              );
              return (
                <div key={i}>
                  {f.href ? (
                    <a
                      href={f.href}
                      target={f.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="block hover:bg-neutral-50 -mx-3 px-3 py-1 rounded-md"
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>

          {data.longText && data.longText.value && (
            <div className="border-t border-neutral-200 pt-5">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {data.longText.label}
              </div>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {data.longText.value}
              </p>
            </div>
          )}

          {assignment && (
            <div className="border-t border-neutral-200 pt-5">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Asignado a
              </div>
              <SearchableSelect
                disabled={assignSaving}
                value={assignment.current ?? ""}
                placeholder="— Sin asignar —"
                searchPlaceholder="Buscar vendedor..."
                options={[
                  { value: "", label: "— Sin asignar —" },
                  ...assignment.options.map((u) => ({
                    value: u.id,
                    label: `${u.name} · ${u.role.toLowerCase()}`,
                  })),
                ]}
                onValueChange={async (v) => {
                  const next = v === "" ? null : v;
                  setAssignSaving(true);
                  try {
                    await assignment.onAssign(next);
                    toast(
                      "success",
                      next ? "Lead asignado" : "Asignación removida",
                    );
                  } catch (err) {
                    toast("error", "No se pudo asignar", (err as Error).message);
                  } finally {
                    setAssignSaving(false);
                  }
                }}
              />
              <p className="text-[11px] text-neutral-500 mt-1.5">
                El vendedor asignado verá esta cotización como propia y recibirá
                las notificaciones.
              </p>
            </div>
          )}

          {hasAtribucion && (
            <div className="border-t border-neutral-200 pt-5">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                Atribución de pauta
              </div>
              <div className="space-y-4">
                {atribucion?.first && (
                  <TouchBlock titulo="Entrada" touch={atribucion.first} />
                )}
                {atribucion?.last && (
                  <TouchBlock titulo="Último toque" touch={atribucion.last} />
                )}
              </div>
            </div>
          )}

          {recorrido && recorrido.length > 0 && (
            <div className="border-t border-neutral-200 pt-5">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                Recorrido
              </div>
              <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {recorrido.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 text-[12px] py-0.5"
                  >
                    <span className="text-neutral-700 break-all">{p.url}</span>
                    <span className="text-neutral-400 text-[11px] shrink-0 tabular-nums">
                      {p.ts.toLocaleString("es-UY", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.actions && data.actions.length > 0 && (
            <div className="border-t border-neutral-200 pt-5 space-y-2">
              {data.actions.map((a) => {
                const Icon = a.icon;
                return (
                  <a
                    key={a.href}
                    href={a.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 text-sm hover:bg-neutral-50 hover:border-violet-200"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {a.label}
                    <ExternalLink className="w-3 h-3 ml-auto text-neutral-400" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between gap-2 bg-neutral-50/50">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// TouchBlock — un touch (first o last) de la atribución de pauta. Mismo
// patrón dt/dd que el DetailPopover de newsletter (leads/newsletter/page.tsx).
// Todos los valores se muestran como texto plano: vienen de una cookie del
// visitante (input NO confiable) — nunca se usan como href.
// ---------------------------------------------------------------------------
function TouchBlock({ titulo, touch }: { titulo: string; touch: Touch }) {
  const click = coalesceClickId(touch);
  const rows: { label: string; value: string }[] = [];
  if (touch.src) rows.push({ label: "Fuente", value: touch.src });
  if (touch.med) rows.push({ label: "Medio", value: touch.med });
  if (touch.cmp) rows.push({ label: "Campaña", value: touch.cmp });
  if (touch.cnt) rows.push({ label: "Contenido", value: touch.cnt });
  if (touch.trm) rows.push({ label: "Término", value: touch.trm });
  if (click) {
    rows.push({ label: `Click ID (${click.label})`, value: click.value });
  }
  if (touch.lp) rows.push({ label: "Landing", value: touch.lp });
  // Fecha siempre presente (touchSchema la exige), así que va sin guard.
  rows.push({ label: "Fecha", value: formatTouchFecha(touch.ts) });

  return (
    <div>
      <div className="text-[11px] font-medium text-neutral-600 mb-1.5">
        {titulo}
      </div>
      <dl className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-2 text-[12px]">
            <dt className="text-neutral-500 shrink-0">{r.label}</dt>
            <dd className="text-neutral-900 break-all">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Re-export icons for convenience in pages
export {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  FileDown,
};
