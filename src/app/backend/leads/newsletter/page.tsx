"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Info, Trash2 } from "lucide-react";
import {
  listSuscripciones,
  toggleNewsletterActive,
  deleteLead,
} from "@/actions/leads.actions";
import { useToast } from "@/components/ui/Toast";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { ExportButton } from "../_components/ExportButton";
import {
  parseAtribJson,
  coalesceClickId,
  formatTouchFecha,
} from "../_components/atribucion-admin";
import type { Touch } from "@/lib/atribucion";

type Row = Awaited<ReturnType<typeof listSuscripciones>>[number];

// Cuantos campos de consentimiento/UTM/atribución tienen dato — para decidir
// si mostramos el icono "Detalle" en la columna. Si todo es null, no
// saturamos la tabla con un boton que abre un popover vacio.
function hasDetail(r: Row): boolean {
  return Boolean(
    r.consentIp ||
      r.consentUserAgent ||
      r.utmSource ||
      r.utmMedium ||
      r.utmCampaign ||
      r.utmContent ||
      r.utmTerm ||
      r.atribFirst ||
      r.atribLast,
  );
}

export default function NewsletterPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [, start] = useTransition();

  const refresh = () =>
    listSuscripciones()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Newsletter</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Suscriptores desde el form del footer / hero de la home.
          </p>
        </div>
        <ExportButton kind="newsletter" disabled={rows.length === 0} />
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400">Cargando…</div>
      ) : (
        <LeadsTable
          rows={rows}
          rowKey={(r) => r.id}
          searchableFields={["email", "source"]}
          searchPlaceholder="Buscar por email…"
          columns={[
            {
              key: "fecha",
              label: "Suscrito",
              cell: (r) => (
                <span className="text-[11px] text-neutral-400 tabular-nums">
                  {relativeTime(r.createdAt)}
                </span>
              ),
              className: "w-20",
            },
            {
              key: "email",
              label: "Email",
              cell: (r) => (
                <span className="font-medium text-neutral-900">{r.email}</span>
              ),
            },
            {
              key: "source",
              label: "Origen",
              cell: (r) => (
                <span
                  className="text-[11px] text-neutral-500 block max-w-[180px] truncate"
                  title={r.source ?? ""}
                >
                  {r.source ?? "—"}
                </span>
              ),
              className: "w-44",
            },
            {
              key: "datos",
              label: "Datos",
              cell: (r) => (
                <DetailPopover row={r} />
              ),
              className: "w-14",
            },
            {
              key: "estado",
              label: "Estado",
              cell: (r) => (
                <button
                  onClick={() =>
                    start(async () => {
                      await toggleNewsletterActive(r.id);
                      await refresh();
                    })
                  }
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 ring-inset ${
                    r.active
                      ? "bg-green-100 text-green-800 ring-green-200"
                      : "bg-neutral-100 text-neutral-500 ring-neutral-200"
                  }`}
                >
                  {r.active ? "Activo" : "Baja"}
                </button>
              ),
              className: "w-24",
            },
            {
              key: "actions",
              label: "",
              cell: (r) => (
                <button
                  onClick={() =>
                    start(async () => {
                      if (!confirm(`Eliminar ${r.email}?`)) return;
                      try {
                        await deleteLead("newsletter", r.id);
                        await refresh();
                        toast("success", "Eliminado");
                      } catch (e) {
                        toast("error", "Error", (e as Error).message);
                      }
                    })
                  }
                  className="text-red-600 hover:text-red-700"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ),
              className: "w-12 text-right",
            },
          ]}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPopover — boton "i" con popover React stateful. Muestra UTM, IP y
// UA capturados al opt-in. Se cierra al hacer click afuera o al apretar
// Escape. Si el row no tiene ninguno de esos campos, mostramos un guion
// en vez del boton para no saturar la tabla.
// ---------------------------------------------------------------------------

function DetailPopover({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasDetail(row)) {
    return <span className="text-neutral-300 text-xs">—</span>;
  }

  // Truncar UA para que no rompa el layout si alguien tiene un UA gigante.
  const ua = row.consentUserAgent ?? "";
  const uaShort = ua.length > 80 ? ua.slice(0, 80) + "…" : ua;
  // Atribución de pauta (cookie tvz_attr): el Json guardado se re-valida
  // siempre antes de mostrarse. Semántica distinta de los utm_* de arriba,
  // que son el snapshot legal de consentimiento al opt-in.
  const first = parseAtribJson(row.atribFirst);
  const last = parseAtribJson(row.atribLast);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
        title="Ver UTM, IP y user-agent"
        aria-label="Ver detalle del opt-in"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-80 max-w-[90vw] bg-white border border-neutral-200 rounded-lg shadow-xl p-4 text-left">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Datos del opt-in
          </div>
          <dl className="space-y-1.5 text-[12px]">
            <Field label="IP" value={row.consentIp} />
            <Field label="User Agent" value={uaShort || null} fullWidth />
            <div className="border-t border-neutral-100 my-2" />
            <Field label="utm_source" value={row.utmSource} />
            <Field label="utm_medium" value={row.utmMedium} />
            <Field label="utm_campaign" value={row.utmCampaign} />
            <Field label="utm_content" value={row.utmContent} />
            <Field label="utm_term" value={row.utmTerm} />
            {(first || last) && (
              <>
                <div className="border-t border-neutral-100 my-2" />
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Pauta (cookie)
                </div>
                {first && <TouchFields prefix="Entrada" touch={first} />}
                {last && <TouchFields prefix="Último" touch={last} />}
              </>
            )}
            <div className="border-t border-neutral-100 my-2" />
            <Field
              label="Confirmado"
              value={row.confirmedAt ? new Date(row.confirmedAt).toLocaleString("es-UY") : null}
            />
            <Field
              label="Dado de baja"
              value={
                row.unsubscribedAt
                  ? new Date(row.unsubscribedAt).toLocaleString("es-UY")
                  : null
              }
            />
          </dl>
        </div>
      )}
    </div>
  );
}

// TouchFields — líneas de un touch (first o last) de la atribución de pauta,
// reusando el mismo <Field> dt/dd de acá abajo. El prefijo ("Entrada" /
// "Último") distingue las dos dentro de la lista plana del popover.
function TouchFields({ prefix, touch }: { prefix: string; touch: Touch }) {
  const click = coalesceClickId(touch);
  return (
    <>
      {touch.src && <Field label={`${prefix} · Fuente`} value={touch.src} />}
      {touch.med && <Field label={`${prefix} · Medio`} value={touch.med} />}
      {touch.cmp && <Field label={`${prefix} · Campaña`} value={touch.cmp} />}
      {touch.cnt && <Field label={`${prefix} · Contenido`} value={touch.cnt} />}
      {touch.trm && <Field label={`${prefix} · Término`} value={touch.trm} />}
      {click && (
        <Field
          label={`${prefix} · Click ID (${click.label})`}
          value={click.value}
        />
      )}
      {touch.lp && <Field label={`${prefix} · Landing`} value={touch.lp} />}
      <Field label={`${prefix} · Fecha`} value={formatTouchFecha(touch.ts)} />
    </>
  );
}

function Field({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  const v = value?.trim();
  return (
    <div className={`flex ${fullWidth ? "flex-col gap-0.5" : "items-baseline gap-2"}`}>
      <dt className="text-neutral-500 text-[11px] shrink-0">{label}</dt>
      <dd
        className={`text-neutral-900 break-all ${
          fullWidth ? "text-[11px]" : "truncate"
        }`}
      >
        {v ? v : <span className="text-neutral-300">—</span>}
      </dd>
    </div>
  );
}
