// ---------------------------------------------------------------------------
// Columna "CRM" de los listados de cotizaciones.
//
// Solo la Cotizacion se empuja a Bitrix (los dos formularios: consulta de un
// paquete y cotizador general), así que esto vive acá y no en los otros
// listados de leads.
//
// Lo que tiene que contestar de un vistazo: llegaron todos al CRM, y si alguno
// no llegó, cuál y qué hacer. El número de negocio se muestra siempre que haya,
// porque es el dato con el que el operador lo busca en Bitrix.
// ---------------------------------------------------------------------------

"use client";

import { useMemo, useTransition } from "react";
import { AlertTriangle, Check, Clock, RotateCw } from "lucide-react";
import type { CrmEstado } from "@prisma/client";
import { reintentarCrmCotizacion } from "@/actions/leads.actions";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/components/lib/cn";
import { fechaHoraLargaUY, relativeTime } from "./LeadsTable";

/** Campos que la celda necesita de la fila. Los dos listados los traen enteros. */
export type FilaCrm = {
  id: string;
  createdAt: Date;
  crmEstado: CrmEstado | null;
  crmDealId: string | null;
  crmModo: string | null;
  crmError: string | null;
  crmEnviadoEn: Date | null;
  crmIntentos: number;
};

// Un PENDIENTE recién nacido es normal: la fila se crea antes de empujar el
// lead a Bitrix, así que hay unos segundos en que todavía no hay respuesta.
// Pasados estos minutos ya no es demora, es que el envío nunca confirmó.
const MINUTOS_PENDIENTE_NORMAL = 10;

function pendienteColgado(fila: FilaCrm): boolean {
  if (fila.crmEstado !== "PENDIENTE") return false;
  const minutos = (Date.now() - fila.createdAt.getTime()) / 60_000;
  return minutos > MINUTOS_PENDIENTE_NORMAL;
}

/** Se puede reintentar lo que falló y lo que quedó colgado en PENDIENTE. */
function sePuedeReintentar(fila: FilaCrm): boolean {
  return fila.crmEstado === "ERROR" || pendienteColgado(fila);
}

// ---------------------------------------------------------------------------
// Celda
// ---------------------------------------------------------------------------

