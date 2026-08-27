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

/** Valid stored locale, or null — never invent en-IN. */
export function parseTtsLanguage(
  code: string | null | undefined,
): TtsLanguageCode | null {
  if (!code || typeof code !== "string") return null;
  const normalized = code.trim();
  return isTtsLanguageCode(normalized) ? normalized : null;
}

export function resolveTtsLanguage(
  code: string | null | undefined,
  fallback: TtsLanguageCode = "en-IN",
): TtsLanguageCode {
  return parseTtsLanguage(code) ?? fallback;
}

export function languageLabel(code: string | null | undefined): string {
  if (!code) return "English";
  return LABELS[resolveTtsLanguage(code)] ?? code;
}

export const LANGUAGE_PICK_PROMPT = "Which language should we use?";

export type ResumePickCopy = {
  title: string;
  upload: string;
  uploading: string;
  skip: string;
};

/** Static resume-picker copy. Not model-generated. */
export const RESUME_PICK_COPY: Record<TtsLanguageCode, ResumePickCopy> = {
  "en-IN": {
    title: "Do you have a resume PDF to upload?",
    upload: "Upload",
    uploading: "Uploading…",
    skip: "I don't have it",
  },
  "hi-IN": {
    title: "क्या आपके पास अपलोड करने के लिए resume PDF है?",
    upload: "अपलोड करें",
    uploading: "अपलोड हो रहा है…",
    skip: "मेरे पास नहीं है",
  },
  "bn-IN": {
    title: "আপনার কাছে আপলোড করার জন্য resume PDF আছে কি?",
    upload: "আপলোড",
    uploading: "আপলোড হচ্ছে…",
    skip: "আমার কাছে নেই",
  },
  "gu-IN": {
    title: "તમારી પાસે અપલોડ કરવા માટે resume PDF છે?",
    upload: "અપલોડ",
    uploading: "અપલોડ થઈ રહ્યું છે…",
    skip: "મારી પાસે નથી",
  },
  "kn-IN": {
    title: "ನಿಮ್ಮ ಬಳಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು resume PDF ಇದೆಯೇ?",
    upload: "ಅಪ್‌ಲೋಡ್",
    uploading: "ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    skip: "ನನ್ನ ಬಳಿ ಇಲ್ಲ",
  },
  "ml-IN": {
    title: "നിങ്ങളുടെ കൈയിൽ അപ്‌ലോഡ് ചെയ്യാൻ resume PDF ഉണ്ടോ?",
    upload: "അപ്‌ലോഡ്",
    uploading: "അപ്‌ലോഡ് ചെയ്യുന്നു…",
    skip: "എന്റെ കൈയിൽ ഇല്ല",
  },
  "mr-IN": {
    title: "तुमच्याकडे अपलोड करण्यासाठी resume PDF आहे का?",
    upload: "अपलोड",
    uploading: "अपलोड होत आहे…",
    skip: "माझ्याकडे नाही",
  },
  "od-IN": {
    title: "ଆପଣଙ୍କ ପାଖରେ ଅପଲୋଡ୍ କରିବାକୁ resume PDF ଅଛି କି?",
    upload: "ଅପଲୋଡ୍",
    uploading: "ଅପଲୋଡ୍ ହେଉଛି…",
    skip: "ମୋ ପାଖରେ ନାହିଁ",
  },
  "pa-IN": {
    title: "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਅਪਲੋਡ ਕਰਨ ਲਈ resume PDF ਹੈ?",
    upload: "ਅਪਲੋਡ",
    uploading: "ਅਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    skip: "ਮੇਰੇ ਕੋਲ ਨਹੀਂ ਹੈ",
  },
  "ta-IN": {
    title: "உங்களிடம் அப்லோட் செய்ய resume PDF இருக்கா?",
    upload: "அப்லோட்",
    uploading: "அப்லோட் ஆகிறது…",
    skip: "என்னிடம் இல்லை",
  },
  "te-IN": {
    title: "మీ దగ్గర అప్‌లోడ్ చేయడానికి resume PDF ఉందా?",
    upload: "అప్‌లోడ్",
    uploading: "అప్‌లోడ్ అవుతోంది…",
    skip: "నా దగ్గర లేదు",
  },
};

export function resumePickCopy(
  code: string | null | undefined,
): ResumePickCopy {
  return RESUME_PICK_COPY[resolveTtsLanguage(code)];
}

export function resumeVoicePrompt(code: string | null | undefined): string {
  return resumePickCopy(code).title;
}

export function voiceLanguagePrompt(languageCode?: string | null): string {
  const selected = languageCode?.trim();
  const simplicity = `Vocabulary: use simple, well-known everyday words. Keep sentences short. Avoid rare or overly formal words.`;
  const kickoffRule = `- English setup messages (start interview, tool results) are instructions only. Do not switch to English because of them.`;

  if (selected) {
    const tts = resolveTtsLanguage(selected);
    const label = languageLabel(selected);

    if (tts === "en-IN") {
      return `Language (spoken aloud by TTS):
- Reply in clear, simple Indian English (${tts}). Stick to this for the whole session.
${kickoffRule}
${simplicity}`;
    }

    return `Language (spoken aloud by TTS):
- Speak casual conversational ${label} mixed with everyday English — how workers actually talk, not textbook ${label}.
- Keep work words in English: experience, skills, resume, location, education, job, company, role, etc.
- Stick to this mixed spoken style for the whole session (${tts}). The first greeting must already be in ${label}.
${kickoffRule}
${simplicity}`;
  }

  return `Language (spoken aloud by TTS):
- Reply in clear, simple English until a voice language is available.
${simplicity}`;
}

export const VOICE_TOOL_DATA_PROMPT = `Structured data / tool calls:
- When calling tools (e.g. updateCandidateProfile), save ALL field values in clear English.
- Spoken replies stay in the candidate's voice language; profile fields stay English for recruiters.`;
