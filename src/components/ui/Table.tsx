"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";

// ---------------------------------------------------------------------------
// Table (wrapper)
// ---------------------------------------------------------------------------

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, style, ...props }, ref) => (
  <div
    className={cn(
      "w-full rounded-glass-lg overflow-hidden shadow-elevation-4 relative animate-breathe",
      className,
    )}
    style={{ ...glassMaterials.frosted, ...style }}
  >
    {/* Top accent gradient bar */}
    <div
      aria-hidden
      className="absolute top-0 left-0 right-0 h-[2px] z-[1]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.12) 30%, rgba(59,191,173,0.12) 70%, transparent 100%)",
      }}
    />
    <table ref={ref} className="w-full caption-bottom text-sm" {...props} />
  </div>
));
Table.displayName = "Table";

// ---------------------------------------------------------------------------
// TableHeader
// ---------------------------------------------------------------------------

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, style, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b-0", className)}
    style={{
      background: "rgba(26,26,46,0.94)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      ...style,
    }}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

// ---------------------------------------------------------------------------
// TableHead (th cells)
// ---------------------------------------------------------------------------

type TableHeadVariant = "default" | "id" | "price" | "markup";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  variant?: TableHeadVariant;
}

const headVariantClasses: Record<TableHeadVariant, string> = {
  default: "",
  id: "font-mono text-xs",
  price: "font-mono font-semibold",
  markup: "font-mono text-xs text-orange-400",
};

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.5px] text-white/90",
        headVariantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

// ---------------------------------------------------------------------------
// TableBody (stagger container)
// ---------------------------------------------------------------------------

const staggerContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentPropsWithoutRef<"tbody">
>(({ className, children, ...props }, ref) => {
  // Omit conflicting event handlers when spreading onto motion element
  const { onDrag, onDragStart, onDragEnd, onDragOver, ...safeProps } = props as Record<string, unknown>;

  return (
    <motion.tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      {...(safeProps as Record<string, unknown>)}
    >
      {children}
    </motion.tbody>
  );
});
TableBody.displayName = "TableBody";

// ---------------------------------------------------------------------------
// TableRow (stagger item with hover gradient)
// ---------------------------------------------------------------------------

const staggerItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected = false, style, children, ...props }, ref) => {
    // Omit conflicting event handlers when spreading onto motion element
    const { onDrag, onDragStart, onDragEnd, onDragOver, ...safeProps } = props as Record<string, unknown>;

    return (
      <motion.tr
        ref={ref}
        className={cn(
          "border-b border-neutral-150/50 transition-colors",
          className,
        )}
        variants={staggerItemVariants}
        whileHover={{
          background:
            "linear-gradient(90deg, rgba(139,92,246,0.03) 0%, rgba(59,191,173,0.04) 50%, rgba(139,92,246,0.02) 100%)",
        }}
        style={
          selected
            ? {
                background:
                  "linear-gradient(90deg, rgba(59,191,173,0.06), rgba(139,92,246,0.03))",
                borderLeft: "3px solid #8B5CF6",
                ...style,
              }
            : style
        }
        {...(safeProps as Record<string, unknown>)}
      >
        {children}
      </motion.tr>
    );
  },
);
TableRow.displayName = "TableRow";

// ---------------------------------------------------------------------------
// TableCell (td cells)
// ---------------------------------------------------------------------------

type TableCellVariant = "default" | "id" | "price" | "markup";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  variant?: TableCellVariant;
}

const cellVariantClasses: Record<TableCellVariant, string> = {
  default: "text-neutral-700",
  id: "font-mono text-xs text-neutral-400",
  price: "font-semibold font-mono",
  markup: "font-mono text-xs text-orange-400",
};

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 text-sm",
        cellVariantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
export type { TableHeadVariant, TableCellVariant, TableRowProps };
