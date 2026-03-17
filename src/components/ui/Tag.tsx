"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/components/lib/cn";

const tagColorPresets = {
  teal: {
    background: "rgba(230,248,245,0.7)",
    color: "#1F7D70",
  },
  violet: {
    background: "rgba(245,243,255,0.7)",
    color: "#5B21B6",
  },
  red: {
    background: "rgba(255,224,227,0.7)",
    color: "#A8192A",
  },
  orange: {
    background: "rgba(254,245,235,0.7)",
    color: "#A85C18",
  },
  green: {
    background: "rgba(237,250,243,0.7)",
    color: "#166B40",
  },
  blue: {
    background: "rgba(235,245,255,0.7)",
    color: "#0066E6",
  },
} as const;

export type TagColor = keyof typeof tagColorPresets;

interface TagProps {
  children: React.ReactNode;
  color?: TagColor;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Tag({
  children,
  color = "teal",
  removable = false,
  onRemove,
  className,
}: TagProps) {
  const preset = tagColorPresets[color];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
      style={{
        background: preset.background,
        color: preset.color,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
          aria-label="Remove tag"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
