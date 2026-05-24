"use client";

import { useEffect } from "react";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";

// ---------------------------------------------------------------------------
// useUnsavedWarn — shared `beforeunload` guard for forms with autosave or
// in-flight server actions. Pass any subset of statuses that should block
// tab close / nav-away (typically "saving" + "unsaved").
//
// Why a hook and not raw window.addEventListener at the call-site: every
// paquete tab needs the same protection, and forgetting to clean up the
// listener leaks across tab switches in our SPA layout.
// ---------------------------------------------------------------------------
export function useUnsavedWarn(status: AutoSaveStatus) {
  useEffect(() => {
    if (status !== "saving" && status !== "unsaved") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);
}
