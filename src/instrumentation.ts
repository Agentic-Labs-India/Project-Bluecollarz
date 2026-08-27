/**
 * Runs once per server instance before the first request is served
 * (Next.js `register` hook). Warms the MongoDB pool and builds indexes up
 * front so the first request under load doesn't pay connection + index-build
 * latency. `ensureIndexes` is memoized, so the app's existing lazy calls
 * become no-ops after this completes.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  // mongodb is Node-only; skip the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ default: client }, { ensureIndexes }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/db/indexes"),
  ]);

  try {
    await client.connect();
    await ensureIndexes();
  } catch (error) {
    // Never block server startup on a transient DB hiccup; lazy callers retry.
    console.warn("instrumentation.register:", error);
  }
}
