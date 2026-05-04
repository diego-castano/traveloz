"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Inbox,
  Mail,
  Briefcase,
  FileText,
  AtSign,
  Quote,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/lib/cn";
import { getLeadCounts, type LeadCounts } from "@/actions/leads.actions";

type Section = {
  href: string;
  label: string;
  icon: typeof Inbox;
  countKey: keyof LeadCounts;
  newKey?: keyof LeadCounts;
};

const SECTIONS: Section[] = [
  {
    href: "/backend/leads/cotizaciones",
    label: "Cotizaciones",
    icon: Quote,
    countKey: "cotizaciones",
    newKey: "cotizacionesNuevas",
  },
  {
    href: "/backend/leads/mensajes",
    label: "Contacto",
    icon: Mail,
    countKey: "mensajes",
    newKey: "mensajesNuevos",
  },
  {
    href: "/backend/leads/corporativo",
    label: "Corporativo",
    icon: Briefcase,
    countKey: "corporativo",
    newKey: "corporativoNuevos",
  },
  {
    href: "/backend/leads/postulaciones",
    label: "Postulaciones",
    icon: FileText,
    countKey: "postulaciones",
    newKey: "postulacionesNuevas",
  },
  {
    href: "/backend/leads/newsletter",
    label: "Newsletter",
    icon: AtSign,
    countKey: "newsletter",
    newKey: "newsletterActivos",
  },
];

export default function LeadsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<LeadCounts | null>(null);

  useEffect(() => {
    getLeadCounts().then(setCounts).catch(() => setCounts(null));
  }, [pathname]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="px-6 pt-5 pb-4 border-b border-neutral-200/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Inbox className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              Leads
            </h1>
            <p className="text-xs text-neutral-500">
              Envíos de los formularios públicos.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-neutral-200/80 bg-neutral-50/30 py-4">
          <nav className="space-y-0.5 px-3">
            {SECTIONS.map((s) => {
              const active = pathname.startsWith(s.href);
              const Icon = s.icon;
              const total = counts?.[s.countKey] ?? null;
              const fresh = s.newKey ? counts?.[s.newKey] ?? 0 : 0;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-violet-50 text-violet-900 font-medium"
                      : "text-neutral-700 hover:bg-neutral-100/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      active
                        ? "text-violet-600"
                        : "text-neutral-400 group-hover:text-neutral-600",
                    )}
                  />
                  <span className="truncate flex-1">{s.label}</span>
                  {total !== null && (
                    <span className="text-[10px] text-neutral-400 tabular-nums">
                      {total}
                    </span>
                  )}
                  {fresh > 0 && (
                    <span className="text-[9px] font-semibold uppercase bg-violet-600 text-white rounded-full px-1.5 py-0.5 tabular-nums">
                      {fresh}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto bg-neutral-50/40">
          {children}
        </main>
      </div>
    </div>
  );
}
