import { mock } from "bun:test";

/**
 * `server-only` throws on import unless the resolver applies the `react-server`
 * condition that Next.js sets. Bun does not, and bunfig has no knob for it, so
 * server modules would fail at import time instead of at their assertions.
 * Stubbing the module keeps the marker meaningful in the app build while
 * letting tests reach the code it guards.
 */
mock.module("server-only", () => ({}));
