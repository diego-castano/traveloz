"use client";

// ---------------------------------------------------------------------------
// Registro de la bóveda de pagos (vista global del admin).
//
// La tabla NUNCA trae datos de tarjeta: pasajero, titular, emisor, últimos 4 y
// fechas es todo lo que sale del server (getPagosAdmin selecciona campo por
// campo). Ver el número exige el segundo factor del RevelarModal, y esa
// apertura queda auditada - la UI lo dice antes de que el operador haga clic.
//
// "Enviar a ADM" es la otra puerta: manda los datos completos a la casilla de
// Administración configurada en Web → Notificaciones. No pide PIN (decisión
// del cliente) pero también queda auditado. El descifrado pasa entero en el
// server: de acá solo salen el id y el número de file.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CreditCard, ExternalLink, Eye, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { RevelarModal } from "@/app/backend/dashboard/_components/datos/RevelarModal";
import {
  EnviarAdmModal,
  type EnviarAdmTarget,
} from "@/app/backend/dashboard/_components/datos/EnviarAdmModal";
import {
  getFiltrosEnviosAdmin,
  getPagosAdmin,
  type FiltrosEnvios,
  type PagosAdminPage,
  type EstadoPagoAdmin,
} from "@/actions/datos-admin.actions";

const TODOS = "__todos";

const fechaCorta = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Reloj de la bóveda: "quedan 51 h" / "quedan 40 min", o null si ya murió. */
function restante(expiraAt: Date): string | null {
  const ms = new Date(expiraAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `${Math.max(1, minutos)} min`;
  return `${Math.floor(minutos / 60)} h`;
}

const ESTADO_LABEL: Record<EstadoPagoAdmin, string> = {
  vivo: "Sin abrir",
  visto: "Abierto",
  purgado: "Borrado",
};

const ESTADO_VARIANT: Record<EstadoPagoAdmin, "new" | "confirmed" | "archived"> = {
  vivo: "new",
  visto: "confirmed",
  purgado: "archived",
};

export function PagosTabla() {
  const [vendedorId, setVendedorId] = useState(TODOS);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosEnvios | null>(null);
  const [data, setData] = useState<PagosAdminPage | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [admTarget, setAdmTarget] = useState<EnviarAdmTarget | null>(null);

  useEffect(() => {
    getFiltrosEnviosAdmin()
      .then(setFiltros)
      .catch(() => setFiltros(null));
  }, []);

  const cargar = useCallback(() => {
    let vivo = true;
    setCargando(true);
    getPagosAdmin({ vendedorId: vendedorId === TODOS ? undefined : vendedorId, page })
      .then((d) => {
        if (!vivo) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setData(null);
        setError(
          e instanceof Error && e.message.includes("administradores")
            ? "Este registro es solo para administradores."
            : "No pudimos cargar la bóveda. Probá de nuevo.",
        );
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [vendedorId, page]);

  useEffect(() => cargar(), [cargar]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (error) {
    return (
      <div className="p-6">
        <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Datos de pago</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Las tarjetas viven 96 horas cifradas y después se borran solas. Acá queda el
            registro, aunque el dato ya no se pueda abrir.
          </p>
        </div>
        <Select
          className="w-[210px]"
          value={vendedorId}
          onValueChange={(v) => {
            setVendedorId(v);
            setPage(1);
          }}
          options={[
            { value: TODOS, label: "Todos los vendedores" },
            ...(filtros?.vendedores ?? []).map((v) => ({ value: v.id, label: v.nombre })),
          ]}
        />
      </div>

      <p className="flex items-start gap-2 rounded-[12px] border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-violet-900">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Como administrador podés abrir cualquier tarjeta. Cada apertura pide tu PIN o tu
        contraseña y queda registrada en la auditoría con tu nombre y la fecha.
      </p>

      <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left">
              <Th>Pasajero</Th>
              <Th>Tarjeta</Th>
              <Th>Vendedor</Th>
              <Th>Recibida</Th>
              <Th>Estado</Th>
              <Th>Administración</Th>
              <Th className="w-[130px]" />
            </tr>
          </thead>
          <tbody>
            {cargando && !data ? (
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton height={22} rounded="sm" />
                  </td>
                </tr>
              ))
            ) : (data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <CreditCard className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
                  <p className="text-[13px] text-neutral-500">
                    Todavía no cargó nadie sus datos de pago.
                  </p>
                </td>
              </tr>
            ) : (
              data!.rows.map((r) => {
                const quedan = r.estado === "purgado" ? null : restante(r.expiraAt);
                const vivo = r.estado !== "purgado";
                return (
                  <tr
                    key={r.id}
                    onClick={() => setAbierto(r.id)}
                    className="cursor-pointer border-b border-neutral-100 transition-colors last:border-0 hover:bg-violet-50/40"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">
                      {r.nombre}
                      {r.pasajeroNombre && r.titular.trim() !== r.pasajeroNombre.trim() && (
                        <span className="mt-0.5 block text-[11.5px] font-normal text-neutral-400">
                          Titular: {r.titular}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-neutral-600">
                      {r.emisor ?? "Tarjeta"} •••• {r.ultimos4}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-neutral-700">
                      {r.vendedorNombre}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12.5px] tabular-nums text-neutral-500">
                      {fechaCorta.format(new Date(r.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ESTADO_VARIANT[r.estado]} size="sm">
                        {ESTADO_LABEL[r.estado]}
                      </Badge>
                      <span className="ml-2 text-[11px] text-neutral-400">
                        {quedan ? `se borra en ${quedan}` : "ya no se puede abrir"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.enviadoAdmAt ? (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-700">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {r.numeroFile ? `file ${r.numeroFile}` : "Enviado"}
                          <span className="text-neutral-400">
                            · {fechaCorta.format(new Date(r.enviadoAdmAt))}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-neutral-300">Sin enviar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {vivo && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAbierto(r.id);
                              }}
                              title="Ver los datos de la tarjeta"
                              className="inline-flex items-center gap-1 rounded-[8px] border border-neutral-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
                            >
                              <Eye className="h-3 w-3" />
                              Ver datos
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdmTarget({
                                  id: r.id,
                                  nombre: r.nombre,
                                  ultimos4: r.ultimos4,
                                  emisor: r.emisor,
                                  numeroFile: r.numeroFile,
                                });
                              }}
                              title="Mandarle los datos completos a Administración"
                              className="inline-flex items-center gap-1 rounded-[8px] border border-neutral-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
                            >
                              <Building2 className="h-3 w-3" />
                              Enviar a ADM
                            </button>
                          </>
                        )}
                        <Link
                          href={`/backend/datos/pagos/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Abrir en su página"
                          className="inline-flex text-neutral-400 hover:text-violet-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-neutral-500">
            {data.total} registros · página {data.page} de {totalPages}
          </span>
          <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <RevelarModal
        pagoId={abierto}
        open={abierto !== null}
        onOpenChange={(o) => {
          if (!o) setAbierto(null);
        }}
        // Tras revelar, el registro pasó a "Abierto": la tabla lo refleja.
        onRevelado={cargar}
      />

      <EnviarAdmModal
        target={admTarget}
        open={admTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAdmTarget(null);
        }}
        onEnviado={cargar}
      />
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
