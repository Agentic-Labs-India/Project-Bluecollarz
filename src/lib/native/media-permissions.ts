import { Capacitor, registerPlugin } from "@capacitor/core";

type MediaPermissionState = "granted" | "denied" | "prompt" | "limited";

type NativeMediaPermissionsPlugin = {
  check(): Promise<{
    camera: MediaPermissionState;
    microphone: MediaPermissionState;
  }>;
  request(options: { camera?: boolean; microphone?: boolean }): Promise<{
    camera: MediaPermissionState;
    microphone: MediaPermissionState;
  }>;
};

const NativeMediaPermissions = registerPlugin<NativeMediaPermissionsPlugin>(
  "NativeMediaPermissions",
);

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function deniedMessage(kind: "camera" | "microphone"): string {
  if (kind === "camera") {
    return isNativeApp()
      ? "Camera permission is required. Enable Camera for Blucollarz in Settings."
      : "Camera access is required.";
  }
  return isNativeApp()
    ? "Microphone permission is required. Enable Microphone for Blucollarz in Settings."
    : "Microphone access is required.";
}

function isAllowed(state: MediaPermissionState | undefined): boolean {
  return state === "granted" || state === "limited";
}

/**
 * Ask OS camera/mic only when a flow actually needs them (interview, voice
 * onboarding, Help). Hire and admin never hit this on app launch.
 */
export async function ensureNativeMediaPermissions(
  kind: "camera" | "microphone" | "camera-and-microphone",
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (!Capacitor.isPluginAvailable("NativeMediaPermissions")) {
    throw new Error(
      "Camera and microphone are not available in this app build. Update the app and try again.",
    );
  }

  const camera = kind !== "microphone";
  const microphone = kind !== "camera";
  const next = await NativeMediaPermissions.request({ camera, microphone });

  if (camera && !isAllowed(next.camera)) {
    throw new Error(deniedMessage("camera"));
  }
  if (microphone && !isAllowed(next.microphone)) {
    throw new Error(deniedMessage("microphone"));
  }
}

export function mediaPermissionError(
  error: unknown,
  kind: "camera" | "microphone",
): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return deniedMessage(kind);
}

/** Prefer mp4 on iOS WebView; webm on Chromium. */
export function pickMediaRecorderMime(kind: "audio" | "video"): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates =
    kind === "video"
      ? ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
      : ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function blobUploadMeta(blob: Blob): {
  ext: string;
  contentType: string;
} {
  const contentType = (blob.type || "video/webm").split(";")[0].trim();
  const ext = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("quicktime")
      ? "mov"
      : contentType.includes("mpeg")
        ? "mp3"
        : contentType.includes("wav")
          ? "wav"
          : contentType.startsWith("audio/")
            ? "webm"
            : "webm";
  return { ext, contentType };
}
