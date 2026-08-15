"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  incidentId: string;
  title: string;
  summary: string;
  status: string;
  affectedCount: number;
  boardNotifiedAt: string | null;
  principalsNotifiedAt: string | null;
  createdAt: string;
  notificationPreview: { subject: string; body: string };
};

export function AdminBreachRegister() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/breaches");
    const json = (await res.json().catch(() => ({}))) as {
      items?: Item[];
      error?: string;
    };
    if (!res.ok) {
      setError(json.error || "Failed to load");
      return;
    }
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const res = await fetch("/api/admin/breaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, summary }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Create failed");
      return;
    }
    setTitle("");
    setSummary("");
    await load();
  };

  const patch = async (
    incidentId: string,
    status: string,
    flags?: { markBoardNotified?: boolean; markPrincipalsNotified?: boolean },
  ) => {
    await fetch("/api/admin/breaches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId, status, ...flags }),
    });
    await load();
  };

  return (
    <>
      <section className="border-border mb-8 space-y-3 border p-4">
        <Label htmlFor="breach-title">Title</Label>
        <Input
          id="breach-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Label htmlFor="breach-summary">Summary</Label>
        <Textarea
          id="breach-summary"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <Button
          type="button"
          disabled={title.trim().length < 3 || summary.trim().length < 10}
          onClick={() => void create()}
        >
          Open incident
        </Button>
      </section>

      {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.incidentId}
            className="border-border space-y-3 border p-4"
          >
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="font-medium">{item.title}</span>
              <span className="capitalize">{item.status}</span>
              <span className="text-muted-foreground text-xs">
                {item.incidentId} · {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{item.summary}</p>
            <pre className="bg-muted/40 overflow-x-auto p-3 text-xs whitespace-pre-wrap">
              {item.notificationPreview.subject}
              {"\n\n"}
              {item.notificationPreview.body}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void patch(item.incidentId, "investigating")}
              >
                Investigating
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void patch(item.incidentId, "notified", {
                    markBoardNotified: true,
                    markPrincipalsNotified: true,
                  })
                }
              >
                Mark notified
              </Button>
              <Button
                size="sm"
                onClick={() => void patch(item.incidentId, "closed")}
              >
                Close
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
