"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  /** All streams/tracks we own (screen, camera, mic, canvas). */
  ownedStreams: MediaStream[];
  rafId: number | null;
  canvas: HTMLCanvasElement | null;
  screenVideo: HTMLVideoElement | null;
  cameraVideo: HTMLVideoElement | null;
};

const PIP_WIDTH_RATIO = 0.22;
const PIP_MARGIN = 24;

function createHiddenVideo(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  void video.play().catch(() => undefined);
  return video;
}

/** Capture screen + camera (PiP corner) + mic into one recorded video. */
export function useScreenRecorder() {
  const stateRef = useRef<RecorderState>({
    recorder: null,
    chunks: [],
    ownedStreams: [],
    rafId: null,
    canvas: null,
    screenVideo: null,
    cameraVideo: null,
  });
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const cleanupVisual = useCallback(() => {
    const state = stateRef.current;
    if (state.rafId != null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    if (state.screenVideo) {
      state.screenVideo.srcObject = null;
      state.screenVideo = null;
    }
    if (state.cameraVideo) {
      state.cameraVideo.srcObject = null;
      state.cameraVideo = null;
    }
    state.canvas = null;
  }, []);

  const stopTracks = useCallback(() => {
    cleanupVisual();
    for (const stream of stateRef.current.ownedStreams) {
      stream.getTracks().forEach((t) => t.stop());
    }
    stateRef.current.ownedStreams = [];
    setCameraStream(null);
  }, [cleanupVisual]);

  const start = useCallback(async () => {
    setError("");
    try {
      // Camera is required so the candidate face is in the recording.
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

      const screenVideo = createHiddenVideo(display);
      const cameraVideo = createHiddenVideo(camera);

      // Wait until both videos have dimensions.
      await Promise.all(
        [screenVideo, cameraVideo].map(
          (v) =>
            new Promise<void>((resolve) => {
              if (v.readyState >= 2 && v.videoWidth > 0) {
                resolve();
                return;
              }
              v.onloadedmetadata = () => resolve();
            }),
        ),
      );

      const width = screenVideo.videoWidth || 1280;
      const height = screenVideo.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        camera.getTracks().forEach((t) => t.stop());
        display.getTracks().forEach((t) => t.stop());
        throw new Error("Could not start video compositor.");
      }

      const draw = () => {
        ctx.drawImage(screenVideo, 0, 0, width, height);

        const pipW = Math.round(width * PIP_WIDTH_RATIO);
        const pipH = Math.round(
          pipW *
            ((cameraVideo.videoHeight || 3) / (cameraVideo.videoWidth || 4)),
        );
        const x = width - pipW - PIP_MARGIN;
        const y = height - pipH - PIP_MARGIN;

        // Soft frame behind the camera bubble.
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(x - 4, y - 4, pipW + 8, pipH + 8);
        ctx.drawImage(cameraVideo, x, y, pipW, pipH);

        stateRef.current.rafId = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(15);
      const mixed = new MediaStream([
        ...canvasStream.getVideoTracks(),
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
        ownedStreams: [display, camera, canvasStream, mixed],
        rafId: stateRef.current.rafId,
        canvas,
        screenVideo,
        cameraVideo,
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
