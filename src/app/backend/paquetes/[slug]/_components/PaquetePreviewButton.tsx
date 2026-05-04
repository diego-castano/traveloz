"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Eye, ExternalLink, X, Smartphone, Monitor, Tablet } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getPaquetePreviewUrl } from "@/actions/paquete-frontend.actions";

// ---------------------------------------------------------------------------
// PaquetePreviewButton — opens the public package page inside a full-screen
// iframe overlay so the user can verify the frontend rendering without
// leaving the edit screen. Drafts (publicado=false) work because the public
// page honors ?preview=1 for authenticated admins.
// ---------------------------------------------------------------------------

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: Record<
  Viewport,
  { label: string; width: number; icon: typeof Monitor }
> = {
  desktop: { label: "Desktop", width: 1280, icon: Monitor },
  tablet: { label: "Tablet", width: 820, icon: Tablet },
  mobile: { label: "Mobile", width: 390, icon: Smartphone },
};

export function PaquetePreviewButton({ paqueteId }: { paqueteId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [isPending, start] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll while the preview is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleOpen = () => {
    start(async () => {
      const res = await getPaquetePreviewUrl(paqueteId);
      if (!res.ok) {
        toast("error", "No se puede previsualizar", res.reason);
        return;
      }
      if (res.slugGenerated) {
        toast(
          "info",
          "Slug autogenerado",
          `Asignamos "${res.slugGenerated}" para que la URL pública funcione. Podés cambiarlo en la pestaña Frontend.`,
        );
      }
      setUrl(res.url);
      setPublicado(res.publicado);
      setReloadKey((k) => k + 1);
      setOpen(true);
    });
  };

  const handleReload = () => setReloadKey((k) => k + 1);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="group preview-btn"
        aria-label="Previsualizar paquete"
      >
        <span className="preview-btn__glow" aria-hidden />
        <span className="preview-btn__icon">
          {isPending ? (
            <span className="preview-btn__spinner" aria-hidden />
          ) : (
            <>
              <Eye className="h-4 w-4" strokeWidth={2.2} />
              <span className="preview-btn__pulse" aria-hidden />
            </>
          )}
        </span>
        <span className="preview-btn__label">
          {isPending ? "Cargando…" : "Previsualizar"}
        </span>
        <style jsx>{`
          .preview-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px 8px 12px;
            border-radius: 10px;
            border: 1px solid rgba(120, 90, 229, 0.18);
            background: linear-gradient(
              135deg,
              rgba(120, 90, 229, 0.08) 0%,
              rgba(59, 191, 173, 0.08) 100%
            );
            color: #5b3fc2;
            font-size: 13.5px;
            font-weight: 600;
            letter-spacing: 0.1px;
            cursor: pointer;
            overflow: hidden;
            transition:
              transform 0.18s ease,
              box-shadow 0.22s ease,
              border-color 0.22s ease,
              background 0.22s ease;
            box-shadow:
              0 1px 2px rgba(120, 90, 229, 0.06),
              inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          }
          .preview-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: rgba(120, 90, 229, 0.32);
            background: linear-gradient(
              135deg,
              rgba(120, 90, 229, 0.14) 0%,
              rgba(59, 191, 173, 0.14) 100%
            );
            box-shadow:
              0 8px 22px -8px rgba(120, 90, 229, 0.45),
              0 2px 6px rgba(120, 90, 229, 0.12),
              inset 0 0 0 1px rgba(255, 255, 255, 0.7);
          }
          .preview-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow:
              0 2px 6px rgba(120, 90, 229, 0.18),
              inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          }
          .preview-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .preview-btn:focus-visible {
            outline: none;
            box-shadow:
              0 0 0 3px rgba(120, 90, 229, 0.28),
              0 8px 22px -8px rgba(120, 90, 229, 0.45);
          }

          /* Animated sweep on hover */
          .preview-btn__glow {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              115deg,
              transparent 30%,
              rgba(255, 255, 255, 0.55) 50%,
              transparent 70%
            );
            transform: translateX(-120%);
            transition: transform 0.6s ease;
            pointer-events: none;
          }
          .preview-btn:hover:not(:disabled) .preview-btn__glow {
            transform: translateX(120%);
          }

          .preview-btn__icon {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 7px;
            background: linear-gradient(135deg, #8b5cf6 0%, #3bbfad 100%);
            color: white;
            box-shadow:
              0 2px 6px rgba(120, 90, 229, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.25);
          }

          /* Pulsing dot on top-right of the icon to suggest "live" preview */
          .preview-btn__pulse {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #34d399;
            box-shadow: 0 0 0 2px white;
          }
          .preview-btn__pulse::after {
            content: "";
            position: absolute;
            inset: -3px;
            border-radius: 999px;
            background: #34d399;
            opacity: 0.55;
            animation: previewPulse 1.6s ease-out infinite;
          }
          @keyframes previewPulse {
            0% {
              transform: scale(0.8);
              opacity: 0.55;
            }
            100% {
              transform: scale(1.9);
              opacity: 0;
            }
          }

          /* Spinner while loading */
          .preview-btn__spinner {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-top-color: white;
            animation: previewSpin 0.7s linear infinite;
          }
          @keyframes previewSpin {
            to {
              transform: rotate(360deg);
            }
          }

          .preview-btn__label {
            position: relative;
            z-index: 1;
          }
        `}</style>
      </button>

      {mounted && open && url
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Previsualización del paquete"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(15, 13, 35, 0.92)",
                backdropFilter: "blur(4px)",
                display: "flex",
                flexDirection: "column",
                animation: "previewFadeIn 160ms ease-out",
              }}
            >
              <style>{`
                @keyframes previewFadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes previewSlideUp {
                  from { transform: translateY(16px); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
                }
              `}</style>

              {/* Toolbar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  color: "white",
                }}
              >
                <Eye className="h-4 w-4" style={{ opacity: 0.8 }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Preview del paquete
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: publicado
                      ? "rgba(34, 197, 94, 0.18)"
                      : "rgba(245, 158, 11, 0.18)",
                    color: publicado ? "#86efac" : "#fcd34d",
                    fontWeight: 600,
                    letterSpacing: 0.3,
                  }}
                >
                  {publicado ? "PUBLICADO" : "BORRADOR"}
                </span>

                {/* Viewport switcher */}
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: 2,
                    padding: 2,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 8,
                  }}
                >
                  {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => {
                    const meta = VIEWPORTS[v];
                    const Icon = meta.icon;
                    const active = viewport === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setViewport(v)}
                        title={`${meta.label} (${meta.width}px)`}
                        style={{
                          background: active
                            ? "rgba(255,255,255,0.16)"
                            : "transparent",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 6,
                          color: active ? "white" : "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleReload}
                  title="Recargar preview"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Recargar
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir en nueva pestaña"
                  style={{
                    color: "white",
                    background: "rgba(255,255,255,0.08)",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Nueva pestaña
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar preview"
                  title="Cerrar (Esc)"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "white",
                    padding: 7,
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Iframe stage — flexbox column so the inner container gets a
                  real height that the iframe can fill. `overflow: hidden` here
                  prevents the dreaded double-scrollbar (one for the modal stage
                  AND one for the iframe). The iframe owns its own scroll. */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "center",
                  padding: viewport === "desktop" ? 0 : 24,
                  overflow: "hidden",
                }}
              >
                <div
                  key={reloadKey}
                  style={{
                    width:
                      viewport === "desktop"
                        ? "100%"
                        : VIEWPORTS[viewport].width,
                    maxWidth: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    background: "white",
                    borderRadius: viewport === "desktop" ? 0 : 12,
                    overflow: "hidden",
                    boxShadow:
                      viewport === "desktop"
                        ? "none"
                        : "0 24px 60px rgba(0,0,0,0.4)",
                    animation: "previewSlideUp 200ms ease-out",
                  }}
                >
                  <iframe
                    src={url}
                    title="Preview"
                    style={{
                      flex: 1,
                      width: "100%",
                      minHeight: 0,
                      border: 0,
                      display: "block",
                      background: "white",
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
