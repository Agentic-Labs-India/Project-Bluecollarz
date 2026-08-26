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

/**
 * WebKit and the Capacitor WebView hang on fetch() with a streamed request
 * body, which @vercel/blob uses whenever onUploadProgress is set.
 */
export function blobUploadNeedsSimplePut(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isNativeApp()) return true;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/i.test(ua)) return true;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
}
