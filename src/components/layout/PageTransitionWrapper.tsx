"use client";

// ---------------------------------------------------------------------------
// PageTransitionWrapper -- AnimatePresence + FrozenRouter for page transitions
// Source: design.json animations.interactions.pageTransition
//
// CRITICAL: LayoutRouterContext is imported from an internal Next.js module.
// This is a non-public API that is stable across Next.js 14.x. It is the
// standard community pattern for AnimatePresence page transitions in the
// App Router. If Next.js changes the internal path in a future major version,
// only this file needs updating.
// ---------------------------------------------------------------------------

import { AnimatePresence, motion } from "motion/react";
import { useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useEffect, useRef, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// usePreviousValue -- captures the previous render's value via ref
// ---------------------------------------------------------------------------

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T>();

  useEffect(() => {
    prevValue.current = value;
    return () => {
      prevValue.current = undefined;
    };
  });

  return prevValue.current;
}

// ---------------------------------------------------------------------------
// FrozenRouter -- freezes the router context during exit animations
// This prevents Next.js from unmounting children before AnimatePresence
// can play the exit animation.
// ---------------------------------------------------------------------------

function FrozenRouter({ children }: { children: ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) || null;

  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);

  const changed =
    segment !== prevSegment &&
    segment !== undefined &&
    prevSegment !== undefined;

  return (
    <LayoutRouterContext.Provider value={changed ? prevContext : context}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// PageTransitionWrapper -- exported component
// Wraps page content in AnimatePresence with enter/exit transitions
// Transition values: design.json animations.interactions.pageTransition
//   initial: opacity:0, y:12, blur(4px)
//   animate: opacity:1, y:0, blur(0px)
//   exit: opacity:0, y:-8
//   duration: 0.3s
// ---------------------------------------------------------------------------

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
