import { Skeleton } from "@/components/collection/ui";
import { GrillaSkeleton } from "@/components/collection/biblioteca/Grilla";

export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex gap-2">
          {[64, 76, 84, 88, 120].map((w, i) => (
            <Skeleton key={i} className="h-9" style={{ width: w }} />
          ))}
        </div>
        <div className="flex items-center gap-4 lg:ml-auto">
          <Skeleton className="h-10 flex-1 lg:w-72 lg:flex-none" />
          <Skeleton className="h-12 w-28" />
        </div>
      </div>
      <GrillaSkeleton />
    </div>
  );
}
