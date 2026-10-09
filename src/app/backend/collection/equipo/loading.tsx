import { Skeleton } from "@/components/collection/ui";

export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1080px]">
      <Skeleton className="h-11 w-[min(420px,80%)]" />
      <Skeleton className="mt-3 mb-10 h-4 w-[min(520px,90%)]" />
      <div className="divide-y divide-col-line border-y border-col-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-5 py-4">
            <Skeleton className="h-11 w-11" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
