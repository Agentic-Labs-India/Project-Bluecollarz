/**
 * Cache Components requires generateStaticParams to return at least one
 * param so Next can validate the route at build. When Mongo has no
 * published rows yet, use the sample — the page still 404s via notFound().
 */
export function staticParamsOrSample<T extends Record<string, string>>(
  items: T[],
  sample: T,
): T[] {
  return items.length > 0 ? items : [sample];
}

/** Not a slugifyBlogTitle() output (underscores are stripped). */
export const CACHE_COMPONENTS_BLOG_SAMPLE = { slug: "_build" } as const;

/** Nil ObjectId — isId() accepts it; no published job uses this id. */
export const CACHE_COMPONENTS_JOB_SAMPLE = {
  id: "000000000000000000000000",
} as const;
