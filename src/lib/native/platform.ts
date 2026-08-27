/** Matches `appendUserAgent` in capacitor.config.ts. */
export const NATIVE_USER_AGENT_TOKEN = "BlucollarzNative";

/** True for the Capacitor Android/iOS shell, not mobile Safari/Chrome. */
export function isNativeUserAgent(
  userAgent: string | null | undefined,
): boolean {
  return Boolean(userAgent?.includes(NATIVE_USER_AGENT_TOKEN));
}

/** Client-only. Server code should use `isNativeUserAgent` on the request. */
export function isNativeApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return isNativeUserAgent(navigator.userAgent);
}
