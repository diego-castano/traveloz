"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Users,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import {
  listCotizaciones,
  listAssignableUsers,
  assignCotizacion,
} from "@/actions/leads.actions";
import { EstadoBadge } from "../_components/EstadoBadge";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { LeadDetailDrawer } from "../_components/LeadDetailDrawer";

type Row = Awaited<ReturnType<typeof listCotizaciones>>[number];
type User = Awaited<ReturnType<typeof listAssignableUsers>>[number];

export default function CotizacionesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const refresh = () =>
    listCotizaciones()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
    listAssignableUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Keep the open row in sync after a refresh so the assignment select
  // reflects the latest persisted value without the operator reopening it.
  useEffect(() => {
    if (!open) return;
    const fresh = rows.find((r) => r.id === open.id);
    if (fresh && fresh.asignadoAUserId !== open.asignadoAUserId) {
      setOpen(fresh);
    }
  }, [rows, open]);

  const total = (r: Row) => r.adultos + r.ninos + r.infantes;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Cotizaciones</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Solicitudes desde el sidebar del paquete y desde{" "}
          <a
            href="/cotizar"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
          >
            /cotizar <ExternalLink className="w-3 h-3" />
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
          searchableFields={["nombre", "email", "telefono", "comentarios"]}
          searchPlaceholder="Buscar por nombre, email, teléfono…"
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
                  kind="cotizaciones"
                  id={r.id}
                  estado={r.estado}
                  onChange={() => refresh()}
                />
              ),
              className: "w-32",
            },
            {
              key: "nombre",
              label: "Cliente",
              cell: (r) => (
                <div>
                  <div className="font-medium text-neutral-900">
                    {r.nombre}
                  </div>
                  <div className="text-[11px] text-neutral-500">{r.email}</div>
                </div>
              ),
            },
            {
              key: "paquete",
              label: "Paquete",
              cell: (r) =>
                r.paquete ? (
                  <a
                    href={`/backend/paquetes/${r.paquete.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-violet-600 hover:underline text-[12px]"
                  >
                    {r.paquete.titulo}
                  </a>
                ) : (
                  <span className="text-neutral-400 text-[12px] italic">
                    Standalone
                  </span>
                ),
            },
            {
              key: "fechas",
              label: "Fechas",
              cell: (r) => (
                <div className="text-[11px] text-neutral-600">
                  {r.fechaDesde && r.fechaHasta
                    ? `${r.fechaDesde.toLocaleDateString("es-UY")} → ${r.fechaHasta.toLocaleDateString("es-UY")}`
                    : "—"}
                </div>
              ),
            },
            {
              key: "pasajeros",
              label: "Pax",
              cell: (r) => (
                <span className="text-[12px] text-neutral-700 tabular-nums">
                  {total(r)}
                </span>
              ),
              className: "text-right w-12",
            },
            {
              key: "preferencia",
              label: "Pref.",
              cell: (r) => (
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                  {r.preferencia ?? "—"}
                </span>
              ),
            },
          ]}
        />
      )}

      <LeadDetailDrawer
        kind="cotizaciones"
        open={open !== null}
        onClose={() => setOpen(null)}
        onDeleted={refresh}
        onEstadoChange={() => refresh()}
        assignment={
          open
            ? {
                current: open.asignadoAUserId,
                options: users,
                onAssign: async (userId) => {
                  await assignCotizacion(open.id, userId);
                  await refresh();
                },
              }
            : undefined
        }
        data={
          open
            ? {
                id: open.id,
                title: open.nombre,
                subtitle: open.paquete?.titulo ?? "Cotización standalone",
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
                  open.fechaDesde && open.fechaHasta
                    ? {
                        label: "Fechas",
                        value: `${open.fechaDesde.toLocaleDateString("es-UY")} → ${open.fechaHasta.toLocaleDateString("es-UY")}`,
                        icon: Calendar,
                      }
                    : { label: "", value: null },
                  {
                    label: "Pasajeros",
                    value: `${open.adultos} adultos · ${open.ninos} niños · ${open.infantes} infantes`,
                    icon: Users,
                  },
                  open.preferencia
                    ? {
                        label: "Preferencia de contacto",
                        value: open.preferencia,
                        icon: MessageCircle,
                      }
                    : { label: "", value: null },
                  open.origen
                    ? { label: "Origen", value: open.origen }
                    : { label: "", value: null },
                ],
                longText: { label: "Comentarios", value: open.comentarios },
              }
            : null
        }
      />
    </div>
  );
}
