"use client";

import { MicIcon } from "lucide-react";
import {
  VoiceSessionDock,
  type VoiceSessionMode,
} from "@/components/candidate/voice-orb";
import { useAfterPlatformTerms } from "@/components/compliance/platform-terms-gate";
import { Button } from "@/components/ui/button";

export type OnboardingVoiceMode = VoiceSessionMode;

export function OnboardingVoiceDock({
  mode,
  status,
  micReady,
  micError,
  onEnableMic,
}: {
  mode: OnboardingVoiceMode;
  status: string;
  micReady: boolean;
  micError?: string;
  onEnableMic: () => void;
}) {
  const live = useAfterPlatformTerms(500);

  return (
    <VoiceSessionDock error={micError} live={live} mode={mode} status={status}>
      {!micReady ? (
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full max-w-xs"
          onClick={onEnableMic}
        >
          <MicIcon className="size-4" />
          Enable microphone &amp; start
        </Button>
      ) : null}
    </VoiceSessionDock>
  );
}
