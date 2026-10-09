import { EncabezadoSkeleton, Skeleton, barraHerramientas } from "@/components/collection/ui";
import { GrillaSkeleton } from "@/components/collection/biblioteca/Grilla";

export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoSkeleton />
      <div className={barraHerramientas}>
        <div className="flex min-w-0 flex-[1_1_440px] flex-wrap gap-2">
          {[72, 88, 96, 100, 128].map((w, i) => (
            <Skeleton key={i} className="h-9" style={{ width: w }} />
          ))}
        </div>
        <Skeleton className="ml-auto h-10 min-w-[200px] flex-[1_1_240px] sm:max-w-[320px]" />
      </div>
      <GrillaSkeleton />
    </div>
  );
}
