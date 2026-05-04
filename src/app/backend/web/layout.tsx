"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquareQuote,
  LayoutGrid,
  Settings2,
  MapPin,
  Users,
  Mail,
  Briefcase,
  PanelBottom,
  ExternalLink,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/lib/cn";

type Section = {
  href: string;
  label: string;
  icon: typeof Home;
  blurb: string;
  publicHref?: string;
};

type Group = { label: string; items: Section[] };

const GROUPS: Group[] = [
  {
    label: "Home",
    items: [
      {
        href: "/backend/web/inicio",
        label: "Inicio",
        icon: Home,
        blurb: "Hero, video y newsletter",
        publicHref: "/",
      },
      {
        href: "/backend/web/categorias",
        label: "Categorías destacadas",
        icon: LayoutGrid,
        blurb: "Slider de la home",
      },
      {
        href: "/backend/web/testimonios",
        label: "Testimonios",
        icon: MessageSquareQuote,
        blurb: "Relatos de viajeros",
      },
    ],
  },
  {
    label: "Páginas",
    items: [
      {
        href: "/backend/web/destinos",
        label: "Destinos",
        icon: MapPin,
        blurb: "Foto y descripción de cada región",
        publicHref: "/destinos",
      },
      {
        href: "/backend/web/nosotros",
        label: "Nosotros",
        icon: Users,
        blurb: "Página /about",
        publicHref: "/about",
      },
      {
        href: "/backend/web/contacto",
        label: "Contacto",
        icon: Mail,
        blurb: "Página /contact y datos",
        publicHref: "/contact",
      },
      {
        href: "/backend/web/corporativo",
        label: "Corporativo",
        icon: Briefcase,
        blurb: "Página /corporativo",
        publicHref: "/corporativo",
      },
    ],
  },
  {
    label: "Layout & Datos",
    items: [
      {
        href: "/backend/web/footer",
        label: "Footer",
        icon: PanelBottom,
        blurb: "Bloques y links del pie",
      },
      {
        href: "/backend/web/general",
        label: "Datos generales",
        icon: Settings2,
        blurb: "WhatsApp, dirección, horario",
      },
    ],
  },
];

export default function WebLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-neutral-200">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Frontend
          </h1>
          <span className="text-sm text-neutral-400">
            · contenidos del sitio público
          </span>
        </div>
        <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
          Editá los textos, fotos, datos de contacto y cualquier copy que
          aparezca en{" "}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
          >
            traveloz.com.uy
            <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
      </div>

      {/* Two-column: nav + content */}
      <div className="flex flex-1 min-h-0">
        <aside className="w-72 shrink-0 border-r border-neutral-200 bg-neutral-50/40 py-6 overflow-y-auto">
          <nav className="space-y-6 px-4">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((s) => {
                    const active = pathname === s.href;
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.href}
                        href={s.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                          active
                            ? "bg-white shadow-sm border border-violet-100 text-violet-900"
                            : "text-neutral-700 hover:bg-white/70",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            active
                              ? "text-violet-600"
                              : "text-neutral-400 group-hover:text-neutral-600",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "font-medium leading-tight",
                              active ? "text-neutral-900" : "",
                            )}
                          >
                            {s.label}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {s.blurb}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-neutral-50/30">{children}</main>
      </div>
    </div>
  );
}
