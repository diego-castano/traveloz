import { EncabezadoSkeleton, Skeleton, barraHerramientas } from "@/components/collection/ui";

export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoSkeleton />
      <div className={barraHerramientas}>
        <div className="flex min-w-0 flex-[1_1_440px] flex-wrap gap-2">
          {[96, 140, 140, 132, 116, 128].map((w, i) => (
            <Skeleton key={i} className="h-9" style={{ width: w }} />
          ))}
        </div>
        <Skeleton className="ml-auto h-10 min-w-[200px] flex-[1_1_240px] sm:max-w-[320px]" />
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-4 h-7 w-4/5" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
