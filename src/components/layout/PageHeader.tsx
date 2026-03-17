"use client";

import { motion } from "motion/react";

// ---------------------------------------------------------------------------
// PageHeader -- standardized page title for all module pages
// Source: design.json patterns.listView.pageHeader
// Font: Playfair Display (font-display) at 26px, 700 weight
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  /** Page title -- rendered in display font */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Optional action element (typically a Button component) */
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.div
      className="flex items-center justify-between mb-6"
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35 }}
    >
      {/* Left side: Title + Subtitle */}
      <div>
        <h1 className="font-display text-[26px] font-bold text-neutral-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-neutral-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right side: Optional action button */}
      {action && <div>{action}</div>}
    </motion.div>
  );
}
