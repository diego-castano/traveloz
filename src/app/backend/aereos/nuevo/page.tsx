"use client";

// ---------------------------------------------------------------------------
// /backend/aereos/nuevo — standalone "Crear aéreo" page. Delegates the entire
// form to <AereoFullForm>, the shared component also embedded in the package
// flow's ServiceSelectorModal ("Crear aéreo" fast-add).
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { useAuth } from "@/components/providers/AuthProvider";
import { AereoFullForm } from "../_components/AereoFullForm";

export default function NuevoAereoPage() {
  const router = useRouter();
  const { canEdit } = useAuth();

  // VENDEDOR guard: redirect if cannot edit
  useEffect(() => {
    if (!canEdit) router.push("/backend/aereos");
  }, [canEdit, router]);

  if (!canEdit) return null;

  return (
    <>
      <DataTablePageHeader
        title="Nuevo Aéreo"
        subtitle="Crear un nuevo vuelo"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/backend/aereos")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Aéreos
          </Button>
        }
      />

      <AereoFullForm
        onCreated={() => router.push("/backend/aereos")}
        onCancel={() => router.push("/backend/aereos")}
        submitLabel="Crear Aéreo"
      />
    </>
  );
}
