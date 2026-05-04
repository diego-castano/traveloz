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
  HelpCircle,
  FileText,
  Building2,
  UserCircle,
  Send,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/lib/cn";

type Section = {
  href: string;
  label: string;
  icon: typeof Home;
};

type Group = { label: string; items: Section[] };

const GROUPS: Group[] = [
  {
    label: "Home",
    items: [
      { href: "/backend/web/inicio", label: "Inicio", icon: Home },
      { href: "/backend/web/categorias", label: "Categorías", icon: LayoutGrid },
      { href: "/backend/web/testimonios", label: "Testimonios", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Páginas",
    items: [
      { href: "/backend/web/destinos", label: "Destinos", icon: MapPin },
      { href: "/backend/web/nosotros", label: "Nosotros", icon: Users },
      { href: "/backend/web/contacto", label: "Contacto", icon: Mail },
      { href: "/backend/web/corporativo", label: "Corporativo", icon: Briefcase },
      { href: "/backend/web/cotizar", label: "Cotizar", icon: Send },
      { href: "/backend/web/faq", label: "FAQ", icon: HelpCircle },
      { href: "/backend/web/terms", label: "Términos", icon: FileText },
    ],
  },
  {
    label: "Corporativo",
    items: [
      { href: "/backend/web/clientes", label: "Clientes", icon: Building2 },
      { href: "/backend/web/equipo", label: "Equipo", icon: UserCircle },
    ],
  },
  {
    label: "Layout",
    items: [
      { href: "/backend/web/footer", label: "Footer", icon: PanelBottom },
      { href: "/backend/web/general", label: "Datos generales", icon: Settings2 },
    ],
  },
];

export default function WebLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Compact header */}
      <div className="px-6 pt-5 pb-4 border-b border-neutral-200/80 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              Frontend institucional
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Editá los contenidos del sitio público.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            traveloz.com.uy
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Two-column: compact nav + content */}
      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-neutral-200/80 bg-neutral-50/30 py-4">
          <nav className="space-y-5 px-3">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2.5 mb-1.5">
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
                          "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                          active
                            ? "bg-violet-50 text-violet-900 font-medium"
                            : "text-neutral-700 hover:bg-neutral-100/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-colors",
                            active
                              ? "text-violet-600"
                              : "text-neutral-400 group-hover:text-neutral-600",
                          )}
                        />
                        <span className="truncate">{s.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-neutral-50/40">
          {children}
        </main>
      </div>
    </div>
  );
}
