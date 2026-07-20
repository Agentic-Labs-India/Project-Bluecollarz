"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  /** Source streams we own (stop these on teardown — not the derived mix). */
  ownedStreams: MediaStream[];
};

type ScreenRecorderStartResult = {
  camera: MediaStream;
  /** Mic-only stream (same tracks as camera audio) for VAD. */
  mic: MediaStream;
};

/**
 * Capture entire screen + mic. Camera is a UI preview in the interview
 * sidebar (picked up by the screen share) — no burned-in PiP overlay.
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
    stateRef.current.recorder = null;
    stateRef.current.chunks = [];
    setCameraStream(null);
    setRecording(false);
  }, []);

  const start = useCallback(async (): Promise<ScreenRecorderStartResult> => {
    setError("");
    try {
      // One camera+mic grant: preview video in UI, mic for recording + VAD.
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
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

      // Record screen video + candidate mic (+ optional system audio from share).
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
        mime ? { mimeType: mime, videoBitsPerSecond: 1_500_000 } : {
          videoBitsPerSecond: 1_500_000,
        },
      );

      stateRef.current = {
        recorder,
        chunks: [],
        ownedStreams: [display, camera],
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) stateRef.current.chunks.push(e.data);
      };
      recorder.start(2000);
      setCameraStream(camera);
      setRecording(true);

      screenTrack?.addEventListener("ended", () => {
        // User stopped sharing from the browser chrome.
        try {
          if (stateRef.current.recorder?.state === "recording") {
            stateRef.current.recorder.stop();
          }
        } catch {
          // ignore
        }
        stopTracks();
      });

      const mic = new MediaStream(camera.getAudioTracks());
      return { camera, mic };
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
        const type = "video/webm";
        resolve(chunks.length ? new Blob(chunks, { type }) : null);
        stopTracks();
      };
      try {
        recorder.stop();
      } catch {
        stopTracks();
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
