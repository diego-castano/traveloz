"use client";

import * as React from "react";
import { Move, RotateCcw, ZoomIn } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalClose,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FramedImage } from "@/components/media/FramedImage";

export interface FocalValue {
  posX: number;
  posY: number;
  zoom: number;
}

interface FocalPointEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  /** Valor inicial del encuadre. */
  value: FocalValue;
  onSave: (value: FocalValue) => void;
  /** Aspecto del marco (ancho/alto). El hero/slider del sitio usa 16/9. */
  aspect?: number;
  /** Nota opcional (ej. "Esta es la foto destacada / hero"). */
  hint?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Editor de encuadre no destructivo: mueve (arrastrando) y acerca la imagen
 * dentro de un marco que muestra EXACTAMENTE lo que se verá publicado. No
 * modifica el archivo; solo guarda el punto focal (posX/posY %) y el zoom.
 */
export function FocalPointEditor({
  open,
  onOpenChange,
  src,
  value,
  onSave,
  aspect = 16 / 9,
  hint,
}: FocalPointEditorProps) {
  const [posX, setPosX] = React.useState(value.posX);
  const [posY, setPosY] = React.useState(value.posY);
  const [zoom, setZoom] = React.useState(value.zoom);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    w: number;
    h: number;
  } | null>(null);

  // Re-seed when opening on a different photo/value.
  React.useEffect(() => {
    if (open) {
      setPosX(value.posX);
      setPosY(value.posY);
      setZoom(value.zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, src]);

  const onPointerDown = (e: React.PointerEvent) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: posX,
      startPosY: posY,
      w: rect.width,
      h: rect.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    // Arrastrar la imagen: mover el puntero hacia la derecha/abajo revela el
    // lado izquierdo/superior, así que la posición focal se mueve en sentido
    // inverso. Un arrastre de todo el ancho ≈ recorre todo el rango.
    const dx = ((e.clientX - d.startX) / d.w) * 100;
    const dy = ((e.clientY - d.startY) / d.h) * 100;
    setPosX(clamp(d.startPosX - dx, 0, 100));
    setPosY(clamp(d.startPosY - dy, 0, 100));
  };

  const endDrag = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  const reset = () => {
    setPosX(50);
    setPosY(50);
    setZoom(1);
  };

  const save = () => {
    onSave({
      posX: Math.round(posX * 10) / 10,
      posY: Math.round(posY * 10) / 10,
      zoom: Math.round(zoom * 100) / 100,
    });
    onOpenChange(false);
  };

  const dirty =
    posX !== value.posX || posY !== value.posY || zoom !== value.zoom;

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <ModalHeader
        title="Encuadre de la foto"
        description="Arrastrá la imagen para reubicarla y usá el zoom. El marco muestra tal cual se verá en el sitio."
      />
      <ModalBody>
        {hint && (
          <div className="mb-3 rounded-[8px] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            {hint}
          </div>
        )}

        {/* Marco WYSIWYG — mismo recorte que el frontend. */}
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-[10px] border border-hairline bg-neutral-100 active:cursor-grabbing"
          style={{ aspectRatio: String(aspect) }}
        >
          <FramedImage
            src={src}
            posX={posX}
            posY={posY}
            zoom={zoom}
            draggable={false}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />
          {/* Guías centrales sutiles para ayudar a alinear. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/25" />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
            <Move className="mr-1 inline h-3 w-3 align-[-2px]" />
            Arrastrá para reubicar
          </div>
        </div>

        {/* Zoom */}
        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(clamp(Number(e.target.value), MIN_ZOOM, MAX_ZOOM))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#3BBFAD]"
            aria-label="Zoom"
          />
          <span className="w-12 shrink-0 text-right text-[12.5px] tabular-nums text-neutral-500">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={reset}
          className="mr-auto inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer
        </button>
        <ModalClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </ModalClose>
        <Button type="button" onClick={save} disabled={!dirty}>
          Guardar encuadre
        </Button>
      </ModalFooter>
    </Modal>
  );
}
