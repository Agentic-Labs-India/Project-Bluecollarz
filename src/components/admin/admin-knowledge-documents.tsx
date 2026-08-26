"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { RotateCcwIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type {
  KnowledgeRagKey,
  KnowledgeRagSettings,
} from "@/lib/admin/platform-settings-types";
import { uploadBlob } from "@/lib/blob/client/upload";
import {
  blobFileUrl,
  KNOWLEDGE_PDF_MAX_BYTES,
  KNOWLEDGE_PDF_MAX_MB,
} from "@/lib/blob/pathname";
import { formatDateTimeShort } from "@/lib/core/dates";
import {
  KNOWLEDGE_DOC_TYPE_LABELS,
  KNOWLEDGE_DOC_TYPES,
  type KnowledgeDocType,
  type KnowledgeSourceListItem,
  type KnowledgeSourceStatus,
} from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

const RAG_SWITCHES: {
  key: KnowledgeRagKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "support",
    label: "Support",
    hint: "Help chat can search uploaded PDFs.",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    hint: "Candidate onboarding coach can search uploaded PDFs.",
  },
  {
    key: "interviewCommunication",
    label: "Interview communication",
    hint: "Communication interview can search uploaded PDFs.",
  },
  {
    key: "interviewDomain",
    label: "Interview domain",
    hint: "Domain interview can search uploaded PDFs.",
  },
];

function statusLabel(status: KnowledgeSourceStatus) {
  if (status === "queued") return "Queued";
  if (status === "processing") return "Ingesting";
  if (status === "ready") return "Ready";
  return "Failed";
}

function safePdfName(name: string) {
  const base = name.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export function AdminKnowledgeDocuments({
  rag,
  onRagChange,
}: {
  rag: KnowledgeRagSettings;
  onRagChange: (key: KnowledgeRagKey, next: boolean) => void;
}) {
  const [items, setItems] = useState<KnowledgeSourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [docType, setDocType] = useState<KnowledgeDocType>("general");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/knowledge");
      const json = (await res.json().catch(() => ({}))) as {
        items?: KnowledgeSourceListItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Could not load documents");
        return;
      }
      setItems(json.items ?? []);
    } catch {
      toast.error("Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ingesting = items.some(
    (item) => item.status === "queued" || item.status === "processing",
  );

  useEffect(() => {
    if (!ingesting) return;
    const timer = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [ingesting, load]);

  async function enqueueFile(file: File) {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      throw new Error(`${file.name} is not a PDF`);
    }
    if (file.size > KNOWLEDGE_PDF_MAX_BYTES) {
      throw new Error(`${file.name} is over ${KNOWLEDGE_PDF_MAX_MB} MB`);
    }
    const uploaded = await uploadBlob({
      file,
      pathname: `admin/knowledge/${Date.now()}-${safePdfName(file.name)}`,
      contentType: "application/pdf",
      maxBytes: KNOWLEDGE_PDF_MAX_BYTES,
    });
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        docType,
        blobUrl: uploaded.url,
        blobPathname: uploaded.pathname,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(json.error || `Could not queue ${file.name}`);
    }
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = [...fileList];
    setUploading(true);
    try {
      const results = await Promise.allSettled(files.map(enqueueFile));
      const failed = results.filter((r) => r.status === "rejected");
      const ok = results.length - failed.length;
      if (ok) {
        toast.success(
          ok === 1
            ? "PDF queued — ingesting in the background"
            : `${ok} PDFs queued — ingesting in the background`,
        );
      }
      for (const result of failed) {
        if (result.status === "rejected") {
          toast.error(
            result.reason instanceof Error
              ? result.reason.message
              : "Upload failed",
          );
        }
      }
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const retry = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not retry");
        return;
      }
      toast.success("Ingest queued again");
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: string, source: string) => {
      if (!window.confirm(`Delete ${source} and its chunks?`)) return;
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not delete");
        return;
      }
      toast.success("Document deleted");
      await load();
    },
    [load],
  );

  const columns: ColumnDef<KnowledgeSourceListItem>[] = useMemo(
    () => [
      {
        id: "search",
        accessorFn: (row) =>
          `${row.source} ${KNOWLEDGE_DOC_TYPE_LABELS[row.docType]} ${row.docType} ${row.status}`,
        header: "File",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[280px]">
            <a
              href={blobFileUrl(row.original.blobUrl)}
              target="_blank"
              rel="noreferrer"
              className="text-foreground hover:underline truncate text-sm font-medium"
            >
              {row.original.source}
            </a>
            {row.original.error ? (
              <p className="text-destructive mt-0.5 text-[11px] leading-snug">
                {row.original.error}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "docType",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {KNOWLEDGE_DOC_TYPE_LABELS[row.original.docType]}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-sm",
              row.original.status === "ready" && "text-foreground",
              row.original.status === "error" && "text-destructive",
              (row.original.status === "queued" ||
                row.original.status === "processing") &&
                "text-muted-foreground",
            )}
          >
            {statusLabel(row.original.status)}
            {row.original.status === "ready"
              ? ` · ${row.original.chunkCount} chunks`
              : null}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatDateTimeShort(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {row.original.status !== "processing" ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Re-ingest"
                onClick={() => void retry(row.original.id)}
              >
                <RotateCcwIcon />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete"
              onClick={() => void remove(row.original.id, row.original.source)}
            >
              <Trash2Icon />
            </Button>
          </div>
        ),
      },
    ],
    [retry, remove],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        searchKey="search"
        searchPlaceholder="Search files…"
        loading={loading}
        leftActions={
          <Button type="button" onClick={() => setManageOpen(true)}>
            Manage
          </Button>
        }
      />

      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md!"
          onPointerDownOutside={(event) => {
            const node = event.target;
            if (
              node instanceof Element &&
              node.closest("[data-slot=select-content]")
            ) {
              event.preventDefault();
            }
          }}
        >
          <SheetHeader className="shrink-0 border-b px-4 py-4">
            <SheetTitle className="text-base">Manage</SheetTitle>
            <SheetDescription>
              Upload PDFs and turn RAG on for Help, onboarding, and interviews.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
            <section className="space-y-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Off until you enable a surface. Preview AI always searches these
                PDFs.
              </p>
              {RAG_SWITCHES.map((item) => {
                const id = `rag-${item.key}`;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Label htmlFor={id}>{item.label}</Label>
                      <p className="text-muted-foreground text-xs">
                        {item.hint}
                      </p>
                    </div>
                    <Switch
                      id={id}
                      checked={rag[item.key]}
                      onCheckedChange={(next) => onRagChange(item.key, next)}
                    />
                  </div>
                );
              })}
            </section>
            <section className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-doc-type">Document type</Label>
                <Select
                  value={docType}
                  onValueChange={(value) =>
                    setDocType(value as KnowledgeDocType)
                  }
                >
                  <SelectTrigger id="kb-doc-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_DOC_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {KNOWLEDGE_DOC_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input
                ref={inputRef}
                id="kb-pdf"
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="sr-only"
                onChange={(e) => void onFilesSelected(e.target.files)}
              />
              <Button
                type="button"
                className="w-full"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon />
                {uploading ? "Uploading…" : "Upload PDFs"}
              </Button>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Private storage, then chunk and embed in the background. Same
                filename replaces the previous ingest.
              </p>
            </section>
          </div>
          <SheetFooter className="border-border shrink-0 border-t">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
