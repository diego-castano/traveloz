"use client";

import React, { useEffect } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { CreatableSelect } from "@/components/ui/CreatableSelect";
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
  /**
   * Cuando se pasa, el hijo permite CREAR una opción nueva "in situ" (ej. una
   * ciudad al dar de alta un hotel). Recibe lo tipeado; debe persistir la nueva
   * opción y, si devuelve su value, se selecciona sola. Requiere parent elegido.
   */
  onChildCreate?: (label: string) => void | string | Promise<void | string>;

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
  onChildCreate,
  disabled,
  className,
}: SelectCascadeProps) {
  const childList = childOptions(parentValue);

  // Reset the child only when the USER actually changes the parent — never on
  // the initial mount, and never just because the options are still loading.
  //
  // En edición, el valor guardado (p. ej. ciudad = "Recife") se siembra desde el
  // registro, pero el catálogo de opciones (usePaises) carga async: en el primer
  // render childList viene vacío. Antes el efecto lo interpretaba como "valor
  // inválido" y lo borraba, dejando "Seleccionar..." aunque el dato existía.
  //
  // Comparamos contra el parent anterior (no un flag de "primer render") para
  // ser inmunes al doble-invocado de efectos de React StrictMode en dev. Y sólo
  // reseteamos si ya hay opciones cargadas (childList.length > 0) para no borrar
  // un valor válido mientras el catálogo todavía carga.
  const prevParentRef = React.useRef(parentValue);
  useEffect(() => {
    const parentChanged = prevParentRef.current !== parentValue;
    prevParentRef.current = parentValue;
    if (
      parentChanged &&
      childValue &&
      childList.length > 0 &&
      !childList.find((o) => o.value === childValue)
    ) {
      onChildChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue]);

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <SearchableSelect
        label={parentLabel}
        value={parentValue}
        onValueChange={onParentChange}
        options={parentOptions}
        placeholder={parentPlaceholder ?? "Seleccionar..."}
        searchPlaceholder={`Buscar ${parentLabel.toLowerCase()}...`}
        disabled={disabled}
      />
      {onChildCreate ? (
        <CreatableSelect
          label={childLabel}
          value={childValue}
          onValueChange={onChildChange}
          options={childList}
          onCreate={onChildCreate}
          placeholder={
            !parentValue
              ? "Elegi un " + parentLabel.toLowerCase() + " primero"
              : childPlaceholder ?? "Seleccionar o crear..."
          }
          searchPlaceholder={`Buscar o crear ${childLabel.toLowerCase()}...`}
          createLabel={(q) => `Crear ${childLabel.toLowerCase()} «${q}»`}
          disabled={disabled || !parentValue}
        />
      ) : (
        <SearchableSelect
          label={childLabel}
          value={childValue}
          onValueChange={onChildChange}
          options={childList}
          placeholder={
            !parentValue
              ? "Elegi un " + parentLabel.toLowerCase() + " primero"
              : childPlaceholder ?? "Seleccionar..."
          }
          searchPlaceholder={`Buscar ${childLabel.toLowerCase()}...`}
          disabled={disabled || !parentValue}
        />
      )}
    </div>
  );
}
