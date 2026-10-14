/** Shared placeholders. Fixed heights only, so nothing shifts when data lands. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-mist ${className}`} />;
}

export function ShopSkeleton() {
  return (
    <div className="shell pb-8 pt-10 md:pt-14">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-6 h-9 w-64" />
      <div className="mt-8 flex gap-3 border-y border-line py-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-11 md:gap-x-6 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i}>
            <Skeleton className="aspect-square w-full rounded-[22px]" />
            <Skeleton className="mt-4 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-3 h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div className="shell pb-6 pt-8 md:pt-12">
      <Skeleton className="h-3 w-56" />
      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
        <div>
          <Skeleton className="aspect-square w-full rounded-[26px]" />
          <div className="mt-3 flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-16" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-2/3" />
          <Skeleton className="mt-6 h-7 w-32" />
          <Skeleton className="mt-6 h-20 w-full" />
          <Skeleton className="mt-7 h-12 w-full rounded-full" />
          <Skeleton className="mt-3 h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="shell py-10 md:py-14">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-6 h-10 w-72" />
      <Skeleton className="mt-5 h-4 w-full max-w-md" />
      <Skeleton className="mt-10 h-64 w-full rounded-3xl" />
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-44" />
      <Skeleton className="mt-4 h-9 w-40" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-80 w-full rounded-2xl" />
    </div>
  );
}
