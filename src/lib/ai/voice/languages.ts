/**
 * Shared Sarvam voice locales (TTS bulbul:v3 / STT saaras:v3).
 * Set once in onboarding → stored as profile.voiceLanguage → used in interviews.
 */

export const TTS_LANGUAGE_CODES = [
  "en-IN",
  "hi-IN",
  "bn-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "od-IN",
  "pa-IN",
  "ta-IN",
  "te-IN",
] as const;

export type TtsLanguageCode = (typeof TTS_LANGUAGE_CODES)[number];

export const VOICE_LANGUAGE_OPTIONS: {
  code: TtsLanguageCode;
  label: string;
  nativeLabel: string;
}[] = [
  { code: "en-IN", label: "English", nativeLabel: "English" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "bn-IN", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "gu-IN", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी" },
  { code: "od-IN", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" },
  { code: "pa-IN", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు" },
];

const TTS_SET = new Set<string>(TTS_LANGUAGE_CODES);
const LABELS = Object.fromEntries(
  VOICE_LANGUAGE_OPTIONS.map((o) => [o.code, o.label]),
);

export function isTtsLanguageCode(code: string): code is TtsLanguageCode {
  return TTS_SET.has(code);
}

export function resolveTtsLanguage(
  code: string | null | undefined,
  fallback: TtsLanguageCode = "en-IN",
): TtsLanguageCode {
  if (!code || typeof code !== "string") return fallback;
  const normalized = code.trim();
  return isTtsLanguageCode(normalized) ? normalized : fallback;
}

export function languageLabel(code: string | null | undefined): string {
  if (!code) return "English";
  return LABELS[resolveTtsLanguage(code)] ?? code;
}

/** Spoken resume-picker question. Keep "resume" / "PDF" in English. */
const RESUME_VOICE_PROMPT: Record<TtsLanguageCode, string> = {
  "en-IN": "Do you have a resume PDF to upload?",
  "hi-IN": "क्या आपके पास अपलोड करने के लिए resume PDF है?",
  "bn-IN": "আপনার কাছে আপলোড করার জন্য resume PDF আছে কি?",
  "gu-IN": "તમારી પાસે અપલોડ કરવા માટે resume PDF છે?",
  "kn-IN": "ನಿಮ್ಮ ಬಳಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು resume PDF ಇದೆಯೇ?",
  "ml-IN": "നിങ്ങളുടെ കൈയിൽ അപ്‌ലോഡ് ചെയ്യാൻ resume PDF ഉണ്ടോ?",
  "mr-IN": "तुमच्याकडे अपलोड करण्यासाठी resume PDF आहे का?",
  "od-IN": "ଆପଣଙ୍କ ପାଖରେ ଅପଲୋଡ୍ କରିବାକୁ resume PDF ଅଛି କି?",
  "pa-IN": "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਅਪਲੋਡ ਕਰਨ ਲਈ resume PDF ਹੈ?",
  "ta-IN": "உங்களிடம் அப்லோட் செய்ய resume PDF இருக்கா?",
  "te-IN": "మీ దగ్గర అప్‌లోడ్ చేయడానికి resume PDF ఉందా?",
};

export function resumeVoicePrompt(
  code: string | null | undefined,
): string {
  return RESUME_VOICE_PROMPT[resolveTtsLanguage(code)];
}

/** Load profile.voiceLanguage for work candidates (null if unset). */
export async function fetchProfileVoiceLanguage(): Promise<TtsLanguageCode | null> {
  try {
    const res = await fetch("/api/candidate/profile");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      profile?: { voiceLanguage?: string | null };
    };
    const raw = data.profile?.voiceLanguage?.trim();
    return raw ? resolveTtsLanguage(raw) : null;
  } catch {
    return null;
  }
}

export async function saveProfileVoiceLanguage(
  code: TtsLanguageCode,
): Promise<void> {
  const res = await fetch("/api/candidate/voice-language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language_code: code }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error || "Failed to save language");
  }
}

export function voiceLanguagePrompt(languageCode?: string | null): string {
  const selected = languageCode?.trim();
  const simplicity = `Vocabulary: use simple, well-known everyday words. Keep sentences short. Avoid rare or overly formal words.`;

  if (selected) {
    const tts = resolveTtsLanguage(selected);
    const label = languageLabel(selected);

    if (tts === "en-IN") {
      return `Language (spoken aloud by TTS):
- Reply in clear, simple Indian English (${tts}). Stick to this for the whole session.
${simplicity}`;
    }

    return `Language (spoken aloud by TTS):
- Speak casual conversational ${label} mixed with everyday English — how workers actually talk, not textbook ${label}.
- Keep work words in English: experience, skills, resume, location, education, job, company, role, etc.
- Stick to this mixed spoken style for the whole session (${tts}).
${simplicity}`;
  }

  return `Language (spoken aloud by TTS):
- Reply in clear, simple English until a voice language is available.
${simplicity}`;
}

export const VOICE_TOOL_DATA_PROMPT = `Structured data / tool calls:
- When calling tools (e.g. updateCandidateProfile), save ALL field values in clear English.
- Spoken replies stay in the candidate's voice language; profile fields stay English for recruiters.`;
