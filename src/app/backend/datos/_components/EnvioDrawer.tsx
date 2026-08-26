"use client";

// ---------------------------------------------------------------------------
// Drawer del envío de pasajeros. Mismo esqueleto que LeadDetailDrawer (panel
// derecho + overlay + Escape), con dos diferencias de fondo:
//   • no hay botón de borrar: un envío de pasajeros no se elimina desde acá.
//   • abrirlo SELLA vistoAt. Es la marca automática que acordamos: si alguien
//     del equipo ya lo leyó, deja de ser "nuevo" para todos.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getEnvioAdmin,
  marcarVistoAdmin,
  type EnvioAdminDetalle,
} from "@/actions/datos-admin.actions";
import { nombreCompleto } from "@/lib/datos-nombre";
import { EnvioDetalleView } from "./EnvioDetalleView";

export function EnvioDrawer({
  envioId,
  onClose,
  onVisto,
}: {
  /** `null` mantiene el drawer cerrado. */
  envioId: string | null;
  onClose: () => void;
  /** Se dispara cuando ESTA apertura fue la que selló el envío. */
  onVisto?: () => void;
}) {
  const [detalle, setDetalle] = useState<EnvioAdminDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!envioId) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [envioId, onClose]);

  // Guard de carrera: si el operador salta de fila antes de que resuelva, la
  // respuesta vieja no debe pisar el detalle de la fila nueva.
  useEffect(() => {
    let vivo = true;
    setDetalle(null);
    setError(null);
    if (!envioId) return;

    getEnvioAdmin(envioId)
      .then((d) => {
        if (!vivo) return;
        if (!d) setError("No encontramos este envío.");
        else setDetalle(d);
      })
      .catch(() => {
        if (vivo) setError("No pudimos cargar el detalle. Probá de nuevo.");
      });

    // El sello va en paralelo y es best-effort: si falla, el detalle igual se ve.
    marcarVistoAdmin(envioId)
      .then((sellado) => {
        if (vivo && sellado) onVisto?.();
      })
      .catch(() => {});

    return () => {
      vivo = false;
    };
    // onVisto no entra en las deps: el padre lo recrea en cada render y
    // re-dispararía la carga entera con cada refresh de la tabla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envioId]);

  if (!envioId) return null;

  const titulo = detalle
    ? detalle.pasajeros[0]
      ? nombreCompleto(detalle.pasajeros[0])
      : "Envío sin pasajeros"
    : "Cargando…";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 transition-opacity" onClick={onClose} />
      <aside className="animate-in slide-in-from-right fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-neutral-400">
              {detalle
                ? `${detalle.pasajeros.length} ${detalle.pasajeros.length === 1 ? "pasajero" : "pasajeros"}`
                : " "}
            </span>
            <h2 className="truncate text-lg font-semibold text-neutral-900">{titulo}</h2>
            {detalle && (
              <p className="truncate text-sm text-neutral-500">
                {detalle.destino ?? "Sin destino"}
                {detalle.referencia ? ` · ${detalle.referencia}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-50/40 px-6 py-5">
          {error ? (
            <p className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              {error}
            </p>
          ) : !detalle ? (
            <div className="space-y-3">
              <Skeleton height={90} rounded="lg" />
              <Skeleton height={160} rounded="lg" />
            </div>
          ) : (
            <EnvioDetalleView
              envio={detalle}
              vendedor={{ nombre: detalle.vendedorNombre, email: detalle.vendedorEmail }}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50/50 px-6 py-4">
          {detalle ? (
            <Link
              href={`/backend/datos/pasajeros/${detalle.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:underline"
            >
              Abrir en su página
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span />
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </aside>
    </>
  );
}