export function CeldaCrm({
  fila,
  onReintento,
}: {
  fila: FilaCrm;
  /** Se llama al terminar el reintento, con o sin éxito, para refrescar la fila. */
  onReintento?: () => void;
}) {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const [enviando, start] = useTransition();

  // El feedback va por toast (igual que el resto de las mutaciones del panel) y
  // por el refresco de la fila, que después del reintento muestra el estado
  // nuevo: negocio si entró, o el error nuevo si volvió a fallar.
  const reintentar = (e: React.MouseEvent) => {
    // La fila entera abre el drawer; el botón no debe abrirlo.
    e.stopPropagation();
    start(async () => {
      try {
        const res = await reintentarCrmCotizacion(fila.id);
        toast(
          res.ok ? "success" : "error",
          res.ok ? "Lead en el CRM" : "No se pudo enviar al CRM",
          res.message,
        );
      } catch (err) {
        toast("error", "No se pudo enviar al CRM", (err as Error).message);
      }
      onReintento?.();
    });
  };

  const botonReintentar = sePuedeReintentar(fila) && canEdit && (
    <button
      type="button"
      onClick={reintentar}
      disabled={enviando}
      title="Volver a enviar este lead a Bitrix"
      className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 hover:text-violet-900 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
    >
      <RotateCw className={cn("w-2.5 h-2.5", enviando && "animate-spin")} />
      {enviando ? "Enviando…" : "Reintentar"}
    </button>
  );

  // Sin dato: la cotización es anterior a que empezáramos a registrar el envío.
  // Va neutra a propósito: no sabemos si llegó, y no es lo mismo que fallar.
  if (fila.crmEstado === null) {
    return (
      <span
        className="text-[11px] text-neutral-300"
        title="Sin dato: este lead es anterior al registro de envíos al CRM."
      >
        —
      </span>
    );
  }

  if (fila.crmEstado === "OK") {
    const comentario = fila.crmModo === "comentario-en-negocio";
    return (
      <span
        className="flex flex-col leading-tight items-start whitespace-nowrap"
        title={[
          fila.crmDealId
            ? comentario
              ? `La consulta se sumó como comentario al negocio ${fila.crmDealId}, que ya estaba abierto. No genera una tarjeta nueva en Bitrix.`
              : `Negocio ${fila.crmDealId} en Bitrix.`
            : "Enviado al CRM.",
          fila.crmEnviadoEn ? `Enviado el ${fechaHoraLargaUY(fila.crmEnviadoEn)}` : "",
        ]
          .filter(Boolean)
          .join("\n")}
      >
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 tabular-nums">
          <Check className="w-3 h-3 shrink-0" />
          {fila.crmDealId ? `#${fila.crmDealId}` : "En el CRM"}
        </span>
        {comentario && (
          <span className="text-[10px] text-neutral-400">como comentario</span>
        )}
      </span>
    );
  }

  if (fila.crmEstado === "ERROR") {
    return (
      <span className="flex flex-col leading-tight items-start whitespace-nowrap">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600"
          title={[
            fila.crmError ? `No llegó al CRM: ${fila.crmError}` : "No llegó al CRM.",
            fila.crmIntentos > 1 ? `${fila.crmIntentos} intentos.` : "",
          ]
            .filter(Boolean)
            .join("\n")}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Sin enviar
        </span>
        {botonReintentar}
      </span>
    );
  }

  // PENDIENTE
  const colgado = pendienteColgado(fila);
  return (
    <span className="flex flex-col leading-tight items-start whitespace-nowrap">
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600"
        title={
          colgado
            ? `Se creó hace ${relativeTime(fila.createdAt)} y el envío al CRM nunca confirmó.${
                fila.crmError ? `\nÚltimo error: ${fila.crmError}` : ""
              }`
            : "Recién creado: el envío al CRM puede tardar unos segundos."
        }
      >
        <Clock className="w-3 h-3 shrink-0" />
        {colgado ? "Sin confirmar" : "Enviando…"}
      </span>
      {botonReintentar}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Resumen + filtro
// ---------------------------------------------------------------------------

export type FiltroCrm = "error" | "pendiente" | null;

export function filtraCrm(fila: FilaCrm, filtro: FiltroCrm): boolean {
  if (filtro === null) return true;
  if (filtro === "error") return fila.crmEstado === "ERROR";
  return pendienteColgado(fila);
}

type Resumen = {
  /** Filas con estado conocido (las NULL no cuentan: no sabemos si llegaron). */
  conEstado: number;
  ok: number;
  error: number;
  /** PENDIENTE de hace rato, el que sí es un problema. */
  colgado: number;
  /** PENDIENTE reciente, todavía dentro de lo normal. */
  enVuelo: number;
  sinDato: number;
};

function resumir(filas: FilaCrm[]): Resumen {
  const r: Resumen = {
    conEstado: 0,
    ok: 0,
    error: 0,
    colgado: 0,
    enVuelo: 0,
    sinDato: 0,
  };
  for (const f of filas) {
    if (f.crmEstado === null) {
      r.sinDato++;
      continue;
    }
    r.conEstado++;
    if (f.crmEstado === "OK") r.ok++;
    else if (f.crmEstado === "ERROR") r.error++;
    else if (pendienteColgado(f)) r.colgado++;
    else r.enVuelo++;
  }
  return r;
}

function Chip({
  activo,
  onClick,
  className,
  children,
  title,
}: {
  activo: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "px-1.5 py-0.5 rounded-full ring-1 ring-inset transition-colors",
        className,
        activo && "ring-2",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Contador de arriba del listado: "48 de 50 en el CRM · 1 sin enviar".
 *
 * Solo aparece cuando hay algo que mirar, es decir cuando al menos una fila
 * tiene estado. Un listado entero de leads viejos (todos sin dato) no muestra
 * nada, porque no habría nada que informar.
 */
export function ResumenCrm({
  filas,
  filtro,
  onFiltro,
}: {
  filas: FilaCrm[];
  filtro: FiltroCrm;
  onFiltro: (f: FiltroCrm) => void;
}) {
  const r = useMemo(() => resumir(filas), [filas]);
  if (r.conEstado === 0) return null;

  const todoBien = r.error === 0 && r.colgado === 0;
  const alternar = (f: Exclude<FiltroCrm, null>) =>
    onFiltro(filtro === f ? null : f);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span
        className={cn("font-medium", todoBien ? "text-emerald-700" : "text-neutral-600")}
        title="Cotizaciones que llegaron a Bitrix, sobre las que sí tenemos registro de envío."
      >
        {r.ok} de {r.conEstado} en el CRM
      </span>

      {r.error > 0 && (
        <Chip
          activo={filtro === "error"}
          onClick={() => alternar("error")}
          className="bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
          title="Ver solo los que no llegaron al CRM"
        >
          {r.error} sin enviar
        </Chip>
      )}

      {r.colgado > 0 && (
        <Chip
          activo={filtro === "pendiente"}
          onClick={() => alternar("pendiente")}
          className="bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
          title="Ver solo los que quedaron sin confirmar"
        >
          {r.colgado} sin confirmar
        </Chip>
      )}

      {r.enVuelo > 0 && (
        <span className="text-neutral-400">{r.enVuelo} enviándose</span>
      )}

      {r.sinDato > 0 && (
        <span
          className="text-neutral-400"
          title="Leads anteriores al registro de envíos al CRM: no sabemos si llegaron."
        >
          · {r.sinDato} sin dato
        </span>
      )}

      {filtro !== null && (
        <button
          type="button"
          onClick={() => onFiltro(null)}
          className="text-violet-600 hover:underline"
        >
          ver todos
        </button>
      )}
    </div>
  );
}
