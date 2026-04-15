"use client";

import React from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/components/lib/cn";

/**
 * Skeleton — atomic placeholder primitive.
 *
 * - Respects `prefers-reduced-motion` via `useReducedMotion()`: collapses to a
 *   solid soft pulse when motion is reduced.
 * - Three visual variants: `shimmer` (default), `pulse`, `solid`.
 * - Inspired by https://github.com/0xGF/boneyard principles.
 */

const roundedMap = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

type SkeletonVariant = "shimmer" | "pulse" | "solid";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof roundedMap;
  variant?: SkeletonVariant;
}

export function Skeleton({
  className,
  width,
  height,
  rounded = "sm",
  variant = "shimmer",
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const effectiveVariant: SkeletonVariant = reduced ? "pulse" : variant;

  return (
    <div
      className={cn(
        effectiveVariant === "shimmer" && "animate-shimmer",
        effectiveVariant === "pulse" && "animate-pulse",
        className
      )}
      style={{
        width,
        height,
        borderRadius: roundedMap[rounded],
        // Visible grey against white/opaque card surfaces. Base is a solid
        // neutral-200-ish tone; the shimmer wave travels dark → slightly
        // lighter → dark so the "moving shine" reads clearly while the bone
        // never disappears into the background.
        background:
          effectiveVariant === "shimmer"
            ? "linear-gradient(90deg, #D6D8E3 0%, #E8EAF0 50%, #D6D8E3 100%)"
            : "#D6D8E3",
        backgroundSize: effectiveVariant === "shimmer" ? "200% 100%" : undefined,
      }}
      aria-hidden="true"
    />
  );
}
