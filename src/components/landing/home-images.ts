/** Decorative marketing stills under `public/images/landing` — not user photos. */
export const HOME_IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/images/landing/${i + 1}.avif`,
);
