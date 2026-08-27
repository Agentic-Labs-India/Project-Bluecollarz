"use server";

import type { TtsLanguageCode } from "@/lib/ai/voice/languages";
import { guardToActionFail, requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  CandidateCommandError,
  getCandidateVoiceLanguage,
  saveCandidateVoiceLanguage,
  updateCandidateProfile,
} from "@/lib/candidate/commands";
import type { CandidateProfileData } from "@/lib/candidate/profile";
import { getCandidateGateStatus } from "@/lib/candidate/queries";
import { actionFail, actionOk, type ActionFailure, type ActionResult } from "@/lib/core/action";

function fromCommandError(error: unknown): ActionFailure {
  rethrowIfPrerenderAbort(error);
  if (error instanceof CandidateCommandError) {
    return actionFail(error.message, error.code);
  }
  console.error("candidate action:", error);
  return actionFail("Internal Server Error");
}

export async function getCandidateGateAction(): Promise<
  ActionResult<{ complete: boolean; kycVerified: boolean }>
> {
  const auth = await requireProfile("work");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const status = await getCandidateGateStatus(auth.user.id);
    return actionOk(status);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function saveCandidateProfileAction(
  input: unknown,
): Promise<ActionResult<{ profile: CandidateProfileData; complete: boolean }>> {
  const auth = await requireProfile("work");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const result = await updateCandidateProfile(auth.user.id, input);
    return actionOk(result);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function getCandidateVoiceLanguageAction(): Promise<
  ActionResult<{ language: TtsLanguageCode | null }>
> {
  const auth = await requireProfile("work");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const language = await getCandidateVoiceLanguage(auth.user.id);
    return actionOk({ language });
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function saveCandidateVoiceLanguageAction(
  languageCode: string,
): Promise<ActionResult<{ language: TtsLanguageCode }>> {
  const auth = await requireProfile("work");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const language = await saveCandidateVoiceLanguage(auth.user.id, languageCode);
    return actionOk({ language });
  } catch (error) {
    return fromCommandError(error);
  }
}
