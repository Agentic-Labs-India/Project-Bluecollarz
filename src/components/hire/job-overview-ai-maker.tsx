"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextContent } from "@/components/ui/rich-text-content";

type JobOverviewAiMakerProps = {
  /** Prefill from the job form when available. */
  context?: {
    title?: string;
    pay?: string;
    locationLabel?: string;
    employmentType?: string;
  };
  onApply: (overviewHtml: string) => void;
};

/** Dialog that drafts an industry-standard job overview from a short hire brief. */
export function JobOverviewAiMaker({
  context,
  onApply,
}: JobOverviewAiMakerProps) {
  const [open, setOpen] = useState(false);
  const [roleType, setRoleType] = useState(context?.title?.trim() || "");
  const [experience, setExperience] = useState("");
  const [mustHaves, setMustHaves] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  const resetPreview = () => {
    setPreviewHtml("");
    setError("");
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    setPreviewHtml("");
    try {
      const res = await fetch("/api/hire/job-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleType: roleType.trim(),
          experience: experience.trim(),
          mustHaves: mustHaves.trim(),
          notes: notes.trim(),
          title: context?.title?.trim() || "",
          pay: context?.pay?.trim() || "",
          locationLabel: context?.locationLabel?.trim() || "",
          employmentType: context?.employmentType?.trim() || "",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        overview?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Generation failed");
      }
      if (!data?.overview) {
        throw new Error("No overview returned");
      }
      setPreviewHtml(data.overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!previewHtml) return;
    onApply(previewHtml);
    setOpen(false);
    resetPreview();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetPreview();
        if (next && !roleType.trim() && context?.title?.trim()) {
          setRoleType(context.title.trim());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <SparklesIcon className="size-3.5" />
          AI overview maker
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>AI requirement overview</DialogTitle>
          <DialogDescription>
            Enter the kind of person you need. We&apos;ll draft an
            industry-standard overview you can edit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden py-2 md:grid-cols-2 md:gap-6">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="ai-role">Role / trade</Label>
              <Input
                id="ai-role"
                placeholder="e.g. Site electrician, forklift operator, HVAC tech"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-exp">Experience</Label>
              <Input
                id="ai-exp"
                placeholder="e.g. 3+ years, entry-level, licensed journeyman"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-must">Must-haves (optional)</Label>
              <Textarea
                id="ai-must"
                rows={3}
                placeholder="Licenses, tools, languages, shift, physical demands…"
                value={mustHaves}
                onChange={(e) => setMustHaves(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-notes">Extra notes (optional)</Label>
              <Textarea
                id="ai-notes"
                rows={3}
                placeholder="Site type, team size, anything else the overview should reflect"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
          </div>

          <div className="border-border flex min-h-56 flex-col border md:min-h-0">
            <div className="border-border flex items-center justify-between border-b px-3 py-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Generated overview
              </p>
              {loading ? (
                <p className="text-muted-foreground text-xs">Generating…</p>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
              {previewHtml ? (
                <RichTextContent html={previewHtml} />
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Fill in the brief on the left, then generate. The draft
                  overview will appear here.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={
              loading ||
              roleType.trim().length < 2 ||
              experience.trim().length < 1
            }
            onClick={() => void generate()}
          >
            {loading
              ? "Generating…"
              : previewHtml
                ? "Regenerate"
                : "Generate overview"}
          </Button>
          <Button
            type="button"
            disabled={!previewHtml || loading}
            onClick={apply}
          >
            Use this overview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
