import { Skeleton } from "@/components/collection/ui";

export default function Cargando() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex gap-2">
          {[76, 112, 116, 112, 96, 112].map((w, i) => (
            <Skeleton key={i} className="h-9" style={{ width: w }} />
          ))}
        </div>
        <div className="flex items-center gap-4 xl:ml-auto">
          <Skeleton className="h-10 flex-1 xl:w-72 xl:flex-none" />
          <Skeleton className="h-12 w-52" />
        </div>
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
