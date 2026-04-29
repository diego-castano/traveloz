"use client";

import * as React from "react";
import { Rows3, Rows2, Rows4 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

export type Density = "compact" | "comfortable" | "spacious";

interface DensityCtx {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = React.createContext<DensityCtx>({
  density: "comfortable",
  setDensity: () => {},
});

const STORAGE_KEY = "traveloz.density.v1";

/**
 * DensityProvider — exposes a single Density value (compact / comfortable /
 * spacious) persisted in localStorage. Mounted once at the admin layout root
 * so every <DensityToggle /> and every Tailwind consumer reads the same
 * state.
 */
export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useLocalStorageState<Density>(
    STORAGE_KEY,
    "comfortable",
  );
  const value = React.useMemo(() => ({ density, setDensity }), [density, setDensity]);

  // Expose density to the body so any global CSS (e.g. row heights) can react.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.density = density;
  }, [density]);

  return (
    <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
  );
}

export function useDensity() {
  return React.useContext(DensityContext);
}

/** Tailwind-class shorthand the existing TableCell can splice in. */
export function densityRowClass(d: Density) {
  if (d === "compact") return "h-8 [&_td]:py-1 [&_td]:!px-3 text-[12.5px]";
  if (d === "spacious") return "h-12 [&_td]:py-3.5";
  return ""; // comfortable = default
}

// ---------------------------------------------------------------------------
// Toggle UI
// ---------------------------------------------------------------------------

const options: { value: Density; label: string; icon: LucideIcon }[] = [
  { value: "compact", label: "Compacta", icon: Rows4 },
  { value: "comfortable", label: "Cómoda", icon: Rows3 },
  { value: "spacious", label: "Amplia", icon: Rows2 },
];

export function DensityToggle({ className }: { className?: string }) {
  const { density, setDensity } = useDensity();
  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-[8px] border border-hairline bg-white p-0.5",
        className,
      )}
      role="radiogroup"
      aria-label="Densidad de la tabla"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === density;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => setDensity(opt.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors",
              active
                ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                : "text-neutral-400 hover:text-neutral-700",
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
