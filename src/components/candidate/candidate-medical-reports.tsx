"use client";

import { DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMedicalDateTime } from "@/lib/medical/time";
import type { CandidateMedicalReport } from "@/lib/medical/types";

export function CandidateMedicalReports() {
  const [items, setItems] = useState<CandidateMedicalReport[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/candidate/medical-reports")
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          items?: CandidateMedicalReport[];
        };
        if (cancelled || !res.ok) return;
        setItems(json.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <section className="space-y-3">
        <h3 className="text-foreground text-xl font-semibold">
          Medical reports
        </h3>
        <Skeleton className="h-12 w-full" />
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-foreground text-xl font-semibold">Medical reports</h3>
      <ul className="divide-border border-border divide-y border">
        {items.map((report) => (
          <li
            key={report.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">
                {report.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {report.jobTitle} · {formatMedicalDateTime(report.uploadedAt)}
              </p>
            </div>
            <a
              href={report.url}
              download={report.name}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground inline-flex shrink-0 items-center gap-1.5 text-sm underline-offset-4 hover:underline"
            >
              <DownloadIcon className="size-3.5" />
              Download
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
