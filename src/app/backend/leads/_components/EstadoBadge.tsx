"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { EstadoMensaje } from "@prisma/client";
import { cn } from "@/components/lib/cn";
import {
  updateLeadEstado,
  type LeadKind,
} from "@/actions/leads.actions";

const ESTADOS: { value: EstadoMensaje; label: string; color: string }[] = [
  { value: "NUEVO", label: "Nuevo", color: "bg-violet-100 text-violet-800 ring-violet-200" },
  { value: "LEIDO", label: "Leído", color: "bg-blue-100 text-blue-800 ring-blue-200" },
  { value: "RESPONDIDO", label: "Respondido", color: "bg-amber-100 text-amber-800 ring-amber-200" },
  { value: "CERRADA", label: "Cerrado", color: "bg-neutral-200 text-neutral-700 ring-neutral-300" },
];

type Props = {
  kind: Exclude<LeadKind, "newsletter">;
  id: string;
  estado: EstadoMensaje;
  onChange?: (next: EstadoMensaje) => void;
};

export function EstadoBadge({ kind, id, estado, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const current = ESTADOS.find((e) => e.value === estado) ?? ESTADOS[0];

  const pick = (next: EstadoMensaje) => {
    setOpen(false);
    start(async () => {
      await updateLeadEstado(kind, id, next);
      onChange?.(next);
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset hover:opacity-80 transition",
          current.color,
        )}
      >
        {current.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 right-0 w-36 rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden">
            {ESTADOS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => pick(e.value)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] hover:bg-neutral-50 text-left"
              >
                <span>{e.label}</span>
                {e.value === estado && (
                  <Check className="w-3 h-3 text-violet-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
