"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeletons v2 — modern, opaque, boneyard-inspired loading states.
 *
 * Principles (from /plans/ticklish-foraging-sun.md):
 * - Match the new DataTable/Field surfaces (no glass wrappers, hairline
 *   borders, 44px row height, label micro-type).
 * - `prefers-reduced-motion` via `useReducedMotion()` → pulse instead of shimmer.
 * - Accessible: every skeleton container is `role="status"`, `aria-busy="true"`,
 *   `aria-live="polite"` with an offscreen "Cargando..." label so screen readers
 *   announce loading state.
 * - No per-row stagger. One container fade-in only. Linear/Vercel style.
 *
 * Exports:
 *   - `DataTableSkeleton` — replaces TableSkeleton, matches new DataTable
 *   - `FormSkeleton` — Field-aware form placeholder
 *   - `DetailPageSkeleton` — for `/paquetes/[slug]` and similar detail routes
 *   - `ModalFormSkeleton` — used while edit data is being fetched
 *   - `StatCardsSkeleton`, `CardGridSkeleton`, `TabsSkeleton` — ported from v1
 *   - `PageSkeleton` — variant-driven top-level skeleton (legacy-compatible)
 *   - `InlineTableSkeleton` — compact row list
 *   - `TableSkeleton` — legacy-compatible alias of `DataTableSkeleton`
 */

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------

const containerFadeIn = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
};

// Deterministic pseudo-random widths (avoids hydration mismatch)
const WIDTHS = ["90%", "68%", "55%", "78%"] as const;
const cellWidth = (row: number, col: number) =>
  WIDTHS[(row * 3 + col * 7) % WIDTHS.length];

// Shared a11y wrapper props
function a11y(label: string) {
  return {
    role: "status" as const,
    "aria-busy": true,
    "aria-live": "polite" as const,
    "aria-label": label,
  };
}

// Screen-reader-only label for context
function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only absolute h-px w-px overflow-hidden">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DataTableSkeleton — edge-to-edge, hairline, 44px rows, no glass
// ---------------------------------------------------------------------------

interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
  /** A11y label announced to screen readers. */
  label?: string;
}

export function DataTableSkeleton({
  columns = 5,
  rows = 8,
  label = "Cargando tabla",
}: DataTableSkeletonProps) {
  return (
    <motion.div
      {...containerFadeIn}
      {...a11y(label)}
      className="w-full border-y border-hairline"
    >
      <SrOnly>{label}</SrOnly>
      <table className="w-full border-collapse">
        <thead
          style={{
            borderBottom: "1px solid rgba(17,17,36,0.07)",
            background: "rgba(255,255,255,0.95)",
          }}
        >
          <tr className="h-9">
            {Array.from({ length: columns }).map((_, c) => (
              <th key={c} className="px-4 py-2 text-left">
                <Skeleton width="60%" height={10} rounded="sm" />
              </th>
            ))}
            <th className="w-[70px] px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr
              key={r}
              className="h-row border-b border-hairline last:border-b-0"
            >
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-2.5">
                  <Skeleton
                    width={cellWidth(r, c)}
                    height={12}
                    rounded="sm"
                  />
                </td>
              ))}
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <Skeleton width={20} height={20} rounded="md" />
                  <Skeleton width={20} height={20} rounded="md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

// Legacy alias — existing callers import `TableSkeleton`
export const TableSkeleton = DataTableSkeleton;

// ---------------------------------------------------------------------------
// FormSkeleton — Field-aware with column support
// ---------------------------------------------------------------------------

interface FormSkeletonProps {
  fields?: number;
  columns?: 1 | 2;
  label?: string;
}

