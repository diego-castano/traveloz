"use client";

// ---------------------------------------------------------------------------
// PagosTab — la bóveda del vendedor.
//
// Acá NUNCA hay número de tarjeta ni CVV: la server action solo devuelve
// titular, emisor, últimos 4 y las fechas. La revelación con segundo factor la
// construye otro módulo; el botón "Ver datos" queda deshabilitado a propósito.
//
// El reloj de vencimiento se calcula en el cliente contra `expiraAt` y se
// refresca cada minuto: si lo mandáramos formateado desde el server quedaría
// congelado en el HTML hasta la próxima navegación.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CreditCard, Eye, Lock, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMisPagos, type EstadoPago, type PagoResumen } from "@/actions/datos-vendedor.actions";

const CHIP: Record<EstadoPago, { label: string; clase: string }> = {
  vivo: { label: "Sin abrir", clase: "bg-[#F1EEFF] text-[#8B5CF6]" },
  visto: { label: "Visto", clase: "bg-emerald-50 text-emerald-700" },
  purgado: { label: "Borrado", clase: "bg-neutral-100 text-neutral-400" },
};

/** "quedan 51 h" / "quedan 40 min". Devuelve null si ya venció. */
function restante(expiraAt: Date, ahora: number): string | null {
  const ms = new Date(expiraAt).getTime() - ahora;
  if (ms <= 0) return null;
  const minutos = Math.floor(ms / 60000);
  if (minutos < 60) return `quedan ${Math.max(1, minutos)} min`;
  const horas = Math.floor(minutos / 60);
  return `quedan ${horas} h`;
}

const fechaCorta = (d: Date) =>
  new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Montevideo",
  }).format(new Date(d));

export function PagosTab() {
  const [pagos, setPagos] = useState<PagoResumen[] | null>(null);
  // Tick por minuto: mueve todos los relojes de la grilla de una sola vez.
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    let vivo = true;
    getMisPagos()
      .then((r) => {
        if (vivo) setPagos(r);
      })
      .catch(() => {
        if (vivo) setPagos([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (pagos === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton height={148} rounded="xl" />
        <Skeleton height={148} rounded="xl" />
        <Skeleton height={148} rounded="xl" />
      </div>
    );
  }

  if (pagos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-hairline bg-white px-6 py-16 text-center">
        <ShieldCheck size={36} strokeWidth={1.5} className="mb-3 text-neutral-300" />
        <p className="text-[14px] font-semibold text-neutral-700">La bóveda está vacía</p>
        <p className="mt-1 max-w-[380px] text-[13px] text-neutral-500">
          Compartí tu link de datos de tarjeta para empezar. Lo que cargue el pasajero se guarda
          cifrado y se borra solo a las 72 horas.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {pagos.map((p, i) => {
        const chip = CHIP[p.estado];
        const quedan = p.estado === "purgado" ? null : restante(p.expiraAt, ahora);
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(i, 6) * 0.03 }}
            className={`rounded-[14px] border border-hairline bg-white p-4 shadow-[0_1px_2px_rgba(26,26,46,0.04),_0_4px_12px_rgba(26,26,46,0.04)] ${
              p.estado === "purgado" ? "opacity-70" : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#E8E5FF] to-[#DCFAF4]">
                <CreditCard size={16} className="text-[#8B5CF6]" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.clase}`}
              >
                {chip.label}
              </span>
            </div>

            <p className="truncate text-[14px] font-bold text-neutral-900">{p.titular}</p>
            <p className="mt-0.5 font-mono text-[12.5px] tabular-nums text-neutral-500">
              {p.emisor ?? "Tarjeta"} •••• {p.ultimos4}
            </p>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-neutral-400">{fechaCorta(p.createdAt)}</p>
                <p
                  className={`truncate text-[11.5px] font-semibold ${
                    quedan ? "text-[#8B5CF6]" : "text-neutral-400"
                  }`}
                >
                  {quedan ?? "Ya no está disponible"}
                </p>
              </div>

              {!p.purgadoAt && quedan ? (
                <button
                  type="button"
                  disabled
                  title="Disponible en breve"
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-[9px] border border-hairline bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-neutral-400"
                >
                  <Eye size={12} />
                  Ver datos
                </button>
              ) : (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-neutral-300"
                  title="Los datos ya se borraron de la bóveda"
                >
                  <Lock size={12} />
                  Borrado
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
