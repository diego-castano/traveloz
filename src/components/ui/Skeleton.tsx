import React from "react";
import { cn } from "@/components/lib/cn";

const roundedMap = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  full: "9999px",
} as const;

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof roundedMap;
}

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  return (
    <div
      className={cn("animate-shimmer", className)}
      style={{
        width,
        height,
        borderRadius: roundedMap[rounded],
        background:
          "linear-gradient(90deg, rgba(236,237,245,0.6) 0%, rgba(255,255,255,0.4) 50%, rgba(236,237,245,0.6) 100%)",
        backgroundSize: "200% 100%",
      }}
      aria-hidden="true"
    />
  );
}
