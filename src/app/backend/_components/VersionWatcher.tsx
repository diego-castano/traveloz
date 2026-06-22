"use client";

// ---------------------------------------------------------------------------
// VersionWatcher — detecta deploys nuevos mientras el panel está abierto.
//
// Con varias personas trabajando a la vez, una pestaña vieja puede quedar
// corriendo código anterior al último deploy. Al montar, guardamos el id de
// versión actual (/api/version) y lo re-consultamos cada POLL_MS. Si cambia,
// mostramos un cartel fijo con un botón "Actualizar" que recarga con la última
// versión. Sólo recarga cuando el usuario lo aprieta — nunca interrumpe solo.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

const POLL_MS = 60_000;

async function fetchVersion(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store", signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function VersionWatcher() {
  const [current, setCurrent] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();

    // Capturamos la versión con la que arrancó esta pestaña.
    fetchVersion(controller.signal).then((v) => {
      if (!stopped && v) setCurrent(v);
    });

    const tick = async () => {
      const v = await fetchVersion(controller.signal);
      if (stopped || !v) return;
      setCurrent((prev) => {
        // "dev" (local) nunca dispara el cartel.
        if (prev && v !== prev && v !== "dev") setUpdateReady(true);
        return prev ?? v;
      });
    };

    const id = window.setInterval(tick, POLL_MS);
    // Re-chequea al instante cuando la pestaña vuelve a primer plano.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-violet-300/60 bg-violet-600 px-4 py-2 text-white shadow-lg">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          Hay una versión nueva del panel disponible.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>
    </div>
  );
}
