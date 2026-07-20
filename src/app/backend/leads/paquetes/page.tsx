// ---------------------------------------------------------------------------
// "Leads" — interesados que completaron el formulario de un paquete concreto.
// Son las Cotizacion con paqueteId seteado (las standalone de /cotizar viven en
// la pestaña Cotizaciones). Muestra el paquete de forma visual (miniatura +
// título + destino) junto a los datos del interesado.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Users,
  MessageCircle,
  Package,
  ImageOff,
} from "lucide-react";
import {
  listLeadsPaquete,
  listAssignableUsers,
  assignCotizacion,
  getRecorridoVisitante,
} from "@/actions/leads.actions";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import { EstadoBadge } from "../_components/EstadoBadge";
import { LeadsTable, relativeTime } from "../_components/LeadsTable";
import { LeadDetailDrawer } from "../_components/LeadDetailDrawer";
import { ExportButton } from "../_components/ExportButton";
import { parseAtribJson } from "../_components/atribucion-admin";

type Row = Awaited<ReturnType<typeof listLeadsPaquete>>[number];
type User = Awaited<ReturnType<typeof listAssignableUsers>>[number];

export default function LeadsPaquetePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const [recorrido, setRecorrido] = useState<{ url: string; ts: Date }[] | null>(
    null,
  );

  const refresh = () =>
    listLeadsPaquete()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
    listAssignableUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Mantiene sincronizada la fila abierta tras un refresh, para que el select
  // de asignación refleje lo persistido sin reabrir el drawer.
  useEffect(() => {
    if (!open) return;
    const fresh = rows.find((r) => r.id === open.id);
    if (fresh && fresh.asignadoAUserId !== open.asignadoAUserId) {
      setOpen(fresh);
    }
  }, [rows, open]);

  // Trae el recorrido de páginas vistas del visitante al abrir un row (si
  // tiene visitanteId). Guard de carrera igual que UserProvider.tsx: si el
  // operador cambia de fila antes de que resuelva, la respuesta vieja no
  // debe pisar el recorrido de la fila nueva.
  useEffect(() => {
    let cancelled = false;
    setRecorrido(null);
    if (!open?.visitanteId) return;
    getRecorridoVisitante(open.visitanteId)
      .then((paginas) => {
        if (cancelled) return;
        setRecorrido(paginas.map((p) => ({ url: p.url, ts: p.createdAt })));
      })
      .catch((err) => {
        console.error("Error fetching recorrido:", err);
      });
    return () => {
      cancelled = true;
    };
    // Solo re-dispara al cambiar de fila (id), no ante cualquier mutación
    // de `open` (ej. reasignación) — visitanteId es fijo para un mismo id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  const total = (r: Row) => r.adultos + r.ninos + r.infantes;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Leads</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Interesados que pidieron cotización desde el formulario de un
            paquete, con el paquete que les interesa.
          </p>
        </div>
        <ExportButton kind="leads" disabled={rows.length === 0} />
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
              key: "paquete",
              label: "Paquete de interés",
              cell: (r) => {
                const foto = r.paquete?.fotos?.[0];
                return (
                  <a
                    href={`/backend/paquetes/${r.paquete?.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 group"
                  >
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyThumbUrl(foto.url, 160)}
                        alt={foto.alt || r.paquete?.titulo || ""}
                        className="w-12 h-9 rounded object-cover shrink-0 border border-neutral-200"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-12 h-9 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                        <ImageOff className="w-3.5 h-3.5 text-neutral-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-violet-700 group-hover:underline truncate">
                        {r.paquete?.titulo}
                      </div>
                      {r.paquete?.destino && (
                        <div className="text-[11px] text-neutral-500 truncate">
                          {r.paquete.destino}
                        </div>
                      )}
                    </div>
                  </a>
                );
              },
            },
            {
              key: "nombre",
              label: "Interesado",
              cell: (r) => (
                <div>
                  <div className="font-medium text-neutral-900">{r.nombre}</div>
                  <div className="text-[11px] text-neutral-500">{r.email}</div>
                  {r.telefono && (
                    <div className="text-[11px] text-neutral-400">
                      {r.telefono}
                    </div>
                  )}
                </div>
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
        atribucion={
          open
            ? {
                first: parseAtribJson(open.atribFirst),
                last: parseAtribJson(open.atribLast),
              }
            : null
        }
        recorrido={recorrido}
        data={
          open
            ? {
                id: open.id,
                title: open.nombre,
                subtitle: open.paquete?.titulo ?? "—",
                createdAt: open.createdAt,
                estado: open.estado,
                fields: [
                  {
                    label: "Paquete",
                    value: open.paquete?.titulo ?? "—",
                    href: open.paquete
                      ? `/backend/paquetes/${open.paquete.id}`
                      : undefined,
                    icon: Package,
                  },
                  open.paquete?.destino
                    ? { label: "Destino", value: open.paquete.destino }
                    : { label: "", value: null },
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
