"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";

type FlowId =
  | "c-signin"
  | "c-onboard"
  | "c-explore"
  | "c-resume"
  | "c-comm"
  | "c-domain"
  | "c-apply"
  | "c-help"
  | "c-ticket"
  | "r-request"
  | "r-account"
  | "r-write"
  | "r-submit"
  | "r-live"
  | "r-deny"
  | "r-apps"
  | "r-select"
  | "r-reject"
  | "r-help"
  | "r-ticket"
  | "a-inq"
  | "a-provision"
  | "a-jobs"
  | "a-publish"
  | "a-sup";

type Edge = {
  from: FlowId;
  to: FlowId;
  dashed?: boolean;
  label?: string;
};

const ACROSS: Edge[] = [
  { from: "r-request", to: "a-inq", dashed: true, label: "inquiry" },
  { from: "a-provision", to: "r-account", dashed: true, label: "provision" },
  { from: "r-submit", to: "a-jobs", dashed: true, label: "queue" },
  { from: "a-publish", to: "r-live", label: "publish" },
  { from: "c-apply", to: "r-apps", label: "apply" },
  { from: "c-ticket", to: "a-sup", dashed: true, label: "ticket" },
  { from: "r-ticket", to: "a-sup", dashed: true },
];

function point(
  el: HTMLElement,
  root: HTMLElement,
  side: "bottom" | "top" | "left" | "right",
) {
  const a = el.getBoundingClientRect();
  const c = root.getBoundingClientRect();
  const x = a.left - c.left + root.scrollLeft;
  const y = a.top - c.top + root.scrollTop;
  switch (side) {
    case "bottom":
      return { x: x + a.width / 2, y: y + a.height };
    case "top":
      return { x: x + a.width / 2, y };
    case "left":
      return { x, y: y + a.height / 2 };
    case "right":
      return { x: x + a.width, y: y + a.height / 2 };
  }
}

