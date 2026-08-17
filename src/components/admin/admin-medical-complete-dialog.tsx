"use client";

import { FileUpIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MEDICAL_REPORT_MAX_BYTES,
  MEDICAL_REPORT_MAX_MB,
} from "@/lib/blob/pathname";
import { uploadBlob } from "@/lib/blob/upload";
import type { MedicalAppointmentListItem } from "@/lib/medical/types";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "report";
}

type PendingFile = {
  name: string;
  url: string;
  contentType: string;
};

export function AdminMedicalCompleteDialog({
  appointment,
  open,
  onOpenChange,
  onCompleted,
}: {
  appointment: MedicalAppointmentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addFiles(list: FileList | File[]) {
    if (!appointment) return;
    const next = Array.from(list);
    if (!next.length) return;
    if (files.length + next.length > 10) {
      toast.error("Maximum of 10 reports");
      return;
    }
    setUploading(true);
    try {
      const uploaded: PendingFile[] = [];
      for (const file of next) {
        if (file.size > MEDICAL_REPORT_MAX_BYTES) {
          toast.error(
            `${file.name} is larger than ${MEDICAL_REPORT_MAX_MB} MB`,
          );
          continue;
        }
        const result = await uploadBlob({
          file,
          pathname: `admin/medical/${appointment.id}/${Date.now()}-${safeFilename(file.name)}`,
          contentType: file.type || "application/pdf",
          maxBytes: MEDICAL_REPORT_MAX_BYTES,
        });
        uploaded.push({
          name: file.name,
          url: result.url,
          contentType: file.type || "application/pdf",
        });
      }
      if (uploaded.length) setFiles((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error("Could not upload report");
    } finally {
      setUploading(false);
    }
  }

  async function complete() {
    if (!appointment) return;
    if (!files.length) {
      toast.error("Attach at least one report");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/medical/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          reports: files,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not complete medical test");
        return;
      }
      toast.success("Medical test completed");
      setFiles([]);
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Could not complete medical test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFiles([]);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>Mark medical test complete</DialogTitle>
          <DialogDescription>
            {appointment?.applicantName || "Candidate"} ·{" "}
            {appointment?.jobTitle}. Attach the report file before completing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            disabled={uploading || saving}
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading || saving}
            onClick={() => inputRef.current?.click()}
          >
            <FileUpIcon className="size-3.5" />
            {uploading ? "Uploading…" : "Attach reports"}
          </Button>
          <p className="text-muted-foreground text-xs">
            PDF or image · max {MEDICAL_REPORT_MAX_MB} MB each.
          </p>
          {files.length ? (
            <ul className="divide-border border-border divide-y border">
              {files.map((file) => (
                <li
                  key={file.url}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="truncate text-sm">{file.name}</span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() =>
                      setFiles((prev) =>
                        prev.filter((item) => item.url !== file.url),
                      )
                    }
                    aria-label="Remove file"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No files attached.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!files.length || uploading || saving}
            onClick={() => void complete()}
          >
            {saving ? "Saving…" : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
