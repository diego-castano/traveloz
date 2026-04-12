"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";

// ---------------------------------------------------------------------------
// Shared glass container style (mirrors glassMaterials.frosted)
// ---------------------------------------------------------------------------

const glassContainer: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow:
    "0 8px 32px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
  borderRadius: "16px",
};

// ---------------------------------------------------------------------------
// Stagger animation helpers
// ---------------------------------------------------------------------------

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

// Deterministic pseudo-random width from an index (avoids Math.random for SSR)
const widthVariants = ["100%", "80%", "60%", "40%"] as const;
function cellWidth(row: number, col: number): string {
  return widthVariants[(row * 3 + col * 7) % widthVariants.length];
}

// ---------------------------------------------------------------------------
// 1. TableSkeleton
// ---------------------------------------------------------------------------

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 6 }: TableSkeletonProps) {
  return (
    <motion.div
      {...fadeIn}
      style={{ ...glassContainer, overflow: "hidden" }}
    >
      {/* Header row */}
      <div
        className="flex gap-4 px-5 py-3"
        style={{
          borderBottom: "1px solid rgba(236,237,245,0.5)",
          background: "rgba(236,237,245,0.35)",
        }}
      >
        {Array.from({ length: columns }).map((_, c) => (
          <div key={c} className="flex-1">
            <Skeleton width="70%" height={14} rounded="sm" />
          </div>
        ))}
      </div>

      {/* Body rows */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate">
        {Array.from({ length: rows }).map((_, r) => (
          <motion.div
            key={r}
            variants={fadeIn}
            className="flex gap-4 px-5 py-3"
            style={{
              borderBottom:
                r < rows - 1 ? "1px solid rgba(236,237,245,0.3)" : undefined,
            }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="flex-1">
                <Skeleton width={cellWidth(r, c)} height={12} rounded="sm" />
              </div>
            ))}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 2. StatCardsSkeleton
// ---------------------------------------------------------------------------

export function StatCardsSkeleton() {
  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          variants={fadeIn}
          className="flex flex-col gap-3 p-5 rounded-glass-lg"
          style={glassContainer}
        >
          <Skeleton width={40} height={40} rounded="full" />
          <Skeleton width="60%" height={12} rounded="sm" />
          <Skeleton width="40%" height={28} rounded="md" />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 3. DetailFormSkeleton
// ---------------------------------------------------------------------------

interface DetailFormSkeletonProps {
  sections?: number;
  fieldsPerSection?: number;
}

export function DetailFormSkeleton({
  sections = 2,
  fieldsPerSection = 4,
}: DetailFormSkeletonProps) {
  return (
    <motion.div
      className="flex flex-col gap-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: sections }).map((_, s) => (
        <motion.div
          key={s}
          variants={fadeIn}
          className="flex flex-col gap-5 p-6 rounded-glass-lg"
          style={glassContainer}
        >
          {/* Section title */}
          <Skeleton width="30%" height={20} rounded="sm" />

          {/* Fields in 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {Array.from({ length: fieldsPerSection }).map((_, f) => (
              <div key={f} className="flex flex-col gap-2">
                <Skeleton width="40%" height={14} rounded="sm" />
                <Skeleton width="100%" height={40} rounded="md" />
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 4. TabsSkeleton
// ---------------------------------------------------------------------------

export function TabsSkeleton() {
  return (
    <motion.div
      className="flex flex-col gap-6"
      {...fadeIn}
    >
      {/* Tab bar */}
      <div
        className="flex gap-2 px-2 py-2 rounded-glass-lg"
        style={{
          background: "rgba(236,237,245,0.35)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "12px",
        }}
      >
        {Array.from({ length: 5 }).map((_, t) => (
          <Skeleton key={t} width={60} height={36} rounded="sm" />
        ))}
      </div>

      {/* Content area: renders a form skeleton below */}
      <DetailFormSkeleton sections={1} fieldsPerSection={4} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 5. CardGridSkeleton
// ---------------------------------------------------------------------------

interface CardGridSkeletonProps {
  cards?: number;
  columns?: number;
}

export function CardGridSkeleton({
  cards = 6,
  columns = 3,
}: CardGridSkeletonProps) {
  const gridClass = cn(
    "grid gap-4",
    columns === 2 && "grid-cols-1 md:grid-cols-2",
    columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    ![2, 3, 4].includes(columns) && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  );

  return (
    <motion.div
      className={gridClass}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <motion.div
          key={i}
          variants={fadeIn}
          className="flex flex-col overflow-hidden rounded-glass-lg"
          style={glassContainer}
        >
          {/* Image area */}
          <Skeleton width="100%" height={160} rounded="sm" className="rounded-b-none" />

          {/* Content area */}
          <div className="flex flex-col gap-2 p-4">
            <Skeleton width="80%" height={16} rounded="sm" />
            <Skeleton width="60%" height={14} rounded="sm" />
            <Skeleton width="40%" height={20} rounded="md" className="mt-2" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 6. PageSkeleton
// ---------------------------------------------------------------------------

interface PageSkeletonProps {
  variant: "table" | "detail" | "dashboard" | "cards";
}

function PageHeaderSkeleton() {
  return (
    <motion.div className="flex flex-col gap-3 mb-6" {...fadeIn}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton width={60} height={12} rounded="sm" />
        <Skeleton width={8} height={12} rounded="sm" />
        <Skeleton width={80} height={12} rounded="sm" />
      </div>

      {/* Title row with action buttons */}
      <div className="flex items-center justify-between">
        <Skeleton width={220} height={28} rounded="md" />
        <div className="flex gap-2">
          <Skeleton width={100} height={36} rounded="md" />
          <Skeleton width={100} height={36} rounded="md" />
        </div>
      </div>
    </motion.div>
  );
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <motion.div {...fadeIn}>
      <PageHeaderSkeleton />

      {variant === "table" && <TableSkeleton />}
      {variant === "detail" && <DetailFormSkeleton />}
      {variant === "dashboard" && (
        <div className="flex flex-col gap-6">
          <StatCardsSkeleton />
          <TableSkeleton rows={4} columns={4} />
        </div>
      )}
      {variant === "cards" && <CardGridSkeleton />}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 7. InlineTableSkeleton
// ---------------------------------------------------------------------------

interface InlineTableSkeletonProps {
  rows?: number;
}

export function InlineTableSkeleton({ rows = 5 }: InlineTableSkeletonProps) {
  return (
    <motion.div
      style={{ ...glassContainer, overflow: "hidden" }}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: rows }).map((_, r) => (
        <motion.div
          key={r}
          variants={fadeIn}
          className="flex items-center gap-4 px-5 py-3"
          style={{
            borderBottom:
              r < rows - 1 ? "1px solid rgba(236,237,245,0.3)" : undefined,
          }}
        >
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton width={cellWidth(r, 0)} height={12} rounded="sm" className="flex-1" />
          <Skeleton width={80} height={12} rounded="sm" />
          <Skeleton width={60} height={28} rounded="md" />
        </motion.div>
      ))}
    </motion.div>
  );
}
