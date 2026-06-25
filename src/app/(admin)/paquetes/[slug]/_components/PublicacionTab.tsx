"use client";

import { useMemo } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tag, type TagColor } from "@/components/ui/Tag";
import {
  FormSection,
  FormSections,
} from "@/components/ui/form/FormSection";
import {
  Field,
} from "@/components/ui/form/Field";
import {
  usePackageActions,
  usePaqueteServices,
} from "@/components/providers/PackageProvider";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { Paquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicacionTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Estado badge (read-only — estado se edita en la pestaña Datos)
// ---------------------------------------------------------------------------

const estadoBadge: Record<
  string,
  { variant: "active" | "draft" | "inactive"; label: string }
> = {
  ACTIVO: { variant: "active", label: "Activo" },
  BORRADOR: { variant: "draft", label: "Borrador" },
  INACTIVO: { variant: "inactive", label: "Inactivo" },
};

// ---------------------------------------------------------------------------
// Tag color mapping (hex -> Tag preset)
// ---------------------------------------------------------------------------

const hexToTagColor: Record<string, TagColor> = {
  "#22c55e": "green",
  "#06b6d4": "blue",
  "#8b5cf6": "violet",
  "#1e293b": "teal",
  "#f97316": "orange",
  "#ec4899": "red",
  "#3b82f6": "blue",
  "#14b8a6": "teal",
};

function getTagColor(hex: string): TagColor {
  return hexToTagColor[hex.toLowerCase()] ?? "teal";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicacionTab({ paquete }: PublicacionTabProps) {
  const { updatePaquete, assignEtiqueta, removeEtiqueta } =
    usePackageActions();
  const { etiquetas: assignedPaqueteEtiquetas } = usePaqueteServices(
    paquete.id,
  );
  const allEtiquetas = useEtiquetas();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- Available etiquetas (not yet assigned) --
  const assignedEtiquetaIds = useMemo(
    () => new Set(assignedPaqueteEtiquetas.map((pe) => pe.etiquetaId)),
    [assignedPaqueteEtiquetas],
  );

  const availableEtiquetas = useMemo(
    () => allEtiquetas.filter((e) => !assignedEtiquetaIds.has(e.id)),
    [allEtiquetas, assignedEtiquetaIds],
  );

  const etiquetaSelectOptions = useMemo(
    () =>
      availableEtiquetas.map((e) => ({
        value: e.id,
        label: e.nombre,
      })),
    [availableEtiquetas],
  );

  // -- Etiqueta lookup map --
  const etiquetaMap = useMemo(
    () => new Map(allEtiquetas.map((e) => [e.id, e])),
    [allEtiquetas],
  );

  // -- Handlers --
  const handleDestacadoToggle = (checked: boolean) => {
    updatePaquete({ ...paquete, destacado: checked });
    toast(
      "success",
      checked ? "Marcado como destacado" : "Destacado removido",
    );
  };

  const handleAddEtiqueta = (etiquetaId: string) => {
    assignEtiqueta({ paqueteId: paquete.id, etiquetaId });
    const etiqueta = etiquetaMap.get(etiquetaId);
    toast("success", "Etiqueta asignada", etiqueta?.nombre ?? "");
  };

  const handleRemoveEtiqueta = (paqueteEtiquetaId: string) => {
    removeEtiqueta(paqueteEtiquetaId);
    toast("info", "Etiqueta removida");
  };

  return (
    <FormSections>
      {/* ------------------------------------------------------------------ */}
      {/* Estado de publicacion                                              */}
      {/* ------------------------------------------------------------------ */}
      <FormSection
        title="Estado de publicacion"
        description="El estado y la vigencia se editan en la pestaña Datos. Aca solo se controla si el paquete aparece como destacado en la home."
      >
        <div className="flex flex-col gap-4">
          <Field orientation="horizontal">
            <span className="text-[13px] text-neutral-600">Estado actual:</span>
            <Badge
              variant={estadoBadge[paquete.estado]?.variant ?? "draft"}
              size="md"
            >
              {estadoBadge[paquete.estado]?.label ?? paquete.estado}
            </Badge>
            {paquete.validezHasta && (
              <span className="text-[12px] text-neutral-400">
                · vigente hasta{" "}
                {new Date(paquete.validezHasta).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </Field>
          <Field orientation="horizontal">
            <Toggle
              checked={paquete.destacado}
              onCheckedChange={handleDestacadoToggle}
              disabled={!canEdit}
              label="Destacado"
            />
          </Field>
        </div>
      </FormSection>

      {/* ------------------------------------------------------------------ */}
      {/* Etiquetas                                                          */}
      {/* ------------------------------------------------------------------ */}
      <FormSection
        title="Etiquetas"
        description="Campanas, promociones y filtros que aplican a este paquete."
      >
        <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
          {assignedPaqueteEtiquetas.length === 0 ? (
            <p className="text-[13px] text-neutral-400 italic">
              Sin etiquetas asignadas
            </p>
          ) : (
            assignedPaqueteEtiquetas.map((pe) => {
              const etiqueta = etiquetaMap.get(pe.etiquetaId);
              if (!etiqueta) return null;
              return (
                <Tag
                  key={pe.id}
                  color={getTagColor(etiqueta.color)}
                  removable={canEdit}
                  onRemove={() => handleRemoveEtiqueta(pe.id)}
                >
                  {etiqueta.nombre}
                </Tag>
              );
            })
          )}
        </div>

        {canEdit && availableEtiquetas.length > 0 && (
          <div className="max-w-xs">
            <Select
              value=""
              onValueChange={handleAddEtiqueta}
              options={etiquetaSelectOptions}
              placeholder="Agregar etiqueta..."
            />
          </div>
        )}
      </FormSection>
    </FormSections>
  );
}
