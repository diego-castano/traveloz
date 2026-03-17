"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// PriceImpactModal -- confirmation dialog shown before saving price changes
// that affect packages already using this service.
// ---------------------------------------------------------------------------

interface PriceImpactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affectedCount: number;
  serviceName: string;
  onConfirm: () => void;
}

export function PriceImpactModal({
  open,
  onOpenChange,
  affectedCount,
  serviceName,
  onConfirm,
}: PriceImpactModalProps) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalHeader title="Confirmar cambio de precio">{null}</ModalHeader>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-white text-sm">
              El cambio de precio en <strong>{serviceName}</strong> afectara{" "}
              <strong className="text-amber-400">
                {affectedCount} {affectedCount === 1 ? "paquete" : "paquetes"}
              </strong>{" "}
              que utilizan este servicio.
            </p>
            <p className="text-white/50 text-xs mt-2">
              Los paquetes afectados recalcularan su precio neto automaticamente.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm}>
          Confirmar cambio
        </Button>
      </ModalFooter>
    </Modal>
  );
}
