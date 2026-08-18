"use client";

// ---------------------------------------------------------------------------
// Bandeja global de pasajeros: toolbar de filtros + tabla + drawer de detalle.
//
// El filtro que pidió el cliente es "por pasajero", no por envío: escribís un
// apellido o un documento y aparece el grupo que lo contiene (la búsqueda va
// con `pasajeros.some` del lado del server). Por eso el input dice "Buscar
// pasajero" y no "Buscar".
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  exportEnviosCsv,
  getEnviosAdmin,
  getFiltrosEnviosAdmin,
  type EnviosAdminPage,
  type FiltrosEnvios,
} from "@/actions/datos-admin.actions";
import { EnvioDrawer } from "./EnvioDrawer";

/** Radix Select no acepta un item con value "", así que el "todos" va con centinela. */
const TODOS = "__todos";

const fechaCorta = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function EnviosBandeja() {
  const { toast } = useToast();

  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [vendedorId, setVendedorId] = useState(TODOS);
  const [destino, setDestino] = useState(TODOS);
  const [page, setPage] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosEnvios | null>(null);
  const [data, setData] = useState<EnviosAdminPage | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  // Debounce del input: la búsqueda pega contra la DB con un `some` sobre
  // pasajeros, no queremos una query por tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(texto.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    getFiltrosEnviosAdmin()
      .then(setFiltros)
      .catch(() => setFiltros(null));
  }, []);

  const cargar = useCallback(() => {
    let vivo = true;
    setCargando(true);
    getEnviosAdmin({
      busqueda: busqueda || undefined,
      vendedorId: vendedorId === TODOS ? undefined : vendedorId,
      destino: destino === TODOS ? undefined : destino,
      page,
    })
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
            ? "Esta bandeja es solo para administradores."
            : "No pudimos cargar los envíos. Probá de nuevo.",
        );
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [busqueda, vendedorId, destino, page]);

  useEffect(() => cargar(), [cargar]);

  async function exportar() {
    if (exportando) return;
    setExportando(true);
    try {
      const r = await exportEnviosCsv({
        busqueda: busqueda || undefined,
        vendedorId: vendedorId === TODOS ? undefined : vendedorId,
        destino: destino === TODOS ? undefined : destino,
      });
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("success", "Exportación lista", `${r.filas} pasajeros en ${r.filename}`);
    } catch (e) {
      toast("error", "No se pudo exportar", (e as Error).message);
    } finally {
      setExportando(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hayFiltros = Boolean(busqueda) || vendedorId !== TODOS || destino !== TODOS;

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
          <h2 className="text-xl font-semibold text-neutral-900">Pasajeros</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Todos los grupos que llegaron por los links de datos de pasajeros.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportar()}
          disabled={exportando || (data?.total ?? 0) === 0}
          title="Descargar los envíos filtrados en CSV, una fila por pasajero"
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exportando ? "Generando…" : "Exportar a Excel"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar pasajero por nombre, apellido, documento o email"
            className="h-9 w-full rounded-[8px] border border-[rgba(17,17,36,0.14)] bg-white pl-9 pr-3 text-[13.5px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
          />
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
            ...(filtros?.vendedores ?? []).map((v) => ({
              value: v.id,
              label: v.slug ? `${v.nombre} · /${v.slug}` : v.nombre,
            })),
          ]}
        />

        <Select
          className="w-[190px]"
          value={destino}
          onValueChange={(v) => {
            setDestino(v);
            setPage(1);
          }}
          options={[
            { value: TODOS, label: "Todos los destinos" },
            ...(filtros?.destinos ?? []).map((d) => ({ value: d, label: d })),
          ]}
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left">
              <Th>Fecha</Th>
              <Th>Contacto</Th>
              <Th className="text-center">Pax</Th>
              <Th>Vendedor</Th>
              <Th>Destino</Th>
              <Th className="w-[70px]" />
            </tr>
          </thead>
          <tbody>
            {cargando && !data ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton height={22} rounded="sm" />
                  </td>
                </tr>
              ))
            ) : (data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <Users className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
                  <p className="text-[13px] text-neutral-500">
                    {hayFiltros
                      ? "Ningún envío coincide con estos filtros."
                      : "Todavía no llegó ningún envío de pasajeros."}
                  </p>
                </td>
              </tr>
            ) : (
              data!.rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setAbierto(r.id)}
                  className="cursor-pointer border-b border-neutral-100 transition-colors last:border-0 hover:bg-violet-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[12.5px] tabular-nums text-neutral-500">
                    {fechaCorta.format(new Date(r.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-neutral-900">
                      {r.contacto}
                    </div>
                    {r.contactoEmail && (
                      <div className="truncate text-[11.5px] text-neutral-400">
                        {r.contactoEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-[12.5px] tabular-nums text-neutral-600">
                    {r.cantidad}
                  </td>
                  {/* La columna del vendedor va SIEMPRE visible: es la bandeja
                      de todo el equipo y el dueño del link importa. */}
                  <td className="px-4 py-3 text-[12.5px] text-neutral-700">
                    {r.vendedorNombre}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-600">
                    {r.destino || "—"}
                    {r.referencia && (
                      <span className="block text-[11px] text-neutral-400">
                        {r.referencia}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!r.vistoAt && <Badge variant="new" size="sm">Nuevo</Badge>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-neutral-500">
            {data.total} envíos · página {data.page} de {totalPages}
          </span>
          <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <EnvioDrawer
        envioId={abierto}
        onClose={() => setAbierto(null)}
        // Al sellar un envío se recarga la tabla para que el chip "Nuevo"
        // desaparezca sin obligar al operador a refrescar.
        onVisto={cargar}
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
