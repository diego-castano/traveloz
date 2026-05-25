"use client";

// ---------------------------------------------------------------------------
// QuickCreateHotelModal — inline "+ Nuevo hotel" inside a paquete's
// AlojamientosTab so the operator can add a hotel without bouncing out to
// /backend/alojamientos/nuevo, coming back, refreshing, and re-selecting.
//
// Takes ciudad/país from the destino context (no city/country picker — they're
// already implied), plus three required fields: nombre, estrellas, precio por
// noche. Generates a 1-year price window starting today so the new hotel is
// usable immediately (full price calendar lives in the standalone Alojamientos
// section for power-user edits).
//
// After save:
//   1. createAlojamiento  → new row in catalog, provider state gets ADD_ALOJAMIENTO
//   2. createPrecioAlojamiento → initial nightly price (1 year window)
//   3. onAssign(newId)    → assigns the hotel to the destino slot that opened
//                           the modal, so the operator doesn't have to
//                           manually select it from the now-fresh dropdown.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Hotel, Star, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalClose,
} from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useServiceActions } from "@/components/providers/ServiceProvider";

// Same helpers already used in AlojamientosTab for the price-period defaults.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled from the destino that opened the modal. */
  ciudadId: string;
  ciudadNombre: string;
  paisNombre: string;
  /** Called with the newly created alojamiento id so the destino slot can
   * auto-select it instead of forcing the operator to pick from the dropdown. */
  onAssign: (alojamientoId: string) => Promise<void> | void;
}

export function QuickCreateHotelModal({
  open,
  onOpenChange,
  ciudadId,
  ciudadNombre,
  paisNombre,
  onAssign,
}: Props) {
  const { toast } = useToast();
  const { createAlojamiento, createPrecioAlojamiento } = useServiceActions();

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<number>(3);
  const [precio, setPrecio] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Reset state every time the modal opens — without this, leftover
  // values from a prior create leak into the next one (confusing if the
  // operator opens the modal for two different destinos in a row).
  useEffect(() => {
    if (!open) return;
    setNombre("");
    setCategoria(3);
    setPrecio("");
    setSaving(false);
  }, [open]);

  const precioNum = Number(precio);
  const canSave =
    nombre.trim().length > 0 && precioNum > 0 && !Number.isNaN(precioNum);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // The provider's createAlojamiento types its input as the full row
      // minus DB-managed fields (id/createdAt/...) but the server action only
      // requires nombre + ciudadId (+ optional categoria/paisId/sitioWeb).
      // brandId comes from requireAuth(), not from this payload. Cast to the
      // looser server-action shape to avoid demanding brandId/paisId/sitioWeb
      // that the operator shouldn't have to supply for a quick create.
      const created = await createAlojamiento({
        nombre: nombre.trim(),
        ciudadId,
        categoria,
      } as Parameters<typeof createAlojamiento>[0]);
      await createPrecioAlojamiento({
        alojamientoId: (created as { id: string }).id,
        periodoDesde: todayISO(),
        periodoHasta: plusDaysISO(365),
        precioPorNoche: precioNum,
        regimenId: null,
      });
      await onAssign((created as { id: string }).id);
      toast(
        "success",
        "Hotel creado y asignado",
        `${nombre.trim()} se cargó en el catálogo de ${ciudadNombre} y quedó asignado a este destino.`,
      );
      onOpenChange(false);
    } catch (e) {
      toast(
        "error",
        "No se pudo crear el hotel",
        (e as Error).message ?? "Revisá los datos e intentá de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalHeader
        title={`Nuevo hotel en ${ciudadNombre}`}
        description={`Se carga al catálogo de ${paisNombre} y queda asignado a este destino automáticamente. El precio se aplica para los próximos 12 meses; podés ajustarlo después desde Alojamientos.`}
        icon={<Hotel className="h-5 w-5" strokeWidth={2.4} />}
      />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Nombre del hotel
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Hotel Costa Galana"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Estrellas
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCategoria(n)}
                  className="p-1 rounded hover:bg-amber-50 transition-colors"
                  aria-label={`${n} estrellas`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      n <= categoria
                        ? "fill-amber-400 text-amber-400"
                        : "text-neutral-300"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-neutral-400 ml-2">
                {categoria} estrellas
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Precio por noche (USD)
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="120"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Precio promedio. Para tarifas por temporada usá la edición
              completa desde Alojamientos.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button variant="ghost" disabled={saving}>
            Cancelar
          </Button>
        </ModalClose>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando…
            </>
          ) : (
            "Crear y asignar"
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
