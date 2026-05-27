"use client";

// ---------------------------------------------------------------------------
// WebEdit shared context — used by every form under /backend/web/* so they
// stay coherent:
//   • dev mode (show/hide SiteSetting keys + tech labels)
//   • preview iframe handle (forms call refreshPreview() after saving)
// Both pieces of state live at the layout level so they survive client-side
// route changes between sections.
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

const LS_DEV_KEY = "traveloz.webedit.devMode";

type Ctx = {
  devMode: boolean;
  setDevMode: (next: boolean) => void;
  previewRef: MutableRefObject<HTMLIFrameElement | null>;
  /** Force the preview iframe to reload — call after a save. */
  refreshPreview: () => void;
  /** Last refresh timestamp; useful for UI ("Preview actualizado hace 3s"). */
  lastRefreshAt: number | null;
};

const WebEditContext = createContext<Ctx | null>(null);

export function WebEditProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevModeState] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  // Hydrate dev flag from localStorage (skip in SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_DEV_KEY);
      if (raw === "1") setDevModeState(true);
    } catch {
      // private mode / SSR mismatch — ignore
    }
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    setDevModeState(next);
    try {
      localStorage.setItem(LS_DEV_KEY, next ? "1" : "0");
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const refreshPreview = useCallback(() => {
    const frame = previewRef.current;
    if (!frame) return;
    // Bumping the src (instead of contentWindow.location.reload()) avoids
    // SecurityError when the iframe redirects to a different origin during
    // the session.
    const url = new URL(frame.src, window.location.origin);
    url.searchParams.set("_t", String(Date.now()));
    frame.src = url.toString();
    setLastRefreshAt(Date.now());
  }, []);

  const value = useMemo(
    () => ({ devMode, setDevMode, previewRef, refreshPreview, lastRefreshAt }),
    [devMode, setDevMode, refreshPreview, lastRefreshAt],
  );

  return (
    <WebEditContext.Provider value={value}>{children}</WebEditContext.Provider>
  );
}

export function useWebEdit() {
  const ctx = useContext(WebEditContext);
  if (!ctx) {
    throw new Error("useWebEdit must be used inside <WebEditProvider>");
  }
  return ctx;
}
