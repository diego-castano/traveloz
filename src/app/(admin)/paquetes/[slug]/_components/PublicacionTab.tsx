"use client";

import { useMemo } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tag, type TagColor } from "@/components/ui/Tag";
import {
  FormSection,
  FormSections,
} from "@/components/ui/form/FormSection";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/form/Field";
import {
  usePackageActions,
  usePaqueteServices,
} from "@/components/providers/PackageProvider";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate, parseStoredDate } from "@/lib/date";
import type { Paquete, EstadoPaquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicacionTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Estado options
// ---------------------------------------------------------------------------

const ESTADO_OPTIONS: { value: EstadoPaquete; label: string }[] = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

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

  // -- Publicado derived from estado --
  const isPublicado = paquete.estado === "ACTIVO";

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
  const handlePublicadoToggle = (checked: boolean) => {
    const newEstado: EstadoPaquete = checked ? "ACTIVO" : "INACTIVO";
    updatePaquete({ ...paquete, estado: newEstado });
    toast(
      "success",
      checked ? "Paquete publicado" : "Paquete despublicado",
      `Estado cambiado a ${checked ? "Activo" : "Inactivo"}`,
    );
  };

  const handleDestacadoToggle = (checked: boolean) => {
    updatePaquete({ ...paquete, destacado: checked });
    toast(
      "success",
      checked ? "Marcado como destacado" : "Destacado removido",
    );
  };

  const handleEstadoChange = (value: string) => {
    const newEstado = value as EstadoPaquete;
    updatePaquete({ ...paquete, estado: newEstado });
    toast("success", "Estado actualizado", `Nuevo estado: ${value}`);
  };

  const handleValidezDesdeChange = (date: Date | undefined) => {
    if (date) {
      updatePaquete({
        ...paquete,
        validezDesde: formatStoredDate(date) ?? paquete.validezDesde,
      });
      toast("success", "Fecha de inicio actualizada");
    }
  };

  const handleValidezHastaChange = (date: Date | undefined) => {
    if (date) {
      updatePaquete({
        ...paquete,
        validezHasta: formatStoredDate(date) ?? paquete.validezHasta,
      });
      toast("success", "Fecha de fin actualizada");
    }
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
        description="Controla si el paquete es visible en el frontend publico y si aparece como destacado en la home."
      >
        <div className="flex flex-col gap-4">
          <Field orientation="horizontal">
            <Toggle
              checked={isPublicado}
              onCheckedChange={handlePublicadoToggle}
              disabled={!canEdit}
              label="Publicado"
            />
          </Field>
          <Field orientation="horizontal">
            <Toggle
              checked={paquete.destacado}
              onCheckedChange={handleDestacadoToggle}
              disabled={!canEdit}
              label="Destacado"
            />
          </Field>

          <FieldGroup columns={2}>
            <Field>
              <FieldLabel>Estado</FieldLabel>
              <Select
                value={paquete.estado}
                onValueChange={handleEstadoChange}
                options={ESTADO_OPTIONS}
                disabled={!canEdit}
              />
            </Field>
          </FieldGroup>
        </div>
      </FormSection>

      {/* ------------------------------------------------------------------ */}
      {/* Periodo de validez                                                 */}
      {/* ------------------------------------------------------------------ */}
      <FormSection
        title="Periodo de validez"
        description="El paquete se auto-desactiva al llegar a la fecha de validez hasta."
      >
        <FieldGroup columns={2}>
          <Field>
            <FieldLabel>Valido desde</FieldLabel>
            <DatePicker
              value={parseStoredDate(paquete.validezDesde)}
              onChange={handleValidezDesdeChange}
              disabled={!canEdit}
            />
          </Field>
          <Field>
            <FieldLabel>Valido hasta</FieldLabel>
            <DatePicker
              value={parseStoredDate(paquete.validezHasta)}
              onChange={handleValidezHastaChange}
              disabled={!canEdit}
            />
          </Field>
        </FieldGroup>
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
