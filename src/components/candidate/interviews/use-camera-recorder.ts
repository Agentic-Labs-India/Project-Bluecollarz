"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureNativeMediaPermissions,
  mediaPermissionError,
  pickMediaRecorderMime,
} from "@/lib/native/media-permissions";

type RecorderState = {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  ownedStreams: MediaStream[];
};

type CameraRecorderStartResult = {
  camera: MediaStream;
  mic: MediaStream;
};

/** Record the candidate camera + mic. No screen share. */
export function useCameraRecorder() {
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
      for (const track of stream.getTracks()) track.stop();
    }
    stateRef.current.ownedStreams = [];
    stateRef.current.recorder = null;
    stateRef.current.chunks = [];
    setCameraStream(null);
    setRecording(false);
  }, []);

  const start = useCallback(async (): Promise<CameraRecorderStartResult> => {
    setError("");
    try {
      await ensureNativeMediaPermissions("camera-and-microphone");
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mixed = new MediaStream([
        ...camera.getVideoTracks(),
        ...camera.getAudioTracks(),
      ]);

      const mime = pickMediaRecorderMime("video");

      const recorder = new MediaRecorder(
        mixed,
        mime
          ? { mimeType: mime, videoBitsPerSecond: 1_500_000 }
          : {
              videoBitsPerSecond: 1_500_000,
            },
      );

      stateRef.current = {
        recorder,
        chunks: [],
        ownedStreams: [camera],
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) stateRef.current.chunks.push(e.data);
      };
      recorder.start(2000);
      setCameraStream(camera);
      setRecording(true);

      camera.getVideoTracks()[0]?.addEventListener("ended", () => {
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
      setError(mediaPermissionError(e, "camera"));
      throw e;
    }
  }, [stopTracks]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const { recorder } = stateRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      return null;
    }

    try {
      if (recorder.state === "recording") recorder.requestData();
    } catch {
      // ignore
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const chunks = stateRef.current.chunks;
        const type = recorder.mimeType || "video/webm";
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
