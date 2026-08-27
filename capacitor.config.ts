/// <reference types="@capacitor/splash-screen" />
import type { CapacitorConfig } from "@capacitor/cli";

const DEFAULT_ORIGIN = process.env.CAPACITOR_SERVER_URL ||"https://www.blucollarz.com";

function nativeStartUrl(): string {
  try {
    const url = new URL(DEFAULT_ORIGIN);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return `${DEFAULT_ORIGIN}/auth`;
    }
    const path = url.pathname.replace(/\/$/, "");
    if (path) return `${url.origin}${path}`;
    return `${url.origin}/auth`;
  } catch {
    return `${DEFAULT_ORIGIN}/auth`;
  }
}

const startUrl = nativeStartUrl();
const parsed = new URL(startUrl);
const cleartext = parsed.protocol === "http:";

const config: CapacitorConfig = {
  appId: "com.blucollarz.app",
  appName: "Blucollarz",
  webDir: "native-www",
  appendUserAgent: "BlucollarzNative",
  server: {
    url: startUrl,
    hostname: parsed.hostname,
    androidScheme: cleartext ? "http" : "https",
    cleartext,
    allowNavigation: [
      parsed.hostname,
      "www.blucollarz.com",
      "blucollarz.com",
      "*.vercel.app",
      "vercel.com",
      "*.vercel.com",
      "*.blob.vercel-storage.com",
      "accounts.google.com",
      "*.google.com",
      "*.googleapis.com",
      "*.gstatic.com",
      "digilocker.meripehchaan.gov.in",
      "*.meripehchaan.gov.in",
      "*.digilocker.gov.in",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: "#ffffffff",
      androidScaleType: "CENTER",
      showSpinner: false,
    },
    SystemBars: {
      insetsHandling: "css",
      style: "LIGHT",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
