"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
//
// Multi-brand switching is disabled for now. The app is fixed to TravelOz
// (brand-1). Any stale "activeBrandId" value left in localStorage from a
// previous session is cleared on mount so catalog queries filter correctly.
// ---------------------------------------------------------------------------
const FIXED_BRAND_ID = "brand-1";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const activeBrandId = FIXED_BRAND_ID;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("activeBrandId");
    }
  }, []);

  const switchBrand = useCallback((_brandId: string) => {
    // no-op while multi-brand is disabled
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({
      activeBrandId,
      activeBrand: brandTokens[activeBrandId] ?? brandTokens[FIXED_BRAND_ID],
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
