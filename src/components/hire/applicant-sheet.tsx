"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CandidateProfileData } from "@/lib/candidate/profile";
import type { ApplicationStatus } from "@/lib/jobs/applications";
import type { CommunicationAnalysis, InterviewStageId } from "@/lib/interviews";
import { interviewStageTitle } from "@/lib/interviews/labels";
import {
  KYC_UPLOAD_LABELS,
  KYC_UPLOAD_SLOTS,
  type KycUploadSlot,
} from "@/lib/kyc";

type InterviewDetail = {
  id: string;
  stageId: InterviewStageId;
  status: string;
  jobTitle: string;
  analysis: CommunicationAnalysis | null;
  videoUrl: string | null;
  transcript: Array<{ role: "assistant" | "user"; text: string; at: string }>;
  startedAt: string;
  completedAt: string | null;
};

type HireKycView = {
  verified: boolean;
  verifiedAt: string | null;
  summary: string | null;
  documents: Partial<
    Record<
      KycUploadSlot,
      {
        url: string;
        pathname: string;
        contentType: string;
        uploadedAt: string;
      }
    >
  >;
};

type ApplicantDetailResponse = {
  job: { id: string; title: string };
  application: { id: string; status: string; appliedAt: string };
  profile: CandidateProfileData;
  kyc: HireKycView;
  interviews: InterviewDetail[];
};

function initialsFor(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0] ?? "").join("") || "?").toUpperCase();
}

function stageTitle(stageId: InterviewStageId): string {
  return interviewStageTitle(stageId);
}

function ScoreGrid({ analysis }: { analysis: CommunicationAnalysis }) {
  const rows: Array<{ label: string; value: number }> = [
    { label: "Overall", value: analysis.overall },
    { label: "Clarity", value: analysis.clarity },
    { label: "Fluency", value: analysis.fluency },
    { label: "Confidence", value: analysis.confidence },
    { label: "Professionalism", value: analysis.professionalism },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-border bg-muted/40 rounded-md border px-3 py-2"
        >
          <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
            {row.label}
          </p>
          <p className="text-foreground text-lg font-semibold tabular-nums">
            {row.value}
            <span className="text-muted-foreground text-xs font-normal">
              {" "}
              / 10
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const text =
    value === undefined || value === null || String(value).trim() === ""
      ? "—"
      : String(value);
  return (
    <div>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </p>
      {items.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="font-normal">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-foreground mt-0.5 text-sm">—</p>
      )}
    </div>
  );
}

