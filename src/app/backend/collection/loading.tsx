import { Skeleton } from "@/components/collection/ui";

// Esqueleto del inicio: saludo, cuatro números y la tira de medios.
export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-14 w-[min(480px,80%)]" />
      <Skeleton className="mt-4 h-4 w-48" />
      <div className="mt-12 grid grid-cols-2 gap-px lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="px-5 py-7 md:px-7">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="mt-4 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-16 flex max-h-[412px] flex-wrap gap-3 overflow-hidden">
        {[300, 160, 260, 200, 300, 160].map((w, i) => (
          <Skeleton key={i} className="h-[200px] min-w-0" style={{ flexGrow: w, flexBasis: w }} />
        ))}
      </div>
    </div>
  );
}
