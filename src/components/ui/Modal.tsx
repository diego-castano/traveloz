// IMPORTANT: forceMount on Portal, Overlay, Content prevents Radix pointer-events bug. Do not remove.
"use client";

import React from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { interactions } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// Size mapping
// ---------------------------------------------------------------------------
const sizeMap = {
  sm: "440px",
  md: "560px",
  lg: "720px",
  xl: "900px",
  full: "calc(100vw - 80px)",
} as const;

type ModalSize = keyof typeof sizeMap;

// ---------------------------------------------------------------------------
// Light glass surface — built to match the rest of the admin so Input / Select /
// Checkbox / DatePicker / Toggle (all designed with dark labels on light bg)
// render with proper contrast inside modals.
// ---------------------------------------------------------------------------
const modalSurface: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,251,255,0.94) 100%)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: [
    "0 40px 80px -20px rgba(26,26,46,0.28)",
    "0 24px 48px -12px rgba(108,43,217,0.10)",
    "0 8px 24px -4px rgba(26,26,46,0.08)",
    "inset 0 1px 0 rgba(255,255,255,1)",
    "inset 0 0 0 1px rgba(236,237,245,0.6)",
  ].join(", "),
};

// ---------------------------------------------------------------------------
// Modal (root)
// ---------------------------------------------------------------------------
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  size?: ModalSize;
}

export function Modal({
  open,
  onOpenChange,
  children,
  size = "md",
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay — deep navy wash + backdrop blur to focus attention */}
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[30]"
                style={{ background: "rgba(17,17,36,0.55)" }}
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>

            {/* Centering wrapper — padding keeps modal off the edges on small screens */}
            <div className="fixed inset-0 z-[40] flex items-center justify-center p-4 pointer-events-none">
              <Dialog.Content forceMount asChild>
                <motion.div
                  className="pointer-events-auto flex flex-col overflow-hidden"
                  style={{
                    ...modalSurface,
                    width: sizeMap[size],
                    maxWidth: "100%",
                    maxHeight: "min(88vh, 860px)",
                    borderRadius: "20px",
                  }}
                  initial={interactions.modalContent.initial}
                  animate={interactions.modalContent.animate}
                  exit={interactions.modalContent.exit}
                  transition={interactions.modalContent.transition}
                >
                  {children}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// ModalHeader
// ---------------------------------------------------------------------------
type HeaderVariant = "default" | "destructive";

interface ModalHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: HeaderVariant;
  children?: React.ReactNode;
  onClose?: () => void;
}

const iconChipStyles: Record<HeaderVariant, React.CSSProperties> = {
  default: {
    background: "linear-gradient(135deg, #45D4C0 0%, #7C3AED 100%)",
    boxShadow:
      "0 6px 16px rgba(108,43,217,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
    color: "#FFFFFF",
  },
  destructive: {
    background: "linear-gradient(135deg, #FF8A95 0%, #CC2030 100%)",
    boxShadow:
      "0 6px 16px rgba(204,32,48,0.22), inset 0 1px 0 rgba(255,255,255,0.4)",
    color: "#FFFFFF",
  },
};

export function ModalHeader({
  title,
  description,
  icon,
  variant = "default",
  children,
  onClose,
}: ModalHeaderProps) {
  return (
    <div
      className="relative shrink-0"
      style={{
        padding: "22px 24px 18px",
        borderBottom: "1px solid rgba(26,26,46,0.07)",
      }}
    >
      <div className="flex items-start gap-3.5 pr-10">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center"
            style={{
              borderRadius: "12px",
              ...iconChipStyles[variant],
            }}
          >
            {icon}
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <Dialog.Title
            className="font-display leading-tight tracking-tight"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#1A1A2E",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </Dialog.Title>

          {description && (
            <Dialog.Description
              className="mt-1"
              style={{
                fontSize: "13px",
                color: "#6B6F99",
                lineHeight: 1.5,
              }}
            >
              {description}
            </Dialog.Description>
          )}
        </div>
      </div>

      {children}

      <Dialog.Close asChild>
        <button
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-400/40"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={17} strokeWidth={2.25} />
        </button>
      </Dialog.Close>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalBody
// ---------------------------------------------------------------------------
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div
      className={cn("flex-1 min-h-0 overflow-y-auto", className)}
      style={{ padding: "22px 24px" }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModalFooter
// ---------------------------------------------------------------------------
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-end gap-2.5", className)}
      style={{
        padding: "16px 22px",
        borderTop: "1px solid rgba(26,26,46,0.07)",
        background:
          "linear-gradient(180deg, rgba(245,246,250,0) 0%, rgba(245,246,250,0.5) 100%)",
      }}
    >
      {children}
    </div>
  );
}
