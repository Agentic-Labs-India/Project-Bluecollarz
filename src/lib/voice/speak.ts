"use client";

import { sanitizeForTts, TTS_VOICE } from "@/lib/voice/style";

/** Speak text via Sarvam HTTP stream (/api/voice/tts). Waits until playback ends. */
export async function speakText(text: string) {
  const clean = sanitizeForTts(text).slice(0, 3500);
  if (!clean) return;

  const res = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: clean,
      language_code: TTS_VOICE.languageCode,
    }),
  });
  if (!res.ok || !res.body) return;

  const mime = res.headers.get("Content-Type") || "audio/mpeg";
  await playAudioStream(res.body, mime);
}

async function playAudioStream(
  body: ReadableStream<Uint8Array>,
  mime: string,
) {
  const canMse =
    typeof MediaSource !== "undefined" &&
    MediaSource.isTypeSupported("audio/mpeg");

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];

  if (!canMse) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) chunks.push(value);
    }
    if (!chunks.length) return;
    await playBlob(new Blob(chunks as BlobPart[], { type: mime }), mime);
    return;
  }

  const mediaSource = new MediaSource();
  const url = URL.createObjectURL(mediaSource);
  const audio = new Audio(url);
  let started = false;

  try {
    await new Promise<void>((resolve, reject) => {
      mediaSource.addEventListener("sourceopen", () => resolve(), {
        once: true,
      });
      mediaSource.addEventListener(
        "error",
        () => reject(new Error("MediaSource error")),
        { once: true },
      );
    });

    const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      chunks.push(value);
      await appendBuffer(sourceBuffer, value);
      if (!started) {
        started = true;
        void audio.play().catch(() => undefined);
      }
    }

    if (mediaSource.readyState === "open") {
      if (sourceBuffer.updating) {
        await new Promise<void>((resolve) => {
          sourceBuffer.addEventListener("updateend", () => resolve(), {
            once: true,
          });
        });
      }
      mediaSource.endOfStream();
    }

    if (started) {
      await waitForEnd(audio);
      return;
    }
  } catch {
    // Fall through to blob playback from buffered chunks.
  } finally {
    URL.revokeObjectURL(url);
  }

  if (!chunks.length) return;
  await playBlob(new Blob(chunks as BlobPart[], { type: mime }), mime);
}

async function playBlob(blob: Blob, mime: string) {
  const url = URL.createObjectURL(
    blob.type ? blob : new Blob([blob], { type: mime }),
  );
  const audio = new Audio(url);
  try {
    await audio.play();
    await waitForEnd(audio);
  } catch {
    // autoplay / decode failure — ignore
  } finally {
    URL.revokeObjectURL(url);
  }
}

function appendBuffer(sourceBuffer: SourceBuffer, chunk: Uint8Array) {
  return new Promise<void>((resolve, reject) => {
    const onUpdate = () => {
      sourceBuffer.removeEventListener("updateend", onUpdate);
      sourceBuffer.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      sourceBuffer.removeEventListener("updateend", onUpdate);
      sourceBuffer.removeEventListener("error", onError);
      reject(new Error("SourceBuffer error"));
    };
    sourceBuffer.addEventListener("updateend", onUpdate);
    sourceBuffer.addEventListener("error", onError);
    sourceBuffer.appendBuffer(chunk.slice().buffer);
  });
}

function waitForEnd(audio: HTMLAudioElement) {
  if (audio.ended) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      resolve();
    };
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
  });
}
