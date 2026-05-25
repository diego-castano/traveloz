"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { exportLeads, type LeadKind } from "@/actions/leads.actions";
import { useToast } from "@/components/ui/Toast";

export function ExportButton({
  kind,
  disabled,
}: {
  kind: LeadKind;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const handleExport = () =>
    start(async () => {
      try {
        const { filename, csv } = await exportLeads(kind);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("success", "Exportación lista", filename);
      } catch (e) {
        toast("error", "No se pudo exportar", (e as Error).message);
      }
    });

  return (
    <button
      onClick={handleExport}
      disabled={disabled || pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Descargar todos los leads en CSV (abre en Excel)"
    >
      <Download className="w-3.5 h-3.5" />
      {pending ? "Generando…" : "Exportar a Excel"}
    </button>
  );
}
