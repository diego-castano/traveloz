"use client";

// ---------------------------------------------------------------------------
// Botón "Ver datos" de la página de un pago. Toda la ceremonia (confirmación,
// segundo factor y datos en claro que mueren al cerrar) vive en RevelarModal,
// que es el MISMO componente que usa el vendedor en su dashboard: una sola
// implementación de la revelación, un solo lugar donde auditar.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RevelarModal } from "@/app/backend/dashboard/_components/datos/RevelarModal";

export function PagoAbrirButton({
  pagoId,
  disabled,
}: {
  pagoId: string;
  /** Purgado o vencido: no hay nada que abrir. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        leftIcon={<Eye size={14} />}
      >
        Ver datos
      </Button>

      <RevelarModal
        pagoId={pagoId}
        open={open}
        onOpenChange={setOpen}
        // El registro pasó a "Abierto": refrescamos la cabecera del server.
        onRevelado={() => router.refresh()}
      />
    </>
  );
}
