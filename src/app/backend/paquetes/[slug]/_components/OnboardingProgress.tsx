"use client";

// ---------------------------------------------------------------------------
// OnboardingProgress — sticky progress strip on the paquete detail page.
//
// The operator (Lucha + her team) used to land on a fresh paquete and have
// no idea what to do next: 7 tabs, no orientation, validation feedback
// buried inside the Datos tab. This component lives on the detail page
// header and answers two questions at a glance:
//
//   1. How "done" is this paquete (visual progress + percent)?
//   2. What's the very next thing I should do, and where do I click?
//
// It hides itself once the paquete is in ACTIVO with publicado=true so it
// doesn't add visual noise to mature packages.
// ---------------------------------------------------------------------------

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import {
  usePaqueteServices,
  useOpcionesHoteleras,
  useDestinos,
} from "@/components/providers/PackageProvider";
import { computeNochesTotales } from "@/lib/utils";
import type { Paquete } from "@/lib/types";

// Each step maps to a tab plus a "what's missing" predicate. Order matches
// the natural creation flow.
type Step = {
  key: string;
  label: string;
  tab: string;
  done: boolean;
  /** Plain-language explanation of why this step is still pending — shown
   * on hover so the operator knows exactly what to fix without having to
   * navigate to the tab and figure it out. */
  blocker?: string;
};

function buildSteps(args: {
  paquete: Paquete;
  aereoCount: number;
  opcionCount: number;
  destinoCount: number;
  nochesOk: boolean;
}): Step[] {
  const { paquete, aereoCount, opcionCount, destinoCount, nochesOk } = args;
  const missingTitulo = !paquete.titulo?.trim();
  const missingDestino = !paquete.destino?.trim();
  return [
    {
      key: "titulo",
      label: "Título y datos básicos",
      tab: "datos",
      done: !missingTitulo && !missingDestino,
      blocker:
        missingTitulo && missingDestino
          ? "Falta cargar el título y el destino del paquete."
          : missingTitulo
          ? "Falta el título del paquete."
          : missingDestino
          ? "Falta el destino del paquete."
          : undefined,
    },
    {
      key: "destinos",
      label: "Itinerario (al menos 1 destino)",
      tab: "alojamientos",
      done: destinoCount > 0 && nochesOk,
      blocker:
        destinoCount === 0
          ? "No hay destinos en el itinerario. Agregá al menos uno desde la pestaña Alojamientos."
          : !nochesOk
          ? "Las noches por destino no coinciden con el total del paquete. Ajustalas desde Alojamientos."
          : undefined,
    },
    {
      key: "aereo",
      label: "Al menos 1 aéreo",
      tab: "servicios",
      done: aereoCount > 0,
      blocker:
        aereoCount === 0
          ? "Sin aéreos asignados. Asigná al menos uno desde la pestaña Servicios."
          : undefined,
    },
    {
      key: "hotel",
      label: "Al menos 1 opción hotelera",
      tab: "alojamientos",
      done: opcionCount > 0,
      blocker:
        opcionCount === 0
          ? "Sin opciones hoteleras. Creá una desde la pestaña Alojamientos asignando hoteles a cada destino."
          : undefined,
    },
    {
      key: "publicar",
      // The publish gate (server-side in updatePaqueteFrontend) requires
      // slug + heroImage already, so once the toggle is on we know those
      // are set. That's why this single step covers foto, slug and publish.
      label: "Publicar en el sitio (foto, slug y toggle)",
      tab: "publicacion",
      done: paquete.estado === "ACTIVO",
      blocker:
        paquete.estado !== "ACTIVO"
          ? "Cuando esté todo listo, andá a Publicación, completá foto principal + slug y prendé el toggle Publicar."
          : undefined,
    },
  ];
}

export function OnboardingProgress({ paquete }: { paquete: Paquete }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const services = usePaqueteServices(paquete.id);
  const opciones = useOpcionesHoteleras(paquete.id);
  const destinos = useDestinos(paquete.id);

  const nochesPaquete = paquete.noches ?? 0;
  const nochesDestinos = computeNochesTotales(destinos);
  const nochesOk = nochesPaquete === 0 ? destinos.length > 0 : nochesDestinos === nochesPaquete;

  const steps = buildSteps({
    paquete,
    aereoCount: services.aereos.length,
    opcionCount: opciones.length,
    destinoCount: destinos.length,
    nochesOk,
  });

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);

  // Mature packages don't need the onboarding strip — once published and 100%
  // complete, hide it entirely.
  if (!nextStep) return null;

  const goToTab = (tab: string) => {
    const current = searchParams.get("tab");
    if (current === tab) return;
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="rounded-[12px] border border-amber-200 bg-amber-50/50 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[12px] font-medium text-amber-800">
          Progreso del paquete: {percent}%{" "}
          <span className="text-amber-600 font-normal">
            ({completed}/{steps.length} pasos)
          </span>
        </div>
        <button
          type="button"
          onClick={() => goToTab(nextStep.tab)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-800 hover:text-amber-900"
        >
          Siguiente: {nextStep.label}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </div>

      {/* Steps row — incomplete steps show their blocker on hover */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {steps.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goToTab(s.tab)}
            className={`inline-flex items-center gap-1.5 text-[11.5px] transition-opacity ${
              s.done ? "text-neutral-400" : "text-amber-700 font-medium hover:text-amber-900"
            }`}
            title={
              s.done
                ? `Ir a la pestaña ${s.tab}`
                : s.blocker
                ? `${s.blocker} (clic para ir a ${s.tab})`
                : `Ir a la pestaña ${s.tab}`
            }
          >
            {s.done ? (
              <Check className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-amber-400 shrink-0" />
            )}
            <span className={s.done ? "line-through" : ""}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Highlight the very next blocker in plain language so the operator
          sees the actionable detail without having to hover step by step. */}
      {nextStep.blocker && (
        <p className="mt-2 text-[11.5px] text-amber-700/90 leading-snug">
          <span className="font-semibold">Pendiente: </span>
          {nextStep.blocker}
        </p>
      )}
    </div>
  );
}
