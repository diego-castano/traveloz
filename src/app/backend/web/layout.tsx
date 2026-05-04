"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquareQuote, LayoutGrid, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/lib/cn";

const SECTIONS = [
  { href: "/backend/web/inicio", label: "Inicio", icon: Home, blurb: "Hero, slider y newsletter de la home" },
  { href: "/backend/web/testimonios", label: "Testimonios", icon: MessageSquareQuote, blurb: "Relatos de viajeros" },
  { href: "/backend/web/categorias", label: "Categorías destacadas", icon: LayoutGrid, blurb: "Slider de categorías de la home" },
  { href: "/backend/web/general", label: "General", icon: Settings2, blurb: "WhatsApp, contacto, dirección" },
];

export default function WebLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-neutral-200 bg-white">
        <h1 className="text-2xl font-semibold text-neutral-900">Frontend institucional</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Editá los textos y contenidos del sitio público que no son paquetes.
        </p>
      </div>

      {/* Two-column: nav + content */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50/50 p-4">
          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const active = pathname === s.href;
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-violet-100 text-violet-900"
                      : "text-neutral-700 hover:bg-neutral-100",
                  )}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">{s.label}</div>
                    <div
                      className={cn(
                        "text-[11px] mt-0.5",
                        active ? "text-violet-700" : "text-neutral-500",
                      )}
                    >
                      {s.blurb}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
