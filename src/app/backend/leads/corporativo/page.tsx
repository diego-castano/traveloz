"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Briefcase, ExternalLink } from "lucide-react";
import {
  listContactosCorporativos,
  listAssignableUsers,
  assignLead,
} from "@/actions/leads.actions";
import { EstadoBadge } from "../_components/EstadoBadge";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { LeadDetailDrawer } from "../_components/LeadDetailDrawer";

type Row = Awaited<ReturnType<typeof listContactosCorporativos>>[number];
type User = Awaited<ReturnType<typeof listAssignableUsers>>[number];

export default function CorporativoLeadsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const refresh = () =>
    listContactosCorporativos()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
    listAssignableUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const fresh = rows.find((r) => r.id === open.id);
    if (fresh && fresh.asignadoAUserId !== open.asignadoAUserId) {
      setOpen(fresh);
    }
  }, [rows, open]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Contactos corporativos
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Consultas de empresas desde{" "}
          <a
            href="/corporativo"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
          >
            /corporativo <ExternalLink className="w-3 h-3" />
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
          searchableFields={["nombre", "email", "empresa", "cargo", "comentarios"]}
          searchPlaceholder="Buscar por empresa, contacto, cargo…"
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
                  kind="corporativo"
                  id={r.id}
                  estado={r.estado}
                  onChange={refresh}
                />
              ),
              className: "w-32",
            },
            {
              key: "empresa",
              label: "Empresa",
              cell: (r) => (
                <div>
                  <div className="font-medium text-neutral-900">
                    {r.empresa}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {r.nombre}
                    {r.cargo ? ` · ${r.cargo}` : ""}
                  </div>
                </div>
              ),
            },
            {
              key: "email",
              label: "Email",
              cell: (r) => (
                <span className="text-[12px] text-neutral-600">{r.email}</span>
              ),
            },
            {
              key: "preview",
              label: "Mensaje",
              cell: (r) => (
                <span className="text-[12px] text-neutral-600 line-clamp-1">
                  {r.comentarios ?? "—"}
                </span>
              ),
            },
          ]}
        />
      )}

      <LeadDetailDrawer
        kind="corporativo"
        open={open !== null}
        onClose={() => setOpen(null)}
        onDeleted={refresh}
        onEstadoChange={refresh}
        assignment={
          open
            ? {
                current: open.asignadoAUserId,
                options: users,
                onAssign: async (userId) => {
                  await assignLead("corporativo", open.id, userId);
                  await refresh();
                },
              }
            : undefined
        }
        data={
          open
            ? {
                id: open.id,
                title: open.empresa,
                subtitle: `${open.nombre}${open.cargo ? ` · ${open.cargo}` : ""}`,
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
                  open.cargo
                    ? { label: "Cargo", value: open.cargo, icon: Briefcase }
                    : { label: "", value: null },
                ],
                longText: { label: "Mensaje", value: open.comentarios },
              }
            : null
        }
      />
    </div>
  );
}
