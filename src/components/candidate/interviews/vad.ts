"use client";

/**
 * Simple energy-based VAD on a mic stream.
 * When voice rises above threshold → onSpeechStart
 * After sustained silence → onSpeechEnd with the recorded audio blob
 */
export type VadController = {
  stop: () => void;
};

export async function startVadLoop(opts: {
  /** Pause listening while TTS / agent is speaking. */
  isPaused: () => boolean;
  onSpeechStart: () => void;
  onSpeechEnd: (blob: Blob) => void;
  onLevel?: (level: number) => void;
  /** 0–1 RMS-ish threshold. */
  threshold?: number;
  silenceMs?: number;
  speechMs?: number;
}): Promise<VadController> {
  const threshold = opts.threshold ?? 0.045;
  const silenceMs = opts.silenceMs ?? 900;
  const speechMs = opts.speechMs ?? 280;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let stopped = false;

  let segmentRecorder: MediaRecorder | null = null;
  let segmentChunks: Blob[] = [];

  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const startSegment = () => {
    segmentChunks = [];
    try {
      segmentRecorder = new MediaRecorder(stream, { mimeType: mime });
    } catch {
      segmentRecorder = new MediaRecorder(stream);
    }
    segmentRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) segmentChunks.push(e.data);
    };
    segmentRecorder.start(200);
    opts.onSpeechStart();
  };

  const endSegment = () => {
    const rec = segmentRecorder;
    segmentRecorder = null;
    if (!rec || rec.state === "inactive") return;
    rec.onstop = () => {
      const blob = new Blob(segmentChunks, {
        type: rec.mimeType || "audio/webm",
      });
      segmentChunks = [];
      if (blob.size > 400) opts.onSpeechEnd(blob);
    };
    rec.stop();
  };

  const tick = () => {
    if (stopped) return;
    requestAnimationFrame(tick);

    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    opts.onLevel?.(rms);

    if (opts.isPaused()) {
      if (speaking) {
        speaking = false;
        endSegment();
      }
      return;
    }

    const now = performance.now();
    const loud = rms >= threshold;

    if (loud) {
      lastLoudAt = now;
      if (!speaking) {
        if (!speechStartedAt) speechStartedAt = now;
        if (now - speechStartedAt >= speechMs) {
          speaking = true;
          startSegment();
        }
      }
    } else {
      speechStartedAt = 0;
      if (speaking && now - lastLoudAt >= silenceMs) {
        speaking = false;
        endSegment();
      }
    }
  };

  void audioCtx.resume();
  requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      try {
        segmentRecorder?.stop();
      } catch {
        // ignore
      }
      stream.getTracks().forEach((t) => t.stop());
      void audioCtx.close();
    },
  };
}
