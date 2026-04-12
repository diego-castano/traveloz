"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { BrandTokens } from "@/lib/brands";
import { brandTokens, BRAND_LIST } from "@/lib/brands";

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------
interface BrandContextValue {
  activeBrandId: string;
  activeBrand: BrandTokens;
  brands: BrandTokens[];
  switchBrand: (brandId: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const BrandContext = createContext<BrandContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
function getInitialBrandId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("activeBrandId");
    if (stored && brandTokens[stored]) return stored;
  }
  return "brand-1";
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandId] = useState<string>(getInitialBrandId);

  const switchBrand = useCallback((brandId: string) => {
    if (brandTokens[brandId]) {
      setActiveBrandId(brandId);
      if (typeof window !== "undefined") {
        localStorage.setItem("activeBrandId", brandId);
      }
    }
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({
      activeBrandId,
      activeBrand: brandTokens[activeBrandId] ?? brandTokens["brand-1"],
      brands: BRAND_LIST,
      switchBrand,
    }),
    [activeBrandId, switchBrand],
  );

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error("useBrand must be used within a <BrandProvider>");
  }
  return ctx;
}
