"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, FileDown, ExternalLink } from "lucide-react";
import { listPostulaciones } from "@/actions/leads.actions";
import { EstadoBadge } from "../_components/EstadoBadge";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { LeadDetailDrawer } from "../_components/LeadDetailDrawer";

type Row = Awaited<ReturnType<typeof listPostulaciones>>[number];

export default function PostulacionesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const refresh = () =>
    listPostulaciones()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Postulaciones</h2>
        <p className="text-sm text-neutral-500 mt-1">
          CVs recibidos desde{" "}
          <a
            href="/work-with-us"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
          >
            /work-with-us <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400">Cargando…</div>
      ) : (
        <LeadsTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={setOpen}
          searchableFields={["nombre", "email", "telefono", "motivacion"]}
          searchPlaceholder="Buscar por candidato…"
          columns={[
            {
              key: "fecha",
              label: "",
              cell: (r) => (
                <span className="text-[11px] text-neutral-400 tabular-nums">
                  {relativeTime(r.createdAt)}
                </span>
              ),
              className: "w-12",
            },
            {
              key: "estado",
              label: "Estado",
              cell: (r) => (
                <EstadoBadge
                  kind="postulaciones"
                  id={r.id}
                  estado={r.estado}
                  onChange={refresh}
                />
              ),
              className: "w-32",
            },
            {
              key: "nombre",
              label: "Candidato",
              cell: (r) => (
                <div>
                  <div className="font-medium text-neutral-900">{r.nombre}</div>
                  <div className="text-[11px] text-neutral-500">{r.email}</div>
                </div>
              ),
            },
            {
              key: "cv",
              label: "CV",
              cell: (r) => (
                <a
                  href={r.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-violet-600 hover:underline text-[12px] inline-flex items-center gap-1"
                >
                  <FileDown className="w-3 h-3" />
                  {r.cvFilename}
                </a>
              ),
            },
            {
              key: "motivacion",
              label: "Motivación",
              cell: (r) => (
                <span className="text-[12px] text-neutral-600 line-clamp-1">
                  {r.motivacion}
                </span>
              ),
            },
          ]}
        />
      )}

      <LeadDetailDrawer
        kind="postulaciones"
        open={open !== null}
        onClose={() => setOpen(null)}
        onDeleted={refresh}
        onEstadoChange={refresh}
        data={
          open
            ? {
                id: open.id,
                title: open.nombre,
                createdAt: open.createdAt,
                estado: open.estado,
                fields: [
                  { label: "Email", value: open.email, href: `mailto:${open.email}`, icon: Mail },
                  open.telefono
                    ? {
                        label: "Teléfono",
                        value: open.telefono,
                        href: `tel:${open.telefono.replace(/\s/g, "")}`,
                        icon: Phone,
                      }
                    : { label: "", value: null },
                ],
                longText: {
                  label: "¿Qué te motiva a trabajar en TravelOz?",
                  value: open.motivacion,
                },
                actions: [
                  {
                    label: `Descargar ${open.cvFilename}`,
                    href: open.cvUrl,
                    icon: FileDown,
                  },
                ],
              }
            : null
        }
      />
    </div>
  );
}
