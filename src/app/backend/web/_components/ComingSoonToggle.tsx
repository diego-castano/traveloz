"use client";

import { useEffect, useState, useTransition } from "react";
import { getComingSoonState, setComingSoon } from "@/actions/cotizador.actions";

// Control de visibilidad del sitio principal (SiteSetting coming_soon_activo).
// Vive arriba del todo en el header del módulo Frontend, siempre visible.
// Trae su propio estado al montar (el layout que lo contiene es client).
export function ComingSoonToggle() {
  const [active, setActive] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getComingSoonState()
      .then(setActive)
      .catch(() => setActive(true));
  }, []);

  function toggle() {
    if (active === null) return;
    const next = !active;
    setActive(next); // optimista
    startTransition(async () => {
      try {
        await setComingSoon(next);
      } catch {
        setActive(!next); // revertir si falla
      }
    });
  }

  const loading = active === null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 transition-colors ${
        active
          ? "border-amber-300 bg-amber-50"
          : "border-neutral-200 bg-white"
      }`}
      title="Cuando está activo, el público ve “Próximamente”. El equipo logueado ve el sitio real."
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          loading ? "bg-neutral-300" : active ? "bg-amber-500" : "bg-emerald-500"
        }`}
      />
      <div className="leading-tight">
        <div className="text-[12px] font-semibold text-neutral-900">
          Sitio principal
        </div>
        <div className="text-[11px] text-neutral-500">
          {loading ? "…" : active ? "En “Próximamente”" : "Visible al público"}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading || pending}
        aria-pressed={!!active}
        aria-label="Alternar modo Próximamente"
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
          active ? "bg-amber-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            active ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
