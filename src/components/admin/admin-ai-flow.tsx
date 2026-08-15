import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";

function Step({
  n,
  title,
  body,
  meta,
}: {
  n: string;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <li className="relative ps-10">
      <span
        className="bg-primary text-primary-foreground absolute start-0 top-3 flex size-6 items-center justify-center text-[11px] font-medium"
        aria-hidden
      >
        {n}
      </span>
      <div className="border-border bg-card border p-3">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{body}</p>
        {meta ? (
          <p className="text-muted-foreground mt-2 font-mono text-[11px] break-all">
            {meta}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Connector() {
  return (
    <li className="relative h-4 ps-10" aria-hidden>
      <span className="bg-border absolute start-[11px] top-0 h-full w-px" />
    </li>
  );
}

export function AdminAiFlow({ settings }: { settings: PlatformSettingsPublic }) {
  const model = settings.llm.model.trim() || "openai/gpt-4o";
  const stt = `${settings.voice.sttModel} · ${settings.voice.sttMode}`;
  const tts = `${settings.voice.ttsModel} · ${settings.voice.ttsSpeaker}`;

  return (
    <section className="border-border space-y-4 border p-4">
      <div>
        <h2 className="text-foreground text-sm font-medium">How the models run</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Live values from the fields above. Each path uses the matching system
          prompt and temperature.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wide uppercase">
            Voice agents — onboarding &amp; interviews
          </p>
          <ol className="relative">
            <Step
              n="1"
              title="Candidate speaks"
              body="Mic audio is captured in short clips (VAD)."
            />
            <Connector />
            <Step
              n="2"
              title="Speech to text"
              body="Sarvam transcribes the clip. Language comes from the candidate profile, or the default TTS language if unset."
              meta={stt}
            />
            <Connector />
            <Step
              n="3"
              title="Language model + system prompt"
              body="Onboarding uses the onboarding prompt and tools (profile, resume, places). Interviews use the communication or domain prompt, then finishInterview."
              meta={`${model} · temp ${settings.llm.temperatures.onboarding} / ${settings.llm.temperatures.interview}`}
            />
            <Connector />
            <Step
              n="4"
              title="Text to speech"
              body="The model’s reply is spoken back. Voice delivery copy keeps tone even. Temperature and pace come from Voice settings."
              meta={`${tts} · temp ${settings.voice.ttsTemperature} · pace ${settings.voice.ttsPace}`}
            />
            <Connector />
            <Step
              n="5"
              title="Interview scoring"
              body="When the stage completes, the transcript is scored with the matching analysis prompt. Results go to the hire applicant sheet only if evaluation consent is granted."
              meta={`${model} · temp ${settings.llm.temperatures.analysis}`}
            />
          </ol>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wide uppercase">
              Help desk
            </p>
            <ol>
              <Step
                n="1"
                title="Signed-in user asks"
                body="Text or voice. Help prompt is filled with audience and language."
                meta={`${model} · temp ${settings.llm.temperatures.help}`}
              />
              <Connector />
              <Step
                n="2"
                title="Optional support ticket"
                body="If they confirm a real problem, the model calls createSupportTicket. Simple how-to stays in chat."
              />
            </ol>
          </div>

          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-wide uppercase">
              Writers
            </p>
            <ol>
              <Step
                n="1"
                title="Resume PDF"
                body="Onboarding attaches the file. Extract prompt returns profile JSON."
                meta={`${model} · temp ${settings.llm.temperatures.resumeParse}`}
              />
              <Connector />
              <Step
                n="2"
                title="Profile summary"
                body="When interview fields are complete, facts are sent to the summary prompt."
                meta={`${model} · temp ${settings.llm.temperatures.profileSummary}`}
              />
              <Connector />
              <Step
                n="3"
                title="Job overview"
                body="Recruiter brief is sent to the overview prompt. Structured HTML is written into the role form."
                meta={`${model} · temp ${settings.llm.temperatures.jobOverview}`}
              />
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
