"use client";

/**
 * Simple energy-based VAD on a mic stream.
 * When voice rises above threshold → onSpeechStart
 * After sustained silence → onSpeechEnd with the recorded audio blob
 *
 * Tuned for natural / slow speech: longer end-of-utterance silence,
 * brief dips between words don't reset onset, and recording starts on
 * the first loud frame so the opening words aren't chopped.
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
  /** Quiet time before we treat the answer as finished. */
  silenceMs?: number;
  /** Continuous-ish speech needed before the utterance is “confirmed”. */
  speechMs?: number;
}): Promise<VadController> {
  // Softer threshold so quiet / slow talkers still register.
  const threshold = opts.threshold ?? 0.028;
  // Slow speakers often pause 1–1.5s between phrases — don't cut them off.
  const silenceMs = opts.silenceMs ?? 1800;
  const speechMs = opts.speechMs ?? 180;
  /** Ignore single quiet frames during onset / between syllables. */
  const onsetHangoverMs = 280;
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
  /** Recorder running but utterance not confirmed yet (filters coughs/noise). */
  let tentative = false;
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let loudAccumMs = 0;
  let lastTickAt = 0;
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
  };

  const cancelSegment = () => {
    const rec = segmentRecorder;
    segmentRecorder = null;
    segmentChunks = [];
    if (!rec || rec.state === "inactive") return;
    rec.onstop = null;
    try {
      rec.stop();
    } catch {
      // ignore
    }
  };

  const endSegment = () => {
    const rec = segmentRecorder;
    segmentRecorder = null;
    if (!rec || rec.state === "inactive") return;
    try {
      if (rec.state === "recording") rec.requestData();
    } catch {
      // ignore
    }
    rec.onstop = () => {
      const blob = new Blob(segmentChunks, {
        type: rec.mimeType || "audio/webm",
      });
      segmentChunks = [];
      // Accept shorter clips — slow one-word answers are still valid.
      if (blob.size > 250) opts.onSpeechEnd(blob);
    };
    rec.stop();
  };

  const resetOnset = () => {
    tentative = false;
    speaking = false;
    speechStartedAt = 0;
    loudAccumMs = 0;
  };

  const tick = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(tick);

    const dt = lastTickAt ? Math.min(50, now - lastTickAt) : 16;
    lastTickAt = now;

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
      if (speaking || tentative) {
        cancelSegment();
        resetOnset();
      }
      return;
    }

    const loud = rms >= threshold;

    if (loud) {
      lastLoudAt = now;
      loudAccumMs += dt;

      // Start capturing on the first loud frame so opening words aren't lost.
      if (!tentative && !speaking) {
        tentative = true;
        speechStartedAt = now;
        loudAccumMs = dt;
        startSegment();
      }

      if (tentative && !speaking && loudAccumMs >= speechMs) {
        speaking = true;
        opts.onSpeechStart();
      }
    } else if (tentative && !speaking) {
      // Brief quiet during onset is OK; longer quiet = false start (noise).
      if (now - lastLoudAt >= onsetHangoverMs) {
        cancelSegment();
        resetOnset();
      }
    } else if (speaking && now - lastLoudAt >= silenceMs) {
      speaking = false;
      tentative = false;
      speechStartedAt = 0;
      loudAccumMs = 0;
      endSegment();
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
