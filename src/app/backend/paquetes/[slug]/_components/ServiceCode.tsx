import { cn } from "@/components/lib/cn";

/**
 * Chip que muestra el código/ID corto y secuencial de un servicio
 * (aereo, traslado, seguro, circuito). Se usa tanto en la lista de
 * servicios asignados como en el modal para agregarlos.
 */
export function ServiceCode({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-none text-neutral-500",
        className,
      )}
      title={`Código de servicio ${id}`}
    >
      #{id}
    </span>
  );
}
