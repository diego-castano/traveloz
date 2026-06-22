"use client";

// ---------------------------------------------------------------------------
// WebEditShell — three-column layout for /backend/web/*:
//   [ section nav | form content (children) | live preview iframe ]
//
// The preview column tracks the current admin route (PREVIEW_ROUTES map) and
// auto-refreshes whenever a form calls `useWebEdit().refreshPreview()` after
// saving. A small toolbar lets the admin flip mobile/desktop, force-refresh,
// pop the preview into a new tab, and toggle the global "dev mode" that
// surfaces the SiteSetting keys.
// ---------------------------------------------------------------------------

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Smartphone,
  Monitor,
  RefreshCw,
  ExternalLink,
  EyeOff,
  Eye,
  Code2,
} from "lucide-react";
import { cn } from "@/components/lib/cn";
import { useWebEdit } from "./web-edit-context";
import { getPreviewUrlFor } from "./preview-routes";

type Device = "desktop" | "mobile";

// Logical viewport sizes the iframe renders at (the site sees these dimensions
// and picks its desktop / mobile layouts). The visible preview is then scaled
// down with CSS transforms to fit inside the available preview pane.
const DESKTOP_VW = 1280;
const MOBILE_VW = 390;
const MOBILE_VH = 844;

// Preferencia de mostrar/ocultar el preview, recordada entre páginas y recargas.
const PREVIEW_HIDDEN_KEY = "web-preview-hidden";

// Rutas del panel web que no tienen un preview útil (no mapean a una página
// pública). Ahí el preview arranca oculto para no apretar la columna del form.
const NO_PREVIEW_ROUTES = ["/backend/web/notificaciones"];

export function WebEditShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { previewRef, refreshPreview, lastRefreshAt, devMode, setDevMode } =
    useWebEdit();
  const [device, setDevice] = useState<Device>("desktop");
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const routeHasNoPreview = useMemo(
    () => NO_PREVIEW_ROUTES.some((r) => pathname.startsWith(r)),
    [pathname],
  );

  // La preferencia manual (localStorage) manda en todo el panel. Si no hay
  // preferencia guardada, ocultamos sólo donde el preview no aporta.
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(PREVIEW_HIDDEN_KEY)
        : null;
    if (saved === "1") setHidden(true);
    else if (saved === "0") setHidden(false);
    else setHidden(routeHasNoPreview);
  }, [routeHasNoPreview]);

  const togglePreview = () =>
    setHidden((h) => {
      const next = !h;
      try {
        window.localStorage.setItem(PREVIEW_HIDDEN_KEY, next ? "1" : "0");
      } catch {
        // localStorage no disponible (modo privado): la preferencia dura la sesión.
      }
      return next;
    });

  // Track the available preview canvas so we can scale the iframe to fit.
  // The parent backend layout uses `overflow-y-auto`, so we can't rely on
  // flex/`min-h-0` to bound the height — compute it explicitly from the
  // viewport and the canvas's top offset.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const recompute = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({
        w: el.clientWidth - 32, // p-4 padding (16 each side)
        h: Math.max(0, window.innerHeight - rect.top - 16),
      });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    ro.observe(document.documentElement);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, []);

  const availW = canvasSize.w;
  const availH = canvasSize.h;
  const desktopScale = availW > 0 ? Math.min(1, availW / DESKTOP_VW) : 1;
  const mobileScale =
    availW > 0 && availH > 0
      ? Math.min(1, availW / MOBILE_VW, availH / MOBILE_VH)
      : 1;
  const scale = device === "desktop" ? desktopScale : mobileScale;
  const scalePct = Math.round(scale * 100);

  const previewUrl = useMemo(() => getPreviewUrlFor(pathname), [pathname]);

  // Tick once a second so "Actualizado hace Xs" stays fresh without re-render
  // pressure on the form.
  useEffect(() => {
    if (!lastRefreshAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastRefreshAt]);

  const refreshedAgo = lastRefreshAt
    ? Math.max(0, Math.round((now - lastRefreshAt) / 1000))
    : null;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Form column ─────────────────────────────────────────────── */}
      <section
        className={cn(
          "min-h-0 overflow-y-auto bg-neutral-50/40",
          hidden ? "flex-1" : "flex-1 lg:flex-[0_0_minmax(520px,46%)]",
        )}
      >
        {children}
      </section>

      {/* ── Preview column ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-l border-neutral-200/80 bg-neutral-100",
          hidden ? "w-0 overflow-hidden border-l-0" : "flex-1 min-w-0",
        )}
        aria-hidden={hidden}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/80 bg-white shrink-0">
          <div className="flex items-center bg-neutral-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded",
                device === "desktop"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700",
              )}
              title="Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded",
                device === "mobile"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700",
              )}
              title="Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 truncate ml-1">
            {previewUrl}
            <span className="ml-2 text-neutral-400">
              · {device === "desktop" ? `${DESKTOP_VW}px` : `${MOBILE_VW}×${MOBILE_VH}`} @ {scalePct}%
            </span>
            {refreshedAgo !== null && (
              <span className="ml-2 text-emerald-600">
                · actualizado {refreshedAgo < 5 ? "ahora" : `hace ${refreshedAgo}s`}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDevMode(!devMode)}
              className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-md border transition",
                devMode
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800",
              )}
              title={devMode ? "Ocultar keys técnicas" : "Mostrar keys técnicas"}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => refreshPreview()}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800"
              title="Recargar preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Iframe canvas — renders the site at a fixed logical viewport
            (1280px desktop / 390×844 mobile) and scales the visible frame down
            with CSS transforms so the public site believes it's on a real
            desktop instead of getting squeezed into the pane width. */}
        <div
          ref={canvasRef}
          className="overflow-hidden flex items-start justify-center p-4"
          style={{ height: canvasSize.h || undefined }}
        >
          {device === "desktop" ? (
            <div
              className="bg-white rounded-md shadow-sm border border-neutral-200 overflow-hidden"
              style={{ width: DESKTOP_VW * scale, height: availH }}
            >
              <iframe
                ref={previewRef}
                src={previewUrl}
                title="Preview del sitio público"
                style={{
                  width: DESKTOP_VW,
                  height: scale > 0 ? availH / scale : availH,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  border: 0,
                  display: "block",
                }}
              />
            </div>
          ) : (
            <div
              className="bg-white rounded-[28px] shadow-md border border-neutral-300 overflow-hidden"
              style={{ width: MOBILE_VW * scale, height: MOBILE_VH * scale }}
            >
              <iframe
                ref={previewRef}
                src={previewUrl}
                title="Preview del sitio público"
                style={{
                  width: MOBILE_VW,
                  height: MOBILE_VH,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  border: 0,
                  display: "block",
                }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* ── Floating hide/show toggle (desktop only) ─────────────────── */}
      <button
        type="button"
        onClick={togglePreview}
        className="hidden lg:flex fixed bottom-4 right-4 items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white text-xs rounded-full shadow-lg hover:bg-neutral-800 z-50"
        title={hidden ? "Mostrar preview" : "Ocultar preview"}
      >
        {hidden ? (
          <>
            <Eye className="w-3.5 h-3.5" /> Mostrar preview
          </>
        ) : (
          <>
            <EyeOff className="w-3.5 h-3.5" /> Ocultar preview
          </>
        )}
      </button>
    </div>
  );
}
