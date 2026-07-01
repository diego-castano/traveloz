"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

// ---------------------------------------------------------------------------
// ImageLightbox — click-to-open full-screen viewer for itinerary / detail
// images. Itinerary images are wide Amadeus tables with small text, so the
// viewer supports fit-to-screen (default) and 1:1 zoom (scrollable), plus
// prev/next when more than one image is passed. Keyboard: Esc closes, ←/→
// navigate.
// ---------------------------------------------------------------------------
interface ImageLightboxProps {
  images: string[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function ImageLightbox({
  images,
  index,
  onIndexChange,
}: ImageLightboxProps) {
  const open = index !== null && index >= 0 && index < images.length;
  const [zoomed, setZoomed] = React.useState(false);
  // Portal only after mount so SSR doesn't touch `document`.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const close = React.useCallback(() => {
    onIndexChange(null);
  }, [onIndexChange]);

  const go = React.useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = (index + delta + images.length) % images.length;
      setZoomed(false);
      onIndexChange(next);
    },
    [index, images.length, onIndexChange],
  );

  // Reset zoom whenever a new image opens.
  React.useEffect(() => {
    if (open) setZoomed(false);
  }, [open, index]);

  // Keyboard controls + scroll lock while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, go]);

  const url = open ? images[index as number] : null;
  const many = images.length > 1;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && url && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: "rgba(10,10,20,0.9)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
        >
          {/* Toolbar */}
          <div
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={zoomed ? "Ajustar a pantalla" : "Ampliar"}
              title={zoomed ? "Ajustar a pantalla" : "Ampliar (tamaño real)"}
            >
              {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Cerrar"
              title="Cerrar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Counter */}
          {many && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/90">
              {(index as number) + 1} / {images.length}
            </div>
          )}

          {/* Prev / next */}
          {many && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image stage — click backdrop closes; clicking the image toggles zoom */}
          <motion.div
            key={url}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className={
              zoomed
                ? "max-h-[92vh] max-w-[94vw] overflow-auto"
                : "flex max-h-[92vh] max-w-[94vw] items-center justify-center"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              onClick={() => setZoomed((z) => !z)}
              className={
                zoomed
                  ? "max-w-none cursor-zoom-out"
                  : "max-h-[92vh] max-w-[94vw] cursor-zoom-in object-contain"
              }
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
