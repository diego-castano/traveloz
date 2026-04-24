"use client";

// ---------------------------------------------------------------------------
// PageTransitionWrapper -- lightweight page enter animation
// Source: design.json animations.interactions.pageTransition
//
// We intentionally avoid exit-animation router freezing here. In practice, the
// frozen-router pattern can leave invisible pages participating in layout while
// switching between heavy modules, which shows up as large blank gaps above the
// new page. A simple enter-only animation keeps the transition pleasant without
// risking that ghost layout.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

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
    <motion.div
      key={segment}
      initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
