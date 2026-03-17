// IMPORTANT: forceMount on Portal, Overlay, Content prevents Radix pointer-events bug. Do not remove.
"use client";

import React from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { glassMaterials } from "@/components/lib/glass";
import { interactions, springs } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// Size mapping
// ---------------------------------------------------------------------------
const sizeMap = {
  sm: "420px",
  md: "560px",
  lg: "720px",
  xl: "900px",
  full: "calc(100vw - 80px)",
} as const;

type ModalSize = keyof typeof sizeMap;

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
            {/* Overlay */}
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[30]"
                style={{ background: "rgba(26,26,46,0.45)" }}
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.3 }}
              />
            </Dialog.Overlay>

            {/* Centering wrapper — fixed fullscreen, flex-centered */}
            <div className="fixed inset-0 z-[40] flex items-center justify-center pointer-events-none">
              <Dialog.Content forceMount asChild>
                <motion.div
                  className="pointer-events-auto rounded-glass-xl max-h-[85vh] overflow-hidden flex flex-col"
                  style={{
                    ...glassMaterials.liquidModal,
                    width: sizeMap[size],
                  }}
                  initial={interactions.modalContent.initial}
                  animate={interactions.modalContent.animate}
                  exit={interactions.modalContent.exit}
                  transition={interactions.modalContent.transition}
                >
                  {/* Top accent gradient bar */}
                  <div
                    className="h-[2px] w-full shrink-0"
                    style={{
                      background:
                        "linear-gradient(90deg, #8B5CF6, #3BBFAD, #8B5CF6)",
                    }}
                  />
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
interface ModalHeaderProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  onClose?: () => void;
}

export function ModalHeader({
  children,
  title,
  description,
  onClose,
}: ModalHeaderProps) {
  return (
    <div
      className="relative shrink-0"
      style={{
        padding: "22px 24px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Dialog.Title className="text-[18px] font-bold text-white pr-8">
        {title}
      </Dialog.Title>

      {description && (
        <Dialog.Description className="mt-1 text-sm text-white/50">
          {description}
        </Dialog.Description>
      )}

      {children}

      <Dialog.Close asChild>
        <button
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-glass-sm text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-400/40"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={18} />
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
      className={cn("overflow-y-auto", className)}
      style={{
        padding: "20px 24px",
        maxHeight: "calc(80vh - 140px)",
      }}
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
        padding: "14px 24px",
        borderTop: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {children}
    </div>
  );
}
