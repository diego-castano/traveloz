"use client";

import { useEffect, useRef, useState } from "react";
import { Command, CommandInput, CommandList, CommandItem } from "cmdk";
import { Popover } from "radix-ui";
import { ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/components/lib/cn";

export interface CreatableSelectOption {
  value: string;
  label: string;
}

interface Props {
  value?: string;
  onValueChange?: (value: string) => void;
  options: CreatableSelectOption[];
  /**
   * Crea un nuevo ítem a partir del texto tipeado. Debe persistirlo y dejarlo
   * seleccionable; si devuelve el nuevo value, se selecciona automáticamente.
   */
  onCreate: (label: string) => void | string | Promise<void | string>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Texto del botón de crear; recibe lo tipeado. Default: `Crear «X»`. */
  createLabel?: (query: string) => string;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Igual que <SearchableSelect> pero permite CREAR una opción nueva desde el
 * mismo desplegable cuando lo tipeado no existe. Pensado para cargar catálogos
 * "in situ" (ej. una ciudad al dar de alta un hotel) sin salir del formulario.
 */
export function CreatableSelect({
  value,
  onValueChange,
  options,
  onCreate,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar o crear...",
  emptyText = "Sin resultados",
  label,
  disabled = false,
  className,
  createLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
    } else {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const q = query.trim();
  const exists = options.some((o) => normalize(o.label) === normalize(q));
  const canCreate = q.length > 0 && !exists && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const created = await onCreate(q);
      if (typeof created === "string") onValueChange?.(created);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-label font-medium text-neutral-500">{label}</label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-9 w-full items-center justify-between px-3 text-[13.5px] text-neutral-900 outline-none transition-all",
              "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(17,17,36,0.14)",
              borderRadius: "8px",
              boxShadow: "inset 0 1px 0 rgba(17,17,36,0.03)",
            }}
          >
            <span className={cn("truncate text-left", !selected && "text-neutral-400")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            className="z-[200] overflow-hidden"
            style={{
              width: "var(--radix-popover-trigger-width)",
              background: "#FFFFFF",
              border: "1px solid rgba(17,17,36,0.08)",
              borderRadius: "12px",
              boxShadow:
                "0 16px 40px -8px rgba(17,17,36,0.18), 0 4px 12px -4px rgba(17,17,36,0.08)",
            }}
          >
            <Command shouldFilter>
              <div className="border-b border-neutral-200/70 px-2 py-1.5">
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={searchPlaceholder}
                  onKeyDown={(e) => {
                    // Enter crea cuando no hay coincidencia exacta.
                    if (e.key === "Enter" && canCreate) {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                  className="h-7 w-full bg-transparent px-1 text-[13px] text-neutral-900 placeholder:text-neutral-400 outline-none"
                />
              </div>
              <CommandList className="max-h-64 overflow-y-auto p-1">
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      onValueChange?.(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative mx-0.5 flex cursor-pointer items-center rounded-md px-2.5 py-1.5 pr-8 text-[13px] text-neutral-700 outline-none",
                      "data-[selected=true]:bg-neutral-100",
                      o.value === value && "font-medium text-neutral-900",
                    )}
                  >
                    {o.label}
                    {o.value === value && (
                      <Check
                        className="absolute right-2 h-[14px] w-[14px] text-brand-teal-500"
                        strokeWidth={2.5}
                      />
                    )}
                  </CommandItem>
                ))}

                {!canCreate && options.length === 0 && !q && (
                  <div className="px-3 py-3 text-center text-[13px] text-neutral-400">
                    {emptyText}
                  </div>
                )}

                {canCreate && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCreate}
                    className="mx-0.5 mt-0.5 flex w-[calc(100%-0.25rem)] items-center gap-2 rounded-md border-t border-neutral-200/60 px-2.5 py-2 text-left text-[13px] text-neutral-700 hover:bg-[#3BBFAD]/8"
                  >
                    {creating ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#3BBFAD]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 shrink-0 text-[#3BBFAD]" />
                    )}
                    <span className="truncate">
                      {createLabel
                        ? createLabel(q)
                        : `Crear «${q}»`}
                    </span>
                  </button>
                )}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
