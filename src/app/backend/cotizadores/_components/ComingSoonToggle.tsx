"use client";

import { useState, useTransition } from "react";
import { setComingSoon } from "@/actions/cotizador.actions";

export function ComingSoonToggle({ initial }: { initial: boolean }) {
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    startTransition(async () => {
      try {
        await setComingSoon(next);
        setActive(next);
      } catch {
        /* el estado no cambia si falla */
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-neutral-900">
          Sitio principal en “Próximamente”
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {active
            ? "El público ve la pantalla Próximamente. El equipo logueado ve el sitio real."
            : "El sitio principal está visible para todo el público."}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
          active ? "bg-emerald-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            active ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
