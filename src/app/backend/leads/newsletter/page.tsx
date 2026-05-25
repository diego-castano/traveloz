"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  listSuscripciones,
  toggleNewsletterActive,
  deleteLead,
} from "@/actions/leads.actions";
import { useToast } from "@/components/ui/Toast";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { ExportButton } from "../_components/ExportButton";

type Row = Awaited<ReturnType<typeof listSuscripciones>>[number];

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
                <span className="text-[11px] text-neutral-500">
                  {r.source ?? "—"}
                </span>
              ),
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
