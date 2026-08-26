/** Stop a MediaRecorder and assemble chunks without dropping the last data. */
export function stopMediaRecorder(
  recorder: MediaRecorder | null,
  chunks: Blob[],
  timeoutMs = 4000,
  fallbackType = "application/octet-stream",
): Promise<Blob | null> {
  const type = recorder?.mimeType || chunks[0]?.type || fallbackType;
  const assemble = () => (chunks.length ? new Blob(chunks, { type }) : null);

  if (!recorder || recorder.state === "inactive") {
    return Promise.resolve(assemble());
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(assemble());
    };
    timeoutId = window.setTimeout(finish, timeoutMs);
    recorder.onstop = finish;
    try {
      recorder.stop();
    } catch {
      finish();
    }
  });
}
