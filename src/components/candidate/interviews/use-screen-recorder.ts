"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  ownedStreams: MediaStream[];
};

/**
 * Capture entire screen + mic. Camera stays as a UI preview in the interview
 * sidebar (picked up by the screen share) — no second burned-in PiP overlay.
 */
export function useScreenRecorder() {
  const stateRef = useRef<RecorderState>({
    recorder: null,
    chunks: [],
    ownedStreams: [],
  });
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const stopTracks = useCallback(() => {
    for (const stream of stateRef.current.ownedStreams) {
      stream.getTracks().forEach((t) => t.stop());
    }
    stateRef.current.ownedStreams = [];
    setCameraStream(null);
  }, []);

  const start = useCallback(async () => {
    setError("");
    try {
      // Camera for the live sidebar preview (also visible in the screen recording).
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer / require the full monitor — window or browser-tab share is rejected.
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 15,
          displaySurface: "monitor",
        } as MediaTrackConstraints,
        audio: true,
        // Chromium hints: keep the picker on entire-screen surfaces.
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "exclude",
        monitorTypeSurfaces: "include",
      } as DisplayMediaStreamOptions);

      const screenTrack = display.getVideoTracks()[0];
      const surface = screenTrack?.getSettings()?.displaySurface;
      if (surface && surface !== "monitor") {
        display.getTracks().forEach((t) => t.stop());
        camera.getTracks().forEach((t) => t.stop());
        throw new Error(
          "Please share your entire screen (not a window or browser tab).",
        );
      }

      const mixed = new MediaStream([
        ...display.getVideoTracks(),
        ...camera.getAudioTracks(),
        ...display.getAudioTracks(),
      ]);

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";

      const recorder = new MediaRecorder(
        mixed,
        mime ? { mimeType: mime } : undefined,
      );

      stateRef.current = {
        recorder,
        chunks: [],
        ownedStreams: [display, camera, mixed],
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) stateRef.current.chunks.push(e.data);
      };
      recorder.start(2000);
      setCameraStream(camera);
      setRecording(true);

      display.getVideoTracks()[0]?.addEventListener("ended", () => {
        setRecording(false);
      });
    } catch (e) {
      stopTracks();
      setError(
        e instanceof Error
          ? e.message
          : "Camera, microphone, and screen share are required.",
      );
      throw e;
    }
  }, [stopTracks]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const { recorder } = stateRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      setRecording(false);
      return null;
    }

    // Flush the current timeslice before stopping so we don't lose the tail.
    try {
      if (recorder.state === "recording") recorder.requestData();
    } catch {
      // ignore
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const chunks = stateRef.current.chunks;
        // Always use a clean container MIME — codecs params break server checks.
        const type = "video/webm";
        resolve(chunks.length ? new Blob(chunks, { type }) : null);
        stopTracks();
        setRecording(false);
      };
      try {
        recorder.stop();
      } catch {
        stopTracks();
        setRecording(false);
        resolve(null);
      }
    });
    return blob;
  }, [stopTracks]);

  useEffect(() => {
    return () => {
      try {
        stateRef.current.recorder?.stop();
      } catch {
        // ignore
      }
      stopTracks();
    };
  }, [stopTracks]);

  return { start, stop, recording, error, cameraStream };
}
