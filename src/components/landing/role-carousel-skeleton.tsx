export function RoleCarouselSkeleton() {
  return (
    <section className="mt-24 sm:block">
      <div className="flex flex-row items-center justify-between">
        <div className="bg-muted h-6 w-28 animate-pulse rounded-md" />
        <div className="flex gap-2">
          <div className="bg-muted size-7 animate-pulse rounded-md" />
          <div className="bg-muted size-7 animate-pulse rounded-md" />
        </div>
      </div>
      <div className="mt-4 grid auto-cols-[290px] grid-flow-col grid-rows-2 gap-5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted h-[140px] w-[290px] animate-pulse rounded-lg"
          />
        ))}
      </div>
    </section>
  );
}
