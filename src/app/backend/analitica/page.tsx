"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { getAnaliticaUtm } from "@/actions/analitica-utm.actions";
import type { DatosAnaliticaUtm } from "@/lib/analitica-utm-tipos";
import { AnaliticaUtmVista } from "./AnaliticaUtmVista";

export default function AnaliticaUtmPage() {
  const [datos, setDatos] = useState<DatosAnaliticaUtm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnaliticaUtm()
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar."));
  }, []);

  if (error) {
    return (
      <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div>
    );
  }
  if (!datos) return <PageSkeleton variant="dashboard" />;
  return <AnaliticaUtmVista datos={datos} />;
}
