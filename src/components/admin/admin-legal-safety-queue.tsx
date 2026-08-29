"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CaseState, SeriousOffenceCasePublic } from "@/lib/legal-safety/types";

const HUMAN_OUTCOMES = [
  {
    to: "no_statutory_trigger" as CaseState,
    label: "No statutory trigger",
  },
  {
    to: "mandatory_report_triggered" as CaseState,
    label: "Mark mandatory report required",
  },
];

export function AdminLegalSafetyQueue() {
  const [items, setItems] = useState<SeriousOffenceCasePublic[]>([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/legal-safety/cases");
      const json = (await res.json().catch(() => ({}))) as {
        items?: SeriousOffenceCasePublic[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (
    caseId: string,
    body: { to?: (typeof HUMAN_OUTCOMES)[number]["to"]; releaseHold?: boolean },
  ) => {
    const note = notes[caseId]?.trim() ?? "";
    const res = await fetch(`/api/admin/legal-safety/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, note }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Update failed");
      return;
    }
    await load();
  };

  return (
    <>
      <p className="text-muted-foreground mb-4 text-sm">
        These buttons record a named human decision. They do not file a report,
        do not notify the accused, and do not discharge anyone&apos;s personal
        reporting duty.
      </p>
      {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No legal-safety cases.</p>
      ) : null}
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.caseId} className="border-border space-y-3 border p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                {item.state.replaceAll("_", " ")}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.caseId} · {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Observations: {item.indicators.join(", ") || "—"} · hold{" "}
              {item.legalHoldId ? "active" : "none"}
            </p>
            {item.evidence[0]?.excerpt ? (
              <p className="text-sm whitespace-pre-wrap">
                {item.evidence[0].excerpt.slice(0, 600)}
              </p>
            ) : null}
            {item.state === "legal_review_required" || item.legalHoldId ? (
              <>
                <Textarea
                  placeholder="Reason for this human decision (required)"
                  value={notes[item.caseId] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [item.caseId]: e.target.value,
                    }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {item.state === "legal_review_required"
                    ? HUMAN_OUTCOMES.map((outcome) => (
                        <Button
                          key={outcome.to}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void patch(item.caseId, { to: outcome.to })
                          }
                        >
                          {outcome.label}
                        </Button>
                      ))
                    : null}
                  {item.legalHoldId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void patch(item.caseId, { releaseHold: true })
                      }
                    >
                      Release hold
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                Last: {item.transitions.at(-1)?.actorEmail} —{" "}
                {item.transitions.at(-1)?.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
