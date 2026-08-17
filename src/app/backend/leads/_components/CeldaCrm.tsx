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

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, Clock, RotateCw, Send } from "lucide-react";
import type { CrmEstado } from "@prisma/client";
import {
  listCrmPendientes,
  reintentarCrmCotizacion,
} from "@/actions/leads.actions";
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
      className="inline-flex items-center gap-1 -mx-1 mt-0.5 rounded px-1.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-50 hover:text-violet-900 disabled:text-neutral-400 disabled:ring-neutral-200 disabled:cursor-not-allowed transition-colors"
    >
      <RotateCw className={cn("w-3 h-3", enviando && "animate-spin")} />
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
  onReintento,
}: {
  filas: FilaCrm[];
  filtro: FiltroCrm;
  onFiltro: (f: FiltroCrm) => void;
  /** Se llama al terminar el reenvío masivo, para refrescar la tabla. */
  onReintento?: () => void;
}) {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  // `null` = sin envío en curso. Con envío: cuántos van sobre el total.
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(
    null,
  );
  // IDs de TODOS los pendientes del CRM, no solo los de esta pestaña: Leads
  // (consultas de paquete) y Cotizaciones (cotizador general) comparten tabla,
  // así que el botón reenvía todo junto sin importar dónde esté parado el
  // operador. `null` mientras carga la primera vez.
  const [pendientes, setPendientes] = useState<string[] | null>(null);

  // Recarga la lista global al montar y cada vez que la tabla se refresca (el
  // array `filas` cambia de referencia), para que el número del botón siga al
  // estado real después de reenviar o de que entre un lead nuevo.
  useEffect(() => {
    let vivo = true;
    listCrmPendientes()
      .then((ids) => {
        if (vivo) setPendientes(ids);
      })
      .catch(() => {
        if (vivo) setPendientes([]);
      });
    return () => {
      vivo = false;
    };
  }, [filas]);

  const r = useMemo(() => resumir(filas), [filas]);
  if (r.conEstado === 0) return null;

  const todoBien = r.error === 0 && r.colgado === 0;
  const alternar = (f: Exclude<FiltroCrm, null>) =>
    onFiltro(filtro === f ? null : f);

  // Reenvía, uno por uno, TODOS los pendientes del CRM (de las dos pestañas).
  // Secuencial a propósito: cada lead dispara varias llamadas a Bitrix y el
  // portal limita el ritmo, así que no conviene mandarlas todas juntas. Los que
  // ya están en el CRM se saltean solos dentro de la action (no duplica).
  const reenviarTodos = async () => {
    const ids = pendientes ?? [];
    if (ids.length === 0 || progreso) return;

    let ok = 0;
    let fallaron = 0;
    setProgreso({ hechos: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await reintentarCrmCotizacion(ids[i]);
        if (res.ok) ok++;
        else fallaron++;
      } catch {
        fallaron++;
      }
      setProgreso({ hechos: i + 1, total: ids.length });
    }
    setProgreso(null);
    // Refresca la tabla y la lista global (onReintento dispara un refresh de
    // `filas`, que a su vez re-corre el efecto de arriba).
    onReintento?.();
    setPendientes(await listCrmPendientes().catch(() => []));
    toast(
      fallaron === 0 ? "success" : "error",
      fallaron === 0 ? "Reenvío completo" : "Reenvío con errores",
      fallaron === 0
        ? `${ok} ${ok === 1 ? "lead entró" : "leads entraron"} al CRM.`
        : `${ok} entraron, ${fallaron} siguen sin entrar. Revisá el error de cada uno en la columna CRM.`,
    );
  };

  const puedeReenviar = pendientes?.length ?? 0;

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

      {canEdit && puedeReenviar > 0 && (
        <button
          type="button"
          onClick={reenviarTodos}
          disabled={progreso !== null}
          title="Reenvía a Bitrix, uno por uno, TODOS los que no llegaron — tanto los de Leads (consultas de paquete) como los de Cotizaciones (cotizador general)."
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send className={cn("w-3 h-3", progreso !== null && "animate-pulse")} />
          {progreso !== null
            ? `Enviando ${progreso.hechos} de ${progreso.total}…`
            : `Reenviar ${puedeReenviar} al CRM`}
        </button>
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
