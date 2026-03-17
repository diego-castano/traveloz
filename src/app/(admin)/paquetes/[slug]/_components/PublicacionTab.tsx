"use client";

import { useMemo } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tag, type TagColor } from "@/components/ui/Tag";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  usePackageActions,
  usePaqueteServices,
} from "@/components/providers/PackageProvider";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
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
// Section divider
// ---------------------------------------------------------------------------

function SectionDivider() {
  return (
    <div
      className="my-6"
      style={{
        height: 1,
        background:
          "linear-gradient(90deg, transparent 0%, rgba(228,230,242,0.6) 20%, rgba(228,230,242,0.6) 80%, transparent 100%)",
      }}
    />
  );
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
      updatePaquete({ ...paquete, validezDesde: date.toISOString() });
      toast("success", "Fecha de inicio actualizada");
    }
  };

  const handleValidezHastaChange = (date: Date | undefined) => {
    if (date) {
      updatePaquete({ ...paquete, validezHasta: date.toISOString() });
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
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-neutral-800">
          Publicacion
        </h3>
      </CardHeader>

      <CardContent className="space-y-0">
        {/* ---------------------------------------------------------------
         * Section 1: Estado de Publicacion
         * --------------------------------------------------------------- */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">
            Estado de Publicacion
          </h4>

          {/* Toggles row */}
          <div className="flex items-center gap-8 mb-4">
            <Toggle
              checked={isPublicado}
              onCheckedChange={handlePublicadoToggle}
              disabled={!canEdit}
              label="Publicado"
            />
            <Toggle
              checked={paquete.destacado}
              onCheckedChange={handleDestacadoToggle}
              disabled={!canEdit}
              label="Destacado"
            />
          </div>

          {/* Estado selector */}
          <div className="max-w-xs">
            <Select
              value={paquete.estado}
              onValueChange={handleEstadoChange}
              options={ESTADO_OPTIONS}
              label="Estado"
              disabled={!canEdit}
            />
          </div>
        </div>

        <SectionDivider />

        {/* ---------------------------------------------------------------
         * Section 2: Periodo de Validez
         * --------------------------------------------------------------- */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">
            Periodo de Validez
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              value={new Date(paquete.validezDesde)}
              onChange={handleValidezDesdeChange}
              label="Valido Desde"
              disabled={!canEdit}
            />
            <DatePicker
              value={new Date(paquete.validezHasta)}
              onChange={handleValidezHastaChange}
              label="Valido Hasta"
              disabled={!canEdit}
            />
          </div>
        </div>

        <SectionDivider />

        {/* ---------------------------------------------------------------
         * Section 3: Etiquetas
         * --------------------------------------------------------------- */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-4">
            Etiquetas
          </h4>

          {/* Assigned etiquetas as removable Tag pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {assignedPaqueteEtiquetas.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">
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

          {/* Add etiqueta dropdown (only shown for editors) */}
          {canEdit && availableEtiquetas.length > 0 && (
            <div className="max-w-xs">
              <Select
                value=""
                onValueChange={handleAddEtiqueta}
                options={etiquetaSelectOptions}
                placeholder="Agregar Etiqueta"
                label="Agregar Etiqueta"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
