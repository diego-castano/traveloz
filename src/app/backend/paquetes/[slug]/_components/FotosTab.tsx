"use client";

import { useCallback } from "react";
import {
  ImageUploader,
  type ImageItem,
} from "@/components/ui/ImageUploader";
import {
  FormSection,
  FormSections,
} from "@/components/ui/form/FormSection";
import {
  usePaqueteServices,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Paquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FotosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FotosTab({ paquete }: FotosTabProps) {
  const { fotos } = usePaqueteServices(paquete.id);
  const { addFoto, removeFoto, updateFoto } = usePackageActions();
  const { canEdit } = useAuth();

  // -- Map fotos to ImageItem format --
  const images: ImageItem[] = fotos.map((f) => ({
    id: f.id,
    url: f.url,
    alt: f.alt,
  }));

  // -- Handlers --
  const handleAdd = useCallback(
    (urls: string[]) => {
      urls.forEach((url, i) => {
        addFoto({
          paqueteId: paquete.id,
          url,
          alt: `Foto ${fotos.length + i + 1}`,
          orden: fotos.length + i,
        });
      });
    },
    [addFoto, paquete.id, fotos.length],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeFoto(id);
    },
    [removeFoto],
  );

  const handleReorder = useCallback(
    (reordered: ImageItem[]) => {
      reordered.forEach((img, newIndex) => {
        const originalFoto = fotos.find((f) => f.id === img.id);
        if (originalFoto && originalFoto.orden !== newIndex) {
          updateFoto({ ...originalFoto, orden: newIndex });
        }
      });
    },
    [fotos, updateFoto],
  );

  const handleSetPrincipal = useCallback(
    (id: string) => {
      // Move target to front (orden 0), shift others
      const target = fotos.find((f) => f.id === id);
      if (!target) return;
      const reordered = [target, ...fotos.filter((f) => f.id !== id)];
      reordered.forEach((f, i) => {
        if (f.orden !== i) {
          updateFoto({ ...f, orden: i });
        }
      });
    },
    [fotos, updateFoto],
  );

  return (
    <FormSections>
      <FormSection
        title="Fotos del paquete"
        description="Arrastra o sube las fotos que se mostraran en el frontend publico. La primera foto es la principal."
      >
        <ImageUploader
          images={images}
          onAdd={canEdit ? handleAdd : undefined}
          onRemove={canEdit ? handleRemove : undefined}
          onReorder={canEdit ? handleReorder : undefined}
          onSetPrincipal={canEdit ? handleSetPrincipal : undefined}
          maxImages={10}
        />

        {images.length === 0 && !canEdit && (
          <p className="mt-4 text-center text-[13px] text-neutral-400">
            No hay fotos para este paquete
          </p>
        )}
      </FormSection>
    </FormSections>
  );
}