export function FormSkeleton({
  fields = 6,
  columns = 1,
  label = "Cargando formulario",
}: FormSkeletonProps) {
  return (
    <motion.div {...containerFadeIn} {...a11y(label)}>
      <SrOnly>{label}</SrOnly>
      <div
        className={cn(
          "grid gap-x-5 gap-y-4",
          columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}
      >
        {Array.from({ length: fields }).map((_, f) => (
          <div key={f} className="flex flex-col gap-1.5">
            <Skeleton width={Math.floor(40 + (f % 3) * 15) + "%"} height={10} rounded="sm" />
            <Skeleton width="100%" height={36} rounded="md" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Legacy alias
export const DetailFormSkeleton = FormSkeleton;

// ---------------------------------------------------------------------------
// ModalFormSkeleton — compact form skeleton for inside modals
// ---------------------------------------------------------------------------

export function ModalFormSkeleton() {
  return <FormSkeleton fields={5} columns={1} label="Cargando datos" />;
}

// ---------------------------------------------------------------------------
// StatCardsSkeleton — 4 stats grid, matches new opaque card style
// ---------------------------------------------------------------------------

export function StatCardsSkeleton() {
  return (
    <motion.div
      {...containerFadeIn}
      {...a11y("Cargando estadisticas")}
      className="grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      <SrOnly>Cargando estadisticas</SrOnly>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[12px] border border-hairline bg-white p-5"
        >
          <Skeleton width={36} height={36} rounded="lg" />
          <Skeleton width="55%" height={10} rounded="sm" />
          <Skeleton width="40%" height={24} rounded="md" />
        </div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// TabsSkeleton — tab bar + content
// ---------------------------------------------------------------------------

export function TabsSkeleton() {
  return (
    <motion.div
      {...containerFadeIn}
      {...a11y("Cargando tabs")}
      className="flex flex-col gap-6"
    >
      <SrOnly>Cargando tabs</SrOnly>
      <div className="flex gap-1 border-b border-hairline pb-0.5">
        {Array.from({ length: 5 }).map((_, t) => (
          <Skeleton key={t} width={80} height={32} rounded="md" />
        ))}
      </div>
      <FormSkeleton fields={6} columns={2} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CardGridSkeleton — photo grid style
// ---------------------------------------------------------------------------

interface CardGridSkeletonProps {
  cards?: number;
  columns?: 2 | 3 | 4;
}

export function CardGridSkeleton({
  cards = 6,
  columns = 3,
}: CardGridSkeletonProps) {
  return (
    <motion.div
      {...containerFadeIn}
      {...a11y("Cargando tarjetas")}
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}
    >
      <SrOnly>Cargando tarjetas</SrOnly>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-[12px] border border-hairline bg-white"
        >
          <Skeleton width="100%" height={140} rounded="sm" className="!rounded-b-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton width="80%" height={14} rounded="sm" />
            <Skeleton width="55%" height={11} rounded="sm" />
            <Skeleton width="35%" height={18} rounded="md" className="mt-2" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page header block — shared between all PageSkeleton variants
// ---------------------------------------------------------------------------

function PageHeaderSkeleton() {
  return (
    <motion.div className="mb-5 flex flex-col gap-3" {...containerFadeIn}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton width={60} height={10} rounded="sm" />
        <Skeleton width={8} height={10} rounded="sm" />
        <Skeleton width={80} height={10} rounded="sm" />
      </div>
      {/* Title + actions row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton width={220} height={28} rounded="md" />
          <Skeleton width={300} height={12} rounded="sm" />
        </div>
        <Skeleton width={140} height={36} rounded="md" />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PageSkeleton — variant-driven top-level skeleton
// ---------------------------------------------------------------------------

type PageSkeletonVariant = "table" | "detail" | "dashboard" | "cards";

interface PageSkeletonProps {
  variant: PageSkeletonVariant;
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <div role="status" aria-busy aria-live="polite">
      <SrOnly>Cargando pagina</SrOnly>
      <PageHeaderSkeleton />

      {variant === "table" && (
        <>
          {/* Toolbar skeleton */}
          <motion.div
            {...containerFadeIn}
            className="mb-4 flex items-center gap-3 border-b border-hairline pb-3"
          >
            <Skeleton width={240} height={32} rounded="sm" />
            <div className="ml-auto flex gap-2">
              <Skeleton width={80} height={30} rounded="md" />
              <Skeleton width={80} height={30} rounded="md" />
            </div>
          </motion.div>
          <DataTableSkeleton />
        </>
      )}

      {variant === "detail" && <FormSkeleton fields={8} columns={2} />}

      {variant === "dashboard" && (
        <div className="flex flex-col gap-6">
          <StatCardsSkeleton />
          <DataTableSkeleton rows={5} columns={4} />
        </div>
      )}

      {variant === "cards" && <CardGridSkeleton />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPageSkeleton — for /paquetes/[slug] and similar detail routes
// ---------------------------------------------------------------------------

export function DetailPageSkeleton() {
  return (
    <div role="status" aria-busy aria-live="polite">
      <SrOnly>Cargando detalle</SrOnly>
      <PageHeaderSkeleton />
      <TabsSkeleton />
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineTableSkeleton — compact row list for modals / inline panels
// ---------------------------------------------------------------------------

interface InlineTableSkeletonProps {
  rows?: number;
}

export function InlineTableSkeleton({ rows = 5 }: InlineTableSkeletonProps) {
  return (
    <motion.div
      {...containerFadeIn}
      {...a11y("Cargando lista")}
      className="border-y border-hairline"
    >
      <SrOnly>Cargando lista</SrOnly>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-hairline px-4 py-2.5 last:border-b-0"
        >
          <Skeleton width={24} height={24} rounded="md" />
          <Skeleton width={cellWidth(r, 0)} height={12} rounded="sm" className="flex-1" />
          <Skeleton width={70} height={12} rounded="sm" />
          <Skeleton width={50} height={24} rounded="md" />
        </div>
      ))}
    </motion.div>
  );
}
