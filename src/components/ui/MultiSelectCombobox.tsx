"use client";

import { useState, type ReactNode } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "cmdk";
import { Popover } from "radix-ui";
import { X } from "lucide-react";

export type Option = { value: string; label: string; icon?: ReactNode };

type Props = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  /** Optional inline create — called when user types a name that doesn't exist */
  onCreate?: (name: string) => Promise<Option> | Option;
};

export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar…",
  emptyText = "No se encontraron resultados.",
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div className="multi-select">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="border border-neutral-300 rounded px-2 py-1 min-h-[42px] w-full text-left flex flex-wrap gap-1 items-center bg-white hover:border-neutral-400"
          >
            {selected.length === 0 && (
              <span className="text-neutral-400 text-sm">{placeholder}</span>
            )}
            {selected.map((s) => (
              <span
                key={s.value}
                className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-xs rounded px-2 py-0.5"
              >
                {s.icon}
                {s.label}
                <span
                  role="button"
                  className="cursor-pointer hover:bg-violet-100 rounded p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(s.value);
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            className="z-[100] bg-white rounded shadow-xl border w-[var(--radix-popover-trigger-width)]"
          >
            <Command shouldFilter>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar…"
                className="w-full px-3 py-2 border-b outline-none text-sm"
              />
              <CommandList className="max-h-72 overflow-y-auto">
                <CommandEmpty className="px-3 py-2 text-sm text-neutral-500">
                  {emptyText}
                </CommandEmpty>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => toggle(o.value)}
                    className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-neutral-50 aria-selected:bg-neutral-100 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(o.value)}
                      readOnly
                    />
                    {o.icon}
                    <span>{o.label}</span>
                  </CommandItem>
                ))}
                {onCreate && query.trim() && !exactMatch && (
                  <CommandItem
                    value={`__create__${query}`}
                    onSelect={async () => {
                      const created = await onCreate(query.trim());
                      onChange([...value, created.value]);
                      setQuery("");
                    }}
                    className="px-3 py-2 cursor-pointer text-violet-600 hover:bg-violet-50 border-t text-sm"
                  >
                    + Crear &ldquo;{query}&rdquo;
                  </CommandItem>
                )}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
