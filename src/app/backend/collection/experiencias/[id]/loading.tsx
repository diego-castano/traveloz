import { Skeleton } from "@/components/collection/ui";

export default function Cargando() {
  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <div className="hidden w-[260px] shrink-0 flex-col gap-3 border-r border-col-line bg-col-surface p-5 lg:flex">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-48" />
        <Skeleton className="h-6 w-20" />
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 px-10 pt-10">
        <div className="mx-auto max-w-[700px]">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-5 h-12 w-72" />
          <Skeleton className="mt-3 h-4 w-96" />
          <Skeleton className="mt-12 h-14 w-full" />
          <Skeleton className="mt-8 h-20 w-full" />
        </div>
      </div>
      <div className="hidden w-[42%] shrink-0 border-l border-col-line min-[1440px]:block">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    </div>
  );
}
