"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/lib/cn";

/**
 * DataTable — modern edge-to-edge data table primitive.
 *
 * Design:
 *   - No glass wrapper, no rounded card.
 *   - Hairline top / bottom borders, hairline row separators.
 *   - Sticky header with `backdrop-blur` + subtle `bg-white/95`.
 *   - Hover row: teal 2px left border (inset box-shadow), subtle bg shift.
 *   - 44px row height, `px-4 py-2.5` cells, 13.5px body text.
 *   - One container fade-in on mount. Zero per-row staggering.
 *
 * Composition mirrors native table elements:
 *
 *   <DataTable>
 *     <DataTableHeader>
 *       <DataTableRow>
 *         <DataTableHead>Ruta</DataTableHead>
 *         <DataTableHead align="right">Precio</DataTableHead>
 *       </DataTableRow>
 *     </DataTableHeader>
 *     <DataTableBody>
 *       {rows.map(r => (
 *         <DataTableRow key={r.id} onClick={() => open(r)}>
 *           <DataTableCell>{r.ruta}</DataTableCell>
 *           <DataTableCell variant="mono" align="right">{r.precio}</DataTableCell>
 *         </DataTableRow>
 *       ))}
 *     </DataTableBody>
 *   </DataTable>
 */

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={cn(
        "relative w-full",
        "border-y border-hairline",
        className
      )}
      style={{
        // Keep vertical `sticky` on <thead> working — overflow-x only.
        overflowX: "auto",
        overflowY: "visible",
      }}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <table
        className="w-full border-collapse"
        style={{
          fontFeatureSettings: '"tnum"',
        }}
      >
        {children}
      </table>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface DataTableHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Default: true. Sticks header to the viewport top while the body scrolls. */
  sticky?: boolean;
}

export function DataTableHeader({
  children,
  className,
  sticky = true,
}: DataTableHeaderProps) {
  return (
    <thead
      className={cn(
        "relative",
        sticky && "sticky top-0 z-10",
        className
      )}
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px) saturate(180%)",
        WebkitBackdropFilter: "blur(8px) saturate(180%)",
        borderBottom: "1px solid rgba(17,17,36,0.07)",
      }}
    >
      {children}
    </thead>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export function DataTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={cn(className)}>{children}</tbody>;
}

// ---------------------------------------------------------------------------
// Row — supports click navigation + hover-reveal children (via CSS `.group`)
// ---------------------------------------------------------------------------

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  selected?: boolean;
  /** Visually marks row as interactive (cursor pointer + hover). */
  interactive?: boolean;
  /** Apply a header-row style (used inside `<DataTableHeader>`). Auto-detected. */
  header?: boolean;
}

export function DataTableRow({
  children,
  selected,
  interactive = true,
  header = false,
  className,
  onClick,
  ...props
}: DataTableRowProps) {
  if (header) {
    return (
      <tr
        className={cn("h-9", className)}
        {...props}
      >
        {children}
      </tr>
    );
  }

  return (
    <tr
      className={cn(
        "group h-row border-b border-hairline transition-colors",
        interactive && "cursor-pointer",
        interactive && !selected && "hover:bg-rail",
        selected && "bg-[rgba(59,191,173,0.04)]",
        className
      )}
      onClick={onClick}
      style={{
        boxShadow: selected
          ? "inset 2px 0 0 #3BBFAD"
          : "inset 2px 0 0 transparent",
        transition: "box-shadow 150ms ease, background-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        if (interactive && !selected) {
          (e.currentTarget as HTMLTableRowElement).style.boxShadow =
            "inset 2px 0 0 #3BBFAD";
        }
      }}
      onMouseLeave={(e) => {
        if (interactive && !selected) {
          (e.currentTarget as HTMLTableRowElement).style.boxShadow =
            "inset 2px 0 0 transparent";
        }
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Header cell
// ---------------------------------------------------------------------------

type Align = "left" | "right" | "center";

interface DataTableHeadProps
  extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  align?: Align;
}

export function DataTableHead({
  children,
  align = "left",
  className,
  ...props
}: DataTableHeadProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 font-medium text-neutral-500",
        "text-label",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

// ---------------------------------------------------------------------------
// Body cell
// ---------------------------------------------------------------------------

type CellVariant = "default" | "mono" | "id" | "price" | "muted" | "primary";

interface DataTableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  variant?: CellVariant;
  align?: Align;
}

export function DataTableCell({
  children,
  variant = "default",
  align = "left",
  className,
  ...props
}: DataTableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 text-[13.5px] leading-[20px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        // Variant text styles
        variant === "default" && "text-neutral-700",
        variant === "primary" && "font-semibold text-neutral-900",
        variant === "muted" && "text-neutral-400",
        variant === "mono" &&
          "font-mono text-[12px] text-neutral-500",
        variant === "id" &&
          "font-mono text-[11px] uppercase tracking-wide text-neutral-400",
        variant === "price" &&
          "font-mono text-[13px] font-semibold text-neutral-900",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Legacy alias exports so existing callsites can migrate incrementally
// ---------------------------------------------------------------------------

export const Table = DataTable;
export const TableHeader = DataTableHeader;
export const TableBody = DataTableBody;
export const TableRow = DataTableRow;
export const TableHead = DataTableHead;
export const TableCell = DataTableCell;
