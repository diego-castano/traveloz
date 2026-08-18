"use client";

// ---------------------------------------------------------------------------
// Cabecera + solapas de /backend/datos, con los contadores en vivo.
//
// Mismo patrón que /backend/leads/layout.tsx: los counts se piden en un
// useEffect atado al pathname, así vuelven frescos cada vez que el admin
// cambia de solapa (un envío recién abierto baja el badge de "sin ver").
// ---------------------------------------------------------------------------

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, FileSliders, UserRound, Users } from "lucide-react";
import { cn } from "@/components/lib/cn";
import {
  getDatosAdminCounts,
  type DatosAdminCounts,
} from "@/actions/datos-admin.actions";

type Solapa = {
  href: string;
  label: string;
  icon: typeof Users;
  /** Total de la solapa. `undefined` = sin contador (Formularios). */
  countKey?: keyof DatosAdminCounts;
  /** Badge violeta destacado (envíos sin abrir). */
  freshKey?: keyof DatosAdminCounts;
};

const SOLAPAS: Solapa[] = [
  {
    href: "/backend/datos/pasajeros",
    label: "Pasajeros",
    icon: Users,
    countKey: "envios",
    freshKey: "enviosSinVer",
  },
  {
    href: "/backend/datos/pagos",
    label: "Datos de pago",
    icon: CreditCard,
    countKey: "pagosVivos",
  },
  {
    href: "/backend/datos/formularios",
    label: "Formularios",
    icon: FileSliders,
  },
];

export function DatosTabs() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<DatosAdminCounts | null>(null);

  useEffect(() => {
    getDatosAdminCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [pathname]);

  return (
    <div className="shrink-0 border-b border-neutral-200/80 bg-white px-6 pt-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <UserRound className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
            Pasajeros y pagos
          </h1>
          <p className="text-xs text-neutral-500">
            Todo lo que cargan los pasajeros por los links de los vendedores.
          </p>
        </div>
      </div>

      <nav className="mt-4 flex items-end gap-1">
        {SOLAPAS.map((s) => {
          const active = pathname.startsWith(s.href);
          const Icon = s.icon;
          const total = s.countKey ? counts?.[s.countKey] ?? null : null;
          const fresh = s.freshKey ? counts?.[s.freshKey] ?? 0 : 0;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "-mb-px flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-[13px] transition-colors",
                active
                  ? "border-violet-600 font-medium text-violet-900"
                  : "border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active ? "text-violet-600" : "text-neutral-400",
                )}
              />
              <span>{s.label}</span>
              {total !== null && (
                <span className="text-[10px] tabular-nums text-neutral-400">{total}</span>
              )}
              {fresh > 0 && (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tabular-nums text-white">
                  {fresh}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
