/** Shared landing imagery under `public/images/landing`. */
export const HOME_IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/images/landing/${i + 1}.avif`,
);
