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
