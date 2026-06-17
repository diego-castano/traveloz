"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCotizadorLanding } from "@/actions/cotizador.actions";

export function DeleteLandingButton({
  id,
  nombreMarca,
}: {
  id: string;
  nombreMarca: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`¿Eliminar el cotizador "${nombreMarca}"? Sus leads quedan en la base.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteCotizadorLanding(id);
        router.push("/backend/cotizadores");
        router.refresh();
      } catch {
        alert("No se pudo eliminar el cotizador.");
      }
    });
  }

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
