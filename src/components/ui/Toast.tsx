"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { glassMaterials } from "@/components/lib/glass";
import { interactions, springs } from "@/components/lib/animations";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (
    variant: ToastVariant,
    title: string,
    description?: string,
  ) => void;
}

// ---------------------------------------------------------------------------
// Variant configuration
// ---------------------------------------------------------------------------
const variantConfig: Record<
  ToastVariant,
  { borderColor: string; color: string; Icon: React.ElementType }
> = {
  success: { borderColor: "#2EAD6B", color: "#2EAD6B", Icon: CheckCircle },
  error: { borderColor: "#E74C5F", color: "#E74C5F", Icon: XCircle },
  warning: { borderColor: "#E8913A", color: "#E8913A", Icon: AlertTriangle },
  info: { borderColor: "#2B8AFF", color: "#2B8AFF", Icon: Info },
};

// ---------------------------------------------------------------------------
// Context + useToast hook
// ---------------------------------------------------------------------------
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Enhanced frosted glass style for toasts
// ---------------------------------------------------------------------------
const toastGlassStyle: React.CSSProperties = {
  ...glassMaterials.frosted,
  backdropFilter: "blur(30px) saturate(200%) brightness(1.05)",
  WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(1.05)",
  borderTop: "1px solid rgba(255,255,255,0.5)",
};

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 5000;

// ---------------------------------------------------------------------------
// ToastProvider
// ---------------------------------------------------------------------------
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const removeToast = useCallback((id: string) => {
    // Clear the auto-dismiss timer to prevent double-removal
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = crypto.randomUUID();

      setToasts((prev) => {
        // Enforce max toasts — remove oldest when exceeding
        const next = [...prev, { id, variant, title, description }];
        if (next.length > MAX_TOASTS) {
          const removed = next.shift();
          if (removed) {
            const timer = timersRef.current.get(removed.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(removed.id);
            }
          }
        }
        return next;
      });

      // Schedule auto-dismiss
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);

      timersRef.current.set(id, timer);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const { borderColor, color, Icon } = variantConfig[t.variant];

            return (
              <motion.div
                key={t.id}
                layout
                style={{
                  ...toastGlassStyle,
                  borderLeft: `3px solid ${borderColor}`,
                }}
                className="max-w-[400px] rounded-glass p-4 shadow-elevation-16"
                initial={interactions.toastSlide.initial}
                animate={interactions.toastSlide.animate}
                exit={interactions.toastSlide.exit}
                transition={interactions.toastSlide.transition}
              >
                <div className="flex items-start gap-3">
                  {/* Variant icon */}
                  <Icon
                    size={20}
                    className="mt-0.5 shrink-0"
                    style={{ color }}
                  />

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => removeToast(t.id)}
                    className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-glass-sm text-neutral-400 transition-colors hover:bg-neutral-100/60 hover:text-neutral-600"
                    aria-label="Cerrar notificacion"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
