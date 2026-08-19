"use client";

import { CheckIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LANGUAGE_PICK_PROMPT,
  resumePickCopy,
  type TtsLanguageCode,
  VOICE_LANGUAGE_OPTIONS,
} from "@/lib/ai/voice/languages";
import { cn } from "@/lib/utils";

function lockDialog(event: Event) {
  event.preventDefault();
}

export function LanguagePickDialog({
  open,
  disabled,
  onSelect,
}: {
  open: boolean;
  disabled?: boolean;
  onSelect: (code: TtsLanguageCode) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onPointerDownOutside={lockDialog}
        onEscapeKeyDown={lockDialog}
        onInteractOutside={lockDialog}
      >
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            {LANGUAGE_PICK_PROMPT}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select a voice language to continue.
          </DialogDescription>
        </DialogHeader>
        <div
          role="listbox"
          aria-label="Select language"
          className="grid grid-cols-2 gap-1.5"
        >
          {VOICE_LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              role="option"
              aria-selected={false}
              disabled={disabled}
              onClick={() => onSelect(opt.code)}
              className={cn(
                "border-border bg-background flex items-center gap-2 border px-2.5 py-2 text-left transition-colors",
                "hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">
                  {opt.nativeLabel}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {opt.label}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResumePickDialog({
  open,
  languageCode,
  selected,
  disabled,
  uploading,
  onUpload,
  onSkip,
}: {
  open: boolean;
  languageCode?: TtsLanguageCode | null;
  selected?: "upload" | "skip" | null;
  disabled?: boolean;
  uploading?: boolean;
  onUpload: () => void;
  onSkip: () => void;
}) {
  const copy = resumePickCopy(languageCode);
  const confirmed = Boolean(selected);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-sm"
        onPointerDownOutside={lockDialog}
        onEscapeKeyDown={lockDialog}
        onInteractOutside={lockDialog}
      >
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {copy.upload} / {copy.skip}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            disabled={disabled || confirmed || uploading}
            onClick={onUpload}
          >
            <UploadIcon
              className={cn("size-4", uploading && "animate-pulse")}
            />
            {uploading ? copy.uploading : copy.upload}
            {selected === "upload" ? <CheckIcon className="size-4" /> : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || confirmed || uploading}
            onClick={onSkip}
          >
            {copy.skip}
            {selected === "skip" ? <CheckIcon className="size-4" /> : null}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
