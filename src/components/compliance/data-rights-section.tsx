"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [
  { value: "access", label: "Access / export my data" },
  { value: "correction", label: "Correction / completion" },
  { value: "erasure", label: "Request erasure (use Delete account to erase)" },
  {
    value: "withdraw",
    label: "Withdraw consent (stops interview release to employers and medical booking)",
  },
  { value: "nominate", label: "Nominate someone" },
  { value: "grievance", label: "Grievance" },
] as const;

type RightsItem = {
  requestId: string;
  type: string;
  status: string;
  details: string;
  createdAt: string;
};

export function DataRightsSection() {
  const [items, setItems] = useState<RightsItem[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("access");
  const [details, setDetails] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeEmail, setNomineeEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/rights");
      const json = (await res.json().catch(() => ({}))) as {
        items?: RightsItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/candidate/rights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          details,
          nomineeName: type === "nominate" ? nomineeName : undefined,
          nomineeEmail: type === "nominate" ? nomineeEmail : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        export?: unknown;
        item?: RightsItem;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not submit");

      if (json.export) {
        const blob = new Blob([JSON.stringify(json.export, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `blucollarz-data-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("Access request recorded. Export downloaded.");
      } else {
        setMessage(
          json.message || `Request ${json.item?.requestId ?? ""} submitted.`,
        );
        if (type === "erasure") {
          document.getElementById("delete-account")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
      setDetails("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Access or export your data, request correction, withdraw consent (stops
        interview release to employers and medical booking), nominate someone,
        or raise a grievance. We identify you by the email on this signed-in
        account.
        Correction is completed by updating your{" "}
        <a href="/candidate/profile" className="text-foreground underline">
          profile
        </a>
        . To erase your account and data, use Delete account below after
        submitting an erasure request. We acknowledge promptly (target 72 hours)
        and resolve grievances within 90 days. See{" "}
        <a href="/grievance" className="text-foreground underline">
          Grievance Officer
        </a>
        .
      </p>

      <div className="space-y-2">
        <Label htmlFor="rights-type">Request type</Label>
        <select
          id="rights-type"
          className="border-input bg-background h-9 w-full border px-2 text-sm"
          value={type}
          onChange={(e) =>
            setType(e.target.value as (typeof TYPES)[number]["value"])
          }
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rights-details">Details</Label>
        <Textarea
          id="rights-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="Describe what you need"
        />
      </div>

      {type === "correction" ? (
        <p className="text-muted-foreground text-xs">
          This logs a correction request. Also update the fields on your{" "}
          <a href="/candidate/profile" className="text-foreground underline">
            profile
          </a>
          .
        </p>
      ) : null}
      {type === "erasure" ? (
        <p className="text-muted-foreground text-xs">
          Submitting records the request. Erasure is completed with Delete
          account below after we can verify it is you.
        </p>
      ) : null}

      {type === "nominate" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nominee-name">Nominee name</Label>
            <Input
              id="nominee-name"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nominee-email">Nominee email</Label>
            <Input
              id="nominee-email"
              type="email"
              value={nomineeEmail}
              onChange={(e) => setNomineeEmail(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? (
        <p className="text-sm text-sky-700 dark:text-sky-400">{message}</p>
      ) : null}

      <Button
        type="button"
        disabled={saving || details.trim().length < 3}
        onClick={() => void submit()}
      >
        Submit request
      </Button>

      <div className="border-border space-y-2 border-t pt-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Your requests
        </p>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">None yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.requestId} className="border-border border p-2">
                <span className="font-medium capitalize">{item.type}</span>
                {" · "}
                <span className="capitalize">
                  {item.status.replace("_", " ")}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {new Date(item.createdAt).toLocaleString()} · {item.requestId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
