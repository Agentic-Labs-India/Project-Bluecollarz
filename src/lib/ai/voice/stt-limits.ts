/**
 * Sarvam Saaras REST `POST /speech-to-text` rejects clips over 30s
 * (`unprocessable_entity_error`). All onboarding / interview / help VAD
 * loops must stop before this so transcription succeeds.
 */
const STT_REST_MAX_SECONDS = 30;

/**
 * Mic listen cap (ms). Headroom under 30s covers MediaRecorder flush
 * and a little encoder delay.
 */
export const STT_LISTEN_CAP_MS = (STT_REST_MAX_SECONDS - 5) * 1000;

/**
 * Hard POST cap. 25s of speech in webm/opus is well under 1MB; 3MB
 * covers uncompressed wav with margin and rejects dump uploads.
 */
export const STT_MAX_AUDIO_BYTES = 3 * 1024 * 1024;
