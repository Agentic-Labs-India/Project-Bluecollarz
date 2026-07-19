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
  /**
   * Reuse an existing mic stream (e.g. from screen recorder) instead of
   * opening a second getUserMedia. When provided, tracks are not stopped
   * on teardown — the owner remains responsible.
   */
  stream?: MediaStream;
  /** 0–1 RMS-ish threshold. */
  threshold?: number;
  silenceMs?: number;
  speechMs?: number;
}): Promise<VadController> {
  const threshold = opts.threshold ?? 0.045;
  const silenceMs = opts.silenceMs ?? 900;
  const speechMs = opts.speechMs ?? 280;
  const ownsStream = !opts.stream;

  const stream =
    opts.stream ??
    (await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }));

  // Record speech clips from audio tracks only (never pull video into VAD).
  const audioOnly = new MediaStream(stream.getAudioTracks());
  if (audioOnly.getAudioTracks().length === 0) {
    if (ownsStream) stream.getTracks().forEach((t) => t.stop());
    throw new Error("No microphone track available for voice detection.");
  }

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(audioOnly);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let stopped = false;
  let rafId = 0;
  let lastLevelEmit = 0;

  let segmentRecorder: MediaRecorder | null = null;
  let segmentChunks: Blob[] = [];

  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const startSegment = () => {
    segmentChunks = [];
    try {
      segmentRecorder = new MediaRecorder(audioOnly, { mimeType: mime });
    } catch {
      segmentRecorder = new MediaRecorder(audioOnly);
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

  const tick = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(tick);

    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);

    // ~12 updates/sec — enough for the meter, fewer React renders.
    if (opts.onLevel && now - lastLevelEmit >= 80) {
      lastLevelEmit = now;
      opts.onLevel(rms);
    }

    if (opts.isPaused()) {
      if (speaking) {
        speaking = false;
        endSegment();
      }
      return;
    }

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
  rafId = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      try {
        segmentRecorder?.stop();
      } catch {
        // ignore
      }
      if (ownsStream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      void audioCtx.close();
    },
  };
}
