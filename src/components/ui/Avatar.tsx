"use client";

import React, { useState } from "react";
import { cn } from "@/components/lib/cn";

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
} as const;

const fontSizeMap = {
  xs: "text-[9px]",
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

export type AvatarSize = keyof typeof sizeMap;

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  src,
  alt = "",
  name,
  size = "md",
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const dimension = sizeMap[size];
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : "?";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full shadow-elevation-2",
        className,
      )}
      style={{
        width: dimension,
        height: dimension,
        border: "2px solid rgba(255,255,255,0.5)",
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || "Avatar"}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center bg-brand-teal-100 font-semibold text-brand-teal-600",
            fontSizeMap[size],
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
