import { placeholderKeys } from "@/lib/utils";

export function RoleCarouselSkeleton() {
  return (
    <section className="mt-16 sm:block">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="bg-muted h-3 w-20 animate-pulse" />
          <div className="bg-muted h-8 w-48 animate-pulse sm:h-9" />
          <div className="bg-muted h-4 w-72 max-w-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="bg-muted size-9 animate-pulse" />
          <div className="bg-muted size-9 animate-pulse" />
        </div>
      </div>
      <div className="mt-6 grid auto-cols-[300px] grid-flow-col grid-rows-2 gap-3 overflow-hidden sm:mt-8 sm:auto-cols-[320px]">
        {placeholderKeys(6).map((key) => (
          <div
            key={key}
            className="border-border bg-card h-[128px] w-[300px] overflow-hidden border sm:w-[320px]"
          >
            <div className="bg-primary/80 h-6 animate-pulse" />
            <div className="space-y-2 p-2.5">
              <div className="bg-muted h-3.5 w-2/3 animate-pulse" />
              <div className="bg-muted h-3 w-1/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