function acrossPath(from: HTMLElement, to: HTMLElement, root: HTMLElement) {
  const fromBox = from.getBoundingClientRect();
  const toBox = to.getBoundingClientRect();
  const goingRight = toBox.left >= fromBox.right - 8;
  const a = point(from, root, goingRight ? "right" : "left");
  const b = point(to, root, goingRight ? "left" : "right");
  const gx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} L ${gx} ${a.y} L ${gx} ${b.y} L ${b.x} ${b.y}`;
}

function ArrowDown({ label, dashed }: { label?: string; dashed?: boolean }) {
  return (
    <div className="flex flex-col items-center py-0.5" aria-hidden>
      <span
        className={
          dashed
            ? "border-primary h-3 w-0 border-l border-dashed"
            : "bg-primary h-3 w-px"
        }
      />
      {label ? (
        <span className="text-primary py-px text-[8px] font-medium leading-none">
          {label}
        </span>
      ) : null}
      <span className="border-primary h-0 w-0 border-x-3 border-t-4 border-x-transparent" />
    </div>
  );
}

function Fork({
  left,
  right,
  leftLabel,
  rightLabel,
  leftDashed,
  rightDashed,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  leftDashed?: boolean;
  rightDashed?: boolean;
}) {
  return (
    <div className="flex w-full flex-col">
      <span className="bg-primary mx-auto h-2 w-px" aria-hidden />
      <div className="relative grid grid-cols-2 gap-1.5">
        <span
          aria-hidden
          className="border-primary pointer-events-none absolute top-0 right-1/4 left-1/4 border-t"
        />
        <div className="flex min-w-0 flex-col items-center">
          <ArrowDown label={leftLabel} dashed={leftDashed} />
          <div className="w-full">{left}</div>
        </div>
        <div className="flex min-w-0 flex-col items-center">
          <ArrowDown label={rightLabel} dashed={rightDashed} />
          <div className="w-full">{right}</div>
        </div>
      </div>
    </div>
  );
}

function Merge({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="grid w-full grid-cols-2 gap-1.5" aria-hidden>
        <span className="bg-primary mx-auto h-2.5 w-px" />
        <span className="bg-primary mx-auto h-2.5 w-px" />
      </div>
      <span className="border-primary w-1/2 border-t" aria-hidden />
      <span className="bg-primary h-2 w-px" aria-hidden />
      <span className="border-primary h-0 w-0 border-x-3 border-t-4 border-x-transparent" />
      <div className="w-full">{children}</div>
    </div>
  );
}

function Box({
  id,
  title,
  detail,
  meta,
  ai,
  aside,
}: {
  id?: FlowId;
  title: string;
  detail?: string;
  meta?: string;
  ai?: boolean;
  aside?: boolean;
}) {
  const sub = [detail, meta].filter(Boolean).join(" · ");
  return (
    <div
      data-flow={id}
      className={
        ai
          ? "border-primary bg-card relative z-10 flex h-10 w-full min-w-0 flex-col justify-center border px-1.5"
          : aside
            ? "border-border bg-muted/40 relative z-10 flex h-10 w-full min-w-0 flex-col justify-center border border-dashed px-1.5"
            : "border-border bg-card relative z-10 flex h-10 w-full min-w-0 flex-col justify-center border px-1.5"
      }
    >
      <p className="text-foreground truncate text-[10px] leading-4 font-medium">
        {ai ? <span className="text-primary mr-1">AI</span> : null}
        {title}
      </p>
      {sub ? (
        <p className="text-muted-foreground truncate text-[10px] leading-4">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Lane({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border min-w-0 border-r px-2 py-2 last:border-r-0">
      <header className="border-border mb-2 border-b pb-1.5">
        <p className="text-foreground text-[10px] font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 truncate text-[10px] leading-tight">
          {note}
        </p>
      </header>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function AdminAiFlow({
  settings,
}: {
  settings: PlatformSettingsPublic;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState<
    { key: string; d: string; dashed?: boolean; label?: string }[]
  >([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const model = settings.llm.model.trim() || "openai/gpt-4o";
  const stt = `${settings.voice.sttModel} · ${settings.voice.sttMode}`;
  const tts = `${settings.voice.ttsModel} · ${settings.voice.ttsSpeaker}`;
  const t = settings.llm.temperatures;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const byId = new Map<string, HTMLElement>();
      for (const node of root.querySelectorAll<HTMLElement>("[data-flow]")) {
        const id = node.dataset.flow;
        if (id) byId.set(id, node);
      }
      const next: {
        key: string;
        d: string;
        dashed?: boolean;
        label?: string;
      }[] = [];
      for (const edge of ACROSS) {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) continue;
        next.push({
          key: `${edge.from}-${edge.to}`,
          d: acrossPath(from, to, root),
          dashed: edge.dashed,
          label: edge.label,
        });
      }
      setDrawn(next);
      setSize({ w: root.scrollWidth, h: root.scrollHeight });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [settings]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px]">
        Arrow = next step. Two cards = two outcomes. Dashed = handoff. Primary
        border = AI from this cache.
      </p>

      <div className="border-primary bg-card border px-2 py-1.5">
        <p className="text-foreground text-[10px] font-medium">
          Admin Settings → cached runtime
        </p>
        <dl className="mt-1.5 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-[8px] font-medium tracking-wide uppercase">
              Language model
            </dt>
            <dd className="mt-0.5 font-mono text-[10px] break-all">{model}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[8px] font-medium tracking-wide uppercase">
              STT
            </dt>
            <dd className="mt-0.5 font-mono text-[10px] break-all">{stt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[8px] font-medium tracking-wide uppercase">
              TTS
            </dt>
            <dd className="mt-0.5 font-mono text-[10px] break-all">
              {tts} · temp {settings.voice.ttsTemperature} · pace{" "}
              {settings.voice.ttsPace}
            </dd>
          </div>
        </dl>
      </div>

      <div className="overflow-x-auto">
        <div ref={rootRef} className="border-border relative border pb-4">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-visible"
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${Math.max(size.w, 1)} ${Math.max(size.h, 1)}`}
          >
            <defs>
              <marker
                id="flow-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0 0 L8 4 L0 8 Z" className="fill-primary" />
              </marker>
            </defs>
            {drawn.map((edge) => {
              const nums = [...edge.d.matchAll(/-?\d+(\.\d+)?/g)].map((m) =>
                Number(m[0]),
              );
              const mid = {
                x: ((nums[0] ?? 0) + (nums[nums.length - 2] ?? 0)) / 2,
                y: ((nums[1] ?? 0) + (nums[nums.length - 1] ?? 0)) / 2,
              };
              return (
                <g key={edge.key}>
                  <path
                    d={edge.d}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={1.25}
                    strokeDasharray={edge.dashed ? "5 4" : undefined}
                    markerEnd="url(#flow-arrow)"
                  />
                  {edge.label ? (
                    <text
                      x={mid.x}
                      y={mid.y - 6}
                      textAnchor="middle"
                      className="fill-primary text-[8px]"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          <div className="relative z-10 grid grid-cols-3">
            <Lane title="Candidate" note="DigiLocker sign-in. KYC at login.">
              <Box
                id="c-signin"
                title="DigiLocker sign-in"
                detail="Account + KYC. User id from DigiLocker."
              />
              <ArrowDown />
              <Box
                id="c-onboard"
                ai
                title="Onboarding voice"
                detail="Education, experience, languages."
                meta={`t ${t.onboarding} · onboarding`}
              />
              <ArrowDown />
              <Box id="c-explore" title="Explore" detail="Published roles." />
              <ArrowDown />
              <Box
                id="c-resume"
                title="Resume"
                detail="Always required. Not AI."
              />
              <Fork
                leftLabel="if enabled"
                rightLabel="if enabled"
                left={
                  <Box
                    id="c-comm"
                    ai
                    title="Communication"
                    detail="Voice, then scoring."
                    meta={`t ${t.interview} · interviewCommunication`}
                  />
                }
                right={
                  <Box
                    id="c-domain"
                    ai
                    title="Domain"
                    detail="Voice + role overview."
                    meta={`t ${t.interview} · interviewDomain`}
                  />
                }
              />
              <Merge>
                <Box
                  id="c-apply"
                  title="Apply"
                  detail="Enabled stages. Scores need evaluation consent."
                />
              </Merge>
              <ArrowDown />
              <Box
                id="c-help"
                ai
                title="Help"
                detail="Any signed-in user."
                meta={`t ${t.help} · help`}
              />
              <Fork
                left={<Box title="Stays in chat" detail="How-to. No ticket." />}
                right={
                  <Box
                    id="c-ticket"
                    title="Ticket"
                    detail="Confirmed problem."
                  />
                }
              />
            </Lane>

            <Lane
              title="Recruiter"
              note="No self-serve. Live waits on publish."
            >
              <Box
                id="r-request"
                title="Request access"
                detail="/for-recruiters. Not an account."
              />
              <ArrowDown />
              <Box
                id="r-account"
                title="Hire account"
                detail="After admin provision."
              />
              <ArrowDown />
              <Box
                id="r-write"
                ai
                title="Write a role"
                detail="Overview writer fills the form."
                meta={`t ${t.jobOverview} · jobOverview`}
              />
              <ArrowDown />
              <Box
                id="r-submit"
                title="Submit"
                detail="Draft until admin acts."
              />
              <Fork
                leftLabel="approve"
                rightLabel="deny"
                rightDashed
                left={
                  <Box
                    id="r-live"
                    title="Live role"
                    detail="Public. Audit on publish."
                  />
                }
                right={
                  <Box
                    id="r-deny"
                    aside
                    title="Stays draft"
                    detail="Deny emails the recruiter."
                  />
                }
              />
              <ArrowDown />
              <Box
                id="r-apps"
                title="Applicants"
                detail="Submitted / Selected / Rejected. Scores are consent-gated."
              />
              <Fork
                left={
                  <Box id="r-select" title="Select" detail="Applicant sheet." />
                }
                right={
                  <Box id="r-reject" title="Reject" detail="Applicant sheet." />
                }
              />
              <ArrowDown />
              <Box
                id="r-help"
                ai
                title="Help"
                detail="Hire audience in the prompt."
                meta={`t ${t.help} · help`}
              />
              <Fork
                left={<Box title="Stays in chat" detail="How-to. No ticket." />}
                right={
                  <Box
                    id="r-ticket"
                    title="Ticket"
                    detail="Confirmed problem."
                  />
                }
              />
            </Lane>

            <Lane title="Admin" note="Each block is its own job.">
              <Box
                id="a-inq"
                title="Recruiters · Inquiries"
                detail="From /for-recruiters."
              />
              <Fork
                leftLabel="approve"
                rightLabel="reject"
                rightDashed
                left={
                  <Box
                    id="a-provision"
                    title="Provision hire"
                    detail="Unlocks hire sign-in."
                  />
                }
                right={<Box aside title="Keep record" detail="No account." />}
              />
              <div className="h-3" />
              <Box
                id="a-jobs"
                title="Recruiters · Jobs"
                detail="Draft queue."
              />
              <Fork
                leftLabel="approve"
                rightLabel="deny"
                rightDashed
                left={<Box id="a-publish" title="Publish" detail="Live." />}
                right={
                  <Box
                    aside
                    title="Return to draft"
                    detail="Emails the recruiter."
                  />
                }
              />
              <div className="h-3" />
              <Box
                title="Compliance"
                detail="Rights + breaches. Erasure does not delete."
              />
              <div className="h-3" />
              <Box title="Email · Blog" detail="Resend. Marketing posts." />
              <div className="h-3" />
              <Box id="a-sup" title="Support" detail="Tickets from Help." />
            </Lane>
          </div>
        </div>
      </div>
    </div>
  );
}
