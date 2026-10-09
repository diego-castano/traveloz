// Marca de Traveloz Collection armada con tipografías: "Traveloz" en Clarika Geometric Bold
// con el globito de diálogo arriba del final, y "collection" en Cormorant
// itálica dorada con un subrayado fino. Es una aproximación: cuando llegue el
// archivo del diseñador se reemplaza este componente por el SVG original.

import { cn } from "@/components/lib/cn";

function Globito({ className }: { className?: string }) {
  return (
    // Gota curva como la de public/collection/assets/traveloz-logo-transparente.png.
    <svg viewBox="0 0 24 22" aria-hidden className={className} fill="currentColor">
      <path d="M4.6 1.6C8.6-.9 21.6.4 23.2 5.4c.8 2.6-2.4 3.4-5.5 5.6-2.9 2.1-.6 4.7.6 6.4.5.7-1.7 1-4.7-.9C8.6 13.8 2.6 9.6 2.4 5.6c-.1-1.6.8-3 2.2-4Z" />
    </svg>
  );
}

export function MarcaCollection({
  tono = "oscuro",
  compacta,
  className,
}: {
  /** "oscuro": sobre el azul noche (letras blancas). "claro": sobre fondo claro. */
  tono?: "oscuro" | "claro";
  /** Monograma para el riel plegado. */
  compacta?: boolean;
  className?: string;
}) {
  const tinta = tono === "oscuro" ? "text-white" : "text-col-noche";
  if (compacta) {
    return (
      <span className={cn("relative inline-flex flex-col items-center", tinta, className)}>
        <span className="relative font-col-text text-col-2xl font-bold leading-none tracking-[-0.02em]">
          T
          <Globito className="absolute -right-2.5 -top-2 h-[10px] w-[11px]" />
        </span>
        <span aria-hidden className="mt-1.5 h-px w-5 bg-col-gold" />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-col items-end", tinta, className)}>
      <span className="relative font-col-text text-col-2xl font-bold leading-none tracking-[-0.025em]">
        Traveloz
        <Globito className="absolute -right-1.5 -top-3 h-[12px] w-[13px]" />
      </span>
      <span className="-mt-0.5 border-b border-col-gold pb-px font-col-display text-col-xl font-normal italic leading-none text-col-gold">
        collection
      </span>
    </span>
  );
}