function ResumeAccordionBody({ profile }: { profile: CandidateProfileData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline" value={profile.headline} />
        <Field label="Phone" value={profile.phoneNumber} />
        <Field label="Location" value={profile.location} />
        <Field label="Years of experience" value={profile.yearsExperience} />
        <Field label="Work authorization" value={profile.workAuthorization} />
        <Field label="Date of birth" value={profile.dateOfBirth} />
      </div>

      <Field label="Summary" value={profile.summary} />

      <TagList label="Skills" items={profile.skills} />
      <TagList label="Languages" items={profile.languages} />
      <TagList label="Preferred countries" items={profile.preferredCountries} />
      <TagList label="Hobbies" items={profile.hobbies} />

      <div>
        <p className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">
          Education
        </p>
        {profile.education.length ? (
          <ul className="space-y-3">
            {profile.education.map((ed, i) => (
              <li key={i} className="border-border border-l-2 pl-3">
                <p className="text-foreground text-sm font-medium">
                  {[ed.degree, ed.major].filter(Boolean).join(" · ") ||
                    "Education"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[ed.school, [ed.startYear, ed.endYear].filter(Boolean).join("–")]
                    .filter(Boolean)
                    .join(" · ")}
                  {ed.gpa ? ` · GPA ${ed.gpa}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">—</p>
        )}
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">
          Work experience
        </p>
        {profile.workExperience.length ? (
          <ul className="space-y-3">
            {profile.workExperience.map((wx, i) => (
              <li key={i} className="border-border border-l-2 pl-3">
                <p className="text-foreground text-sm font-medium">
                  {[wx.role, wx.company].filter(Boolean).join(" · ") ||
                    "Experience"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[
                    [wx.startYear, wx.endYear].filter(Boolean).join("–"),
                    [wx.city, wx.country].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {wx.description ? (
                  <p className="text-foreground mt-1 text-sm whitespace-pre-wrap">
                    {wx.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">—</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Portfolio" value={profile.portfolioUrl} />
        <Field
          label="Other links"
          value={profile.otherLinks.join("\n") || undefined}
        />
        <Field
          label="Residence"
          value={[
            profile.residenceCity,
            profile.residenceState,
            profile.residenceCountry,
            profile.residencePostalCode,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <Field
          label="Full-time compensation"
          value={profile.fullTimeCompensation}
        />
        <Field
          label="Part-time compensation"
          value={profile.partTimeCompensation}
        />
      </div>
    </div>
  );
}

function KycAccordionBody({ kyc }: { kyc: HireKycView }) {
  if (!kyc.verified) {
    return (
      <p className="text-sm">
        AI KYC is not complete yet. Documents appear here after the candidate
        passes verification.
      </p>
    );
  }

  const docs = KYC_UPLOAD_SLOTS.filter((slot) => kyc.documents[slot]?.url);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>AI KYC Done</Badge>
        {kyc.verifiedAt ? (
          <span className="text-muted-foreground text-xs">
            Verified {new Date(kyc.verifiedAt).toLocaleString()}
          </span>
        ) : null}
      </div>
      {kyc.summary ? <Field label="AI summary" value={kyc.summary} /> : null}
      {docs.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((slot) => {
            const file = kyc.documents[slot]!;
            const isImage = file.contentType.startsWith("image/");
            return (
              <a
                key={slot}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:bg-muted/40 block overflow-hidden rounded-md border transition-colors"
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={KYC_UPLOAD_LABELS[slot]}
                    className="bg-muted aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center text-sm">
                    Open PDF
                  </div>
                )}
                <p className="text-foreground px-3 py-2 text-sm font-medium">
                  {KYC_UPLOAD_LABELS[slot]}
                </p>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-sm">Verified, but no document files are on file.</p>
      )}
    </div>
  );
}

function InterviewAccordionBody({ interview }: { interview: InterviewDetail }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {interview.status.replace("_", " ")}
        </Badge>
        {interview.completedAt ? (
          <span className="text-muted-foreground text-xs">
            Completed {new Date(interview.completedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {interview.analysis ? (
        <>
          <ScoreGrid analysis={interview.analysis} />
          <Field label="Summary" value={interview.analysis.summary} />
          <div>
            <p className="text-muted-foreground mb-1.5 text-[11px] uppercase tracking-wide">
              Strengths
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {interview.analysis.strengths.map((s) => (
                <li key={s} className="text-foreground text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-muted-foreground mb-1.5 text-[11px] uppercase tracking-wide">
              Improvements
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {interview.analysis.improvements.map((s) => (
                <li key={s} className="text-foreground text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm">
          {interview.status === "completed"
            ? "No score available for this interview."
            : "Interview not completed yet."}
        </p>
      )}

      {interview.videoUrl ? (
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">
            Recording
          </p>
          <video
            src={interview.videoUrl}
            controls
            className="border-border bg-muted aspect-video w-full border"
          />
        </div>
      ) : null}

      {interview.transcript.length ? (
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">
            Transcript
          </p>
          <div className="border-border max-h-64 space-y-2 overflow-y-auto border p-3">
            {interview.transcript.map((turn, i) => (
              <div key={`${turn.at}-${i}`}>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  {turn.role === "assistant" ? "Interviewer" : "Candidate"}
                </p>
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {turn.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ApplicantSheet({
  jobId,
  applicantId,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  jobId: string;
  applicantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after select/reject with the new status (table can update locally). */
  onStatusChanged?: (
    applicantId: string,
    status: ApplicationStatus,
  ) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<ApplicationStatus | null>(
    null,
  );
  const [data, setData] = useState<ApplicantDetailResponse | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !applicantId) return;
    setLoading(true);
    setError("");
    setActionError("");
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/applications/${applicantId}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load candidate");
      setData(json as ApplicantDetailResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load candidate");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [jobId, applicantId]);

  useEffect(() => {
    if (open && applicantId) {
      void load();
    } else if (!open) {
      setData(null);
      setError("");
      setActionError("");
      setActionLoading(null);
    }
  }, [open, applicantId, load]);

  async function updateStatus(status: "selected" | "rejected") {
    if (!jobId || !applicantId || !data) return;
    setActionLoading(status);
    setActionError("");
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/applications/${applicantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update status");
      const nextStatus = json.application.status as ApplicationStatus;
      setData((prev) =>
        prev
          ? {
              ...prev,
              application: {
                ...prev.application,
                status: nextStatus,
              },
            }
          : prev,
      );
      onStatusChanged?.(applicantId, nextStatus);
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : "Failed to update status",
      );
    } finally {
      setActionLoading(null);
    }
  }

  const profile = data?.profile;
  const currentStatus = data?.application.status;
  const communication = data?.interviews.find(
    (i) => i.stageId === "ai-communication",
  );
  const domain = data?.interviews.find((i) => i.stageId === "ai-domain");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full! gap-0 p-0 sm:max-w-2xl!"
      >
        <SheetHeader className="shrink-0 border-b">
          <div className="flex items-start gap-3">
            {profile ? (
              <Avatar size="lg">
                {profile.image ? (
                  <AvatarImage src={profile.image} alt="" />
                ) : null}
                <AvatarFallback>
                  {initialsFor(profile.name, profile.email)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Skeleton className="size-12 rounded-full" />
            )}
            <div className="min-w-0 flex-1">
              {loading || !profile ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="mt-2 h-5 w-24" />
                </div>
              ) : (
                <>
                  <SheetTitle className="truncate text-base">
                    {profile.name || "Candidate"}
                  </SheetTitle>
                  <SheetDescription className="truncate">
                    {profile.email || "Profile, resume, and interview scores"}
                  </SheetDescription>
                  {data ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {data.application.status}
                      </Badge>
                      {data.kyc?.verified ? (
                        <Badge>AI KYC Done</Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          KYC pending
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        Applied{" "}
                        {new Date(
                          data.application.appliedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-2">
            {loading ? (
              <div className="space-y-4 py-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error ? (
              <p className="text-destructive py-6 text-sm">{error}</p>
            ) : data && profile ? (
              <Accordion
                type="multiple"
                defaultValue={[
                  "resume",
                  "kyc",
                  "ai-communication",
                  "ai-domain",
                ]}
              >
                <AccordionItem value="resume">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      Resume / Profile
                      {profile.candidateOnboardingComplete ? (
                        <Badge variant="secondary" className="font-normal">
                          Complete
                        </Badge>
                      ) : null}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ResumeAccordionBody profile={profile} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="kyc">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      AI KYC
                      {data.kyc?.verified ? (
                        <Badge>AI KYC Done</Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          Pending
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <KycAccordionBody
                      kyc={
                        data.kyc ?? {
                          verified: false,
                          verifiedAt: null,
                          summary: null,
                          documents: {},
                        }
                      }
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-communication">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      {stageTitle("ai-communication")}
                      {communication?.analysis?.overall != null ? (
                        <Badge className="tabular-nums">
                          {communication.analysis.overall}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {communication
                            ? communication.status
                            : "Not started"}
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {communication ? (
                      <InterviewAccordionBody interview={communication} />
                    ) : (
                      <p className="text-sm">
                        No communication interview for this role yet.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-domain">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      {stageTitle("ai-domain")}
                      {domain?.analysis?.overall != null ? (
                        <Badge className="tabular-nums">
                          {domain.analysis.overall}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {domain ? domain.status : "Not started"}
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {domain ? (
                      <InterviewAccordionBody interview={domain} />
                    ) : (
                      <p className="text-sm">
                        No domain interview for this role yet.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t">
          {actionError ? (
            <p className="text-destructive text-sm sm:col-span-full">
              {actionError}
            </p>
          ) : null}
          <div className="flex w-full gap-2">
            <Button
              className="w-full flex-1"
              variant="destructive"
              disabled={
                !data ||
                actionLoading !== null ||
                currentStatus === "rejected"
              }
              onClick={() => void updateStatus("rejected")}
            >
              {actionLoading === "rejected" ? "Rejecting…" : "Reject"}
            </Button>
            <Button
              className="w-full flex-1"
              disabled={
                !data ||
                actionLoading !== null ||
                currentStatus === "selected"
              }
              onClick={() => void updateStatus("selected")}
            >
              {actionLoading === "selected" ? "Selecting…" : "Select"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
