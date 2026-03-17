"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { springs } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate visible page numbers with ellipsis markers.
 * Shows first, last, and 2 pages around current when totalPages > 7.
 */
function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (current > 4) {
    pages.push("ellipsis-start");
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  // Right ellipsis
  if (current < total - 3) {
    pages.push("ellipsis-end");
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total);
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Clay active styles (inline -- teal gradient from design.json)
// ---------------------------------------------------------------------------

const clayActiveStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, #45D4C0 0%, #2A9E8E 100%)",
  boxShadow:
    "6px 6px 16px rgba(42,158,142,0.25), -3px -3px 10px rgba(69,212,192,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
  color: "white",
};

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ currentPage, totalPages, onPageChange, className }, ref) => {
    const pages = getPageNumbers(currentPage, totalPages);

    if (totalPages <= 1) return null;

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination"
        className={cn("flex items-center gap-1", className)}
      >
        {/* Previous button */}
        <motion.button
          type="button"
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-clay text-sm",
            currentPage <= 1
              ? "text-neutral-300 cursor-not-allowed"
              : "text-neutral-600 hover:bg-neutral-100/60",
          )}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          whileTap={currentPage > 1 ? { scale: 0.96 } : undefined}
          transition={springs.snappy}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>

        {/* Page buttons */}
        {pages.map((page) => {
          if (page === "ellipsis-start" || page === "ellipsis-end") {
            return (
              <span
                key={page}
                className="h-9 w-9 inline-flex items-center justify-center text-sm text-neutral-400"
                aria-hidden
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <motion.button
              key={page}
              type="button"
              className={cn(
                "h-9 w-9 text-sm font-semibold inline-flex items-center justify-center rounded-clay",
                !isActive && "bg-transparent hover:bg-neutral-100/60 text-neutral-600",
              )}
              style={isActive ? clayActiveStyle : undefined}
              onClick={() => onPageChange(page)}
              whileTap={{ scale: 0.96 }}
              transition={springs.snappy}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </motion.button>
          );
        })}

        {/* Next button */}
        <motion.button
          type="button"
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-clay text-sm",
            currentPage >= totalPages
              ? "text-neutral-300 cursor-not-allowed"
              : "text-neutral-600 hover:bg-neutral-100/60",
          )}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          whileTap={currentPage < totalPages ? { scale: 0.96 } : undefined}
          transition={springs.snappy}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";

export { Pagination };
