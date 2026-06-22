"use client";

import { useState } from "react";
import { INCLUYE_ICONS, incluyeIconUrl } from "@/lib/incluye";

// Compact icon picker for the "Incluye" rows. Shows the current icon as a
// button; clicking opens a small grid of the available PNG icons (same style
// the public site renders). Dependency-free: a fixed transparent backdrop
// closes it on outside click.
export function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title="Elegir ícono"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white transition-colors hover:border-violet-300 disabled:opacity-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={incluyeIconUrl(value)}
          alt=""
          className="h-5 w-5 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
          }}
        />
      </button>

      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-11 z-50 w-44 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg">
            <div className="grid grid-cols-3 gap-1">
              {INCLUYE_ICONS.map((opt) => {
                const active = opt.key === value;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    onClick={() => {
                      onChange(opt.key);
                      setOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 rounded-md p-1.5 transition-colors ${
                      active
                        ? "bg-violet-100 ring-1 ring-violet-300"
                        : "hover:bg-neutral-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={incluyeIconUrl(opt.key)}
                      alt={opt.label}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="text-[9px] leading-tight text-neutral-500 text-center">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
