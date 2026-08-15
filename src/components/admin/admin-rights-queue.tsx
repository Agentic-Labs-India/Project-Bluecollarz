"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  requestId: string;
  type: string;
  status: string;
  details: string;
  email: string;
  dataPrincipalId: string;
  adminNotes: string | null;
  createdAt: string;
};

export function AdminRightsQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/rights");
      const json = (await res.json().catch(() => ({}))) as {
        items?: Item[];
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

  const patch = async (requestId: string, status: string) => {
    const res = await fetch("/api/admin/rights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        status,
        adminNotes: notes[requestId] || undefined,
      }),
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
      {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.requestId}
            className="border-border space-y-3 border p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium capitalize">{item.type}</span>
              <span className="capitalize">
                {item.status.replace("_", " ")}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.email} · {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{item.details}</p>
            <Textarea
              placeholder="Admin notes"
              value={notes[item.requestId] ?? item.adminNotes ?? ""}
              onChange={(e) =>
                setNotes((prev) => ({
                  ...prev,
                  [item.requestId]: e.target.value,
                }))
              }
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void patch(item.requestId, "acknowledged")}
              >
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void patch(item.requestId, "in_progress")}
              >
                In progress
              </Button>
              <Button
                size="sm"
                onClick={() => void patch(item.requestId, "resolved")}
              >
                Resolve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void patch(item.requestId, "rejected")}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!items.length && !error ? (
        <p className="text-muted-foreground text-sm">No requests yet.</p>
      ) : null}
    </>
  );
}
