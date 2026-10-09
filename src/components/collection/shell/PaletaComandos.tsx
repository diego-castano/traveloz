"use client";

// Paleta ⌘K: saltar entre módulos de Collection o volver a Traveloz.

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ArrowLeft } from "lucide-react";
import { useCollection } from "./contexto";
import { GRUPOS_NAV } from "./nav";

const item =
  "flex h-11 cursor-pointer items-center gap-3 rounded-col-sm px-3 text-col-cuerpo text-col-slate data-[disabled=true]:cursor-default data-[disabled=true]:opacity-45 data-[selected=true]:bg-col-base data-[selected=true]:text-col-ink";

export function PaletaComandos({
  abierta,
  onAbiertaChange,
  superAdmin,
}: {
  abierta: boolean;
  onAbiertaChange: (v: boolean) => void;
  superAdmin: boolean;
}) {
  const router = useRouter();
  const { raiz } = useCollection();

  const ir = (href: string) => {
    onAbiertaChange(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={abierta}
      onOpenChange={onAbiertaChange}
      container={raiz ?? undefined}
      label="Ir a un módulo de Collection"
      overlayClassName="fixed inset-0 z-[60] bg-col-ink/30 backdrop-blur-[2px]"
      contentClassName="fixed left-1/2 top-[14vh] z-[60] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-col bg-col-surface shadow-col-3 focus:outline-none"
    >
      <Command.Input
        placeholder="¿A dónde vamos?"
        className="h-14 w-full border-0 border-b border-col-line bg-transparent px-5 font-col-display text-col-xl text-col-ink placeholder:text-col-slate/50 focus:border-col-gold focus:outline-none focus:ring-0"
      />
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-col-slate">No hay nada con ese nombre.</Command.Empty>
        {GRUPOS_NAV.map((g, i) => (
          <Command.Group
            key={i}
            heading={g.titulo ?? "General"}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-col-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-col-muted"
          >
            {g.modulos
              .filter((m) => !m.soloSuperAdmin || superAdmin)
              .map((m) => {
                const Icono = m.icono;
                return (
                  <Command.Item
                    key={m.id}
                    value={m.label}
                    disabled={!m.href}
                    onSelect={() => m.href && ir(m.href)}
                    className={item}
                  >
                    <Icono className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                    <span className="flex-1">{m.label}</span>
                    {!m.href && <span className="text-col-xs uppercase tracking-[0.16em]">Pronto</span>}
                  </Command.Item>
                );
              })}
          </Command.Group>
        ))}
        <Command.Group
          heading="Traveloz"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-col-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-col-muted"
        >
          <Command.Item value="Volver a Traveloz" onSelect={() => ir("/backend/dashboard")} className={item}>
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            Volver a Traveloz
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
