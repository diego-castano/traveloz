"use client";

// ---------------------------------------------------------------------------
// PasajerosTab - la bandeja de envíos del vendedor dentro del dashboard.
//
// La tabla trae el resumen (contacto = primer pasajero del grupo) y el detalle
// se pide recién al expandir la fila: un envío puede tener hasta 12 pasajeros
// con adjuntos, y no tiene sentido traerlos todos de arranque.
//
// Abrir el detalle SELLA `vistoAt` del lado del server. Por eso, apenas llega,
// bajamos el chip "nuevo" en la fila sin recargar el listado entero.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRight,
  FileText,
  Inbox,
  Paperclip,
  ReceiptText,
  Ticket,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getMiEnvioDetalle,
  getMisEnvios,
  type EnvioDetalle,
  type EnvioResumen,
} from "@/actions/datos-vendedor.actions";
import { cotizacionesPorReferencia } from "@/actions/presupuesto.actions";
import { nombreCompleto } from "@/lib/datos-nombre";

const fechaHora = (d: Date) =>
  new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Montevideo",
  }).format(new Date(d));

const soloFecha = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(d))
    : "·";

export function PasajerosTab() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<EnvioResumen[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [openId, setOpenId] = useState<string | null>(null);
  // referencia (COT-…) → id de la cotización, para el link de vuelta al
  // cotizador. Una sola consulta por página, no una por fila.
  const [cotizaciones, setCotizaciones] = useState<Record<string, string>>({});

  useEffect(() => {
    let vivo = true;
    setRows(null);
    getMisEnvios({ page })
      .then((r) => {
        if (!vivo) return;
        setRows(r.rows);
        setTotal(r.total);
        setPageSize(r.pageSize);
      })
      .catch(() => {
        if (vivo) setRows([]);
      });
    return () => {
      vivo = false;
    };
  }, [page]);

  // El puente entre los dos módulos: la referencia del envío es el número de
  // la cotización cuando la solicitud salió desde el cotizador. Las que no
  // matchean ningún número (o caen fuera del scope) se quedan sin link.
  useEffect(() => {
    const refs = (rows ?? []).map((r) => r.referencia ?? "").filter(Boolean);
    if (!refs.length) return;
    let vivo = true;
    void cotizacionesPorReferencia(refs).then((res) => {
      if (!vivo || !res.ok) return;
      setCotizaciones(Object.fromEntries(res.data.map((c) => [c.numero, c.id])));
    });
    return () => {
      vivo = false;
    };
  }, [rows]);

  // El detalle sella vistoAt en el server; acá bajamos el chip en el acto.
  const marcarVisto = useCallback((id: string) => {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.id === id && !r.vistoAt ? { ...r, vistoAt: new Date() } : r))
        : prev,
    );
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  if (rows === null) {
    return (
      <div className="space-y-2">
        <Skeleton height={44} rounded="lg" />
        <Skeleton height={44} rounded="lg" />
        <Skeleton height={44} rounded="lg" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-hairline bg-white px-6 py-16 text-center">
        <Inbox size={36} strokeWidth={1.5} className="mb-3 text-neutral-300" />
        <p className="text-[14px] font-semibold text-neutral-700">
          Todavía no te llegó ningún envío
        </p>
        <p className="mt-1 max-w-[380px] text-[13px] text-neutral-500">
          Compartí tu link para empezar: mostrale el QR al pasajero o mandáselo por email desde el
          botón «Datos de pasajeros» de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[14px] border border-hairline bg-white shadow-[0_1px_2px_rgba(26,26,46,0.04),_0_4px_12px_rgba(26,26,46,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Fecha
              </th>
              <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Nombre y apellido
              </th>
              <th className="bg-[#FBFBFC] px-4 py-3 text-center text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Pasajeros
              </th>
              <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Destino
              </th>
              <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Referencia
              </th>
              <th className="bg-[#FBFBFC] px-4 py-3" style={{ width: "44px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EnvioRow
                key={row.id}
                row={row}
                isOpen={openId === row.id}
                onToggle={() => setOpenId((cur) => (cur === row.id ? null : row.id))}
                onVisto={() => marcarVisto(row.id)}
                cotizacionId={row.referencia ? cotizaciones[row.referencia] : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-[12.5px] text-neutral-500">
          <span>
            Página <strong className="font-bold text-neutral-900">{page}</strong> de{" "}
            <strong className="font-bold text-neutral-900">{totalPaginas}</strong> · {total} envíos
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[9px] border border-hairline bg-white px-3 py-1.5 font-semibold text-neutral-700 transition enabled:hover:border-[#8B5CF6] enabled:hover:text-[#8B5CF6] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPaginas}
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-[9px] border border-hairline bg-white px-3 py-1.5 font-semibold text-neutral-700 transition enabled:hover:border-[#8B5CF6] enabled:hover:text-[#8B5CF6] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila + detalle expandible
// ---------------------------------------------------------------------------

function EnvioRow({
  row,
  isOpen,
  onToggle,
  onVisto,
  cotizacionId,
}: {
  row: EnvioResumen;
  isOpen: boolean;
  onToggle: () => void;
  onVisto: () => void;
  /** Cotización a la que pertenece la referencia, si la hay. */
  cotizacionId?: string;
}) {
  const [detalle, setDetalle] = useState<EnvioDetalle | null>(null);
  const [error, setError] = useState(false);
  // Un envío se pide UNA vez por fila: `onVisto` cambia de identidad en cada
  // render del padre y sin este candado el efecto dispararía fetchs repetidos
  // mientras el primero está en vuelo (y cada uno vuelve a sellar vistoAt).
  const pedidoRef = useRef(false);

  useEffect(() => {
    if (!isOpen || pedidoRef.current) return;
    pedidoRef.current = true;
    let vivo = true;
    getMiEnvioDetalle(row.id)
      .then((d) => {
        if (!vivo) return;
        setDetalle(d);
        if (d) onVisto();
      })
      .catch(() => {
        if (vivo) {
          setError(true);
          pedidoRef.current = false; // que un reintento pueda volver a pedirlo
        }
      });
    return () => {
      vivo = false;
    };
  }, [isOpen, row.id, onVisto]);

  return (
    <>
      <tr
        className={`cursor-pointer border-t border-hairline transition ${
          isOpen ? "bg-[#F8F7FF]" : "hover:bg-[#FBFBFC]"
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-[12.5px] text-neutral-600">{fechaHora(row.createdAt)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900">{row.contacto}</span>
            {!row.vistoAt && (
              <span className="rounded-full bg-[#8B5CF6] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Nuevo
              </span>
            )}
          </div>
          {row.contactoEmail && (
            <div className="truncate text-[11.5px] text-neutral-400">{row.contactoEmail}</div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EEFF] px-2 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums text-[#8B5CF6]">
            <Users size={11} />
            {row.cantidad}
          </span>
        </td>
        <td className="px-4 py-3 text-[12.5px] text-neutral-600">{row.destino || "·"}</td>
        <td className="px-4 py-3 text-[12.5px] text-neutral-500">
          {cotizacionId ? (
            <a
              href={`/backend/cotizador?abrir=${cotizacionId}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-[7px] bg-[#F1EEFF] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[#8B5CF6] transition hover:bg-[#E6E0FF]"
              title="Abrir esta cotización en el cotizador"
            >
              <Ticket size={11} />
              {row.referencia}
            </a>
          ) : (
            row.referencia || "·"
          )}
        </td>
        <td className="px-2 py-3 text-center">
          <ChevronRight
            size={16}
            className={`text-neutral-400 transition-transform ${isOpen ? "rotate-90 text-[#8B5CF6]" : ""}`}
          />
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {isOpen && (
          <tr>
            <td colSpan={6} className="border-t-0 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="border-t border-hairline bg-[#FBFAFF] px-4 py-4">
                  {error ? (
                    <p className="text-[13px] text-neutral-500">
                      No pudimos cargar el detalle. Probá de nuevo.
                    </p>
                  ) : !detalle ? (
                    <div className="space-y-2">
                      <Skeleton height={70} rounded="lg" />
                      <Skeleton height={70} rounded="lg" />
                    </div>
                  ) : (
                    <DetalleEnvio detalle={detalle} />
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function DetalleEnvio({ detalle }: { detalle: EnvioDetalle }) {
  return (
    <div className="space-y-3">
      {detalle.pasajeros.map((p, i) => (
        <div
          key={p.id}
          className="rounded-[12px] border border-hairline bg-white p-4 shadow-[0_1px_2px_rgba(26,26,46,0.04)]"
        >
          <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Pasajero {i + 1}
            </span>
            <span className="text-[15px] font-bold text-neutral-900">
              {nombreCompleto(p)}
            </span>
          </div>

          {/* `Dato` no dibuja los valores vacíos: pasaporte, dirección,
              ciudad y país solo aparecen en los envíos VIEJOS, que sí los
              tienen cargados. Los nuevos ya no los piden. */}
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Dato label="Documento de viaje" valor={p.documento} />
            <Dato label="Nacimiento" valor={p.fechaNacimiento ? soloFecha(p.fechaNacimiento) : null} />
            <Dato label="Email" valor={p.email} />
            <Dato label="Teléfono" valor={p.telefono} />
            <Dato label="Pasaporte" valor={p.pasaporte} />
            <Dato label="Dirección" valor={p.direccion} />
            <Dato label="Ciudad" valor={p.ciudad} />
            <Dato label="País" valor={p.pais} />
            {p.respuestas.map((r) => (
              <Dato key={r.id || r.etiqueta} label={r.etiqueta} valor={r.valor} />
            ))}
          </dl>

          {(p.documentoArchivoUrl || p.pasaporteArchivoUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                <Paperclip size={11} /> Archivos
              </span>
              {p.documentoArchivoUrl && (
                <Adjunto url={p.documentoArchivoUrl} label="Foto del documento" />
              )}
              {p.pasaporteArchivoUrl && (
                <Adjunto url={p.pasaporteArchivoUrl} label="Archivo adicional" />
              )}
            </div>
          )}
        </div>
      ))}

      {detalle.factura && (
        <div className="rounded-[12px] border border-hairline bg-white p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
            <ReceiptText size={12} /> Facturación con RUT
          </p>
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Dato label="RUT" valor={detalle.factura.rut} />
            <Dato label="Razón social" valor={detalle.factura.razonSocial} />
            <Dato label="Email" valor={detalle.factura.email} />
            <Dato label="Dirección" valor={detalle.factura.direccion} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor || !String(valor).trim()) return null;
  return (
    <div className="flex gap-2 text-[12.5px]">
      <dt className="shrink-0 text-neutral-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-neutral-800">{valor}</dd>
    </div>
  );
}

function Adjunto({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-[8px] border border-hairline bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#8B5CF6] transition hover:border-[#8B5CF6] hover:bg-[#F8F7FF]"
    >
      <FileText size={12} />
      {label}
    </a>
  );
}
