"use client";

import React, { useEffect } from "react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/components/lib/cn";

/**
 * SelectCascade — cascading parent→child select pair.
 *
 * Extracts the pais→ciudad reset pattern that lives inline in
 * `alojamientos/[id]/page.tsx:92-97` and similar places. When the parent
 * changes, the child is cleared automatically.
 *
 *   <SelectCascade
 *     parentValue={paisId}
 *     onParentChange={setPaisId}
 *     parentOptions={paises.map(p => ({ value: p.id, label: p.nombre }))}
 *     parentLabel="Pais"
 *     childValue={ciudadId}
 *     onChildChange={setCiudadId}
 *     childOptions={(paisId) => ciudades.filter(c => c.paisId === paisId).map(c => ({ value: c.id, label: c.nombre }))}
 *     childLabel="Ciudad"
 *   />
 */

interface Option {
  value: string;
  label: string;
}

interface SelectCascadeProps {
  parentValue: string | undefined;
  onParentChange: (value: string) => void;
  parentOptions: Option[];
  parentLabel: string;
  parentPlaceholder?: string;

  childValue: string | undefined;
  onChildChange: (value: string) => void;
  /** Returns child options filtered by current parent. */
  childOptions: (parentValue: string | undefined) => Option[];
  childLabel: string;
  childPlaceholder?: string;

  disabled?: boolean;
  className?: string;
}

export function SelectCascade({
  parentValue,
  onParentChange,
  parentOptions,
  parentLabel,
  parentPlaceholder,
  childValue,
  onChildChange,
  childOptions,
  childLabel,
  childPlaceholder,
  disabled,
  className,
}: SelectCascadeProps) {
  const childList = childOptions(parentValue);

  // If the current child is no longer valid under the new parent, reset it
  useEffect(() => {
    if (childValue && !childList.find((o) => o.value === childValue)) {
      onChildChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue]);

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <Select
        label={parentLabel}
        value={parentValue}
        onValueChange={onParentChange}
        options={parentOptions}
        placeholder={parentPlaceholder ?? "Seleccionar..."}
        disabled={disabled}
      />
      <Select
        label={childLabel}
        value={childValue}
        onValueChange={onChildChange}
        options={childList}
        placeholder={
          !parentValue
            ? "Elegi un " + parentLabel.toLowerCase() + " primero"
            : childPlaceholder ?? "Seleccionar..."
        }
        disabled={disabled || !parentValue}
      />
    </div>
  );
}
