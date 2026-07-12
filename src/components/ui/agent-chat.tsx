// component.tsx

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { LucideIcon } from "lucide-react";
import {
  CornerDownRight,
  Globe,
  Mic,
  Plus,
  Settings2,
  Telescope,
  X,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

// --- Radix primitives ---
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean;
  }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    >
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-xl bg-popover dark:bg-[#303030] p-2 text-popover-foreground dark:text-white shadow-md outline-none animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      <div className="relative bg-card dark:bg-[#303030] rounded-[28px] overflow-hidden shadow-2xl p-1">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 dark:bg-[#303030] p-1 hover:bg-accent dark:hover:bg-[#515151] transition-all">
          <X className="h-5 w-5 text-muted-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const toolsList: {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  /** Sent as: Utilize {mention} … user text (informs the model which capability to use). */
  mention: string;
  extra?: string;
}[] = [
  {
    id: "searchWeb",
    name: "Search the web",
    shortName: "Search",
    icon: Globe,
    mention: "@searchWebTool",
  },
  {
    id: "deepResearch",
    name: "Run deep research",
    shortName: "Deep Search",
    icon: Telescope,
    mention: "@deepResearchTool",
  },
];

const toolById = new Map(toolsList.map((t) => [t.id, t] as const));

function buildPromptWithToolHint(
  userText: string,
  toolId: string | null,
): string {
  const trimmed = userText.trim();
  if (!toolId) return trimmed;
  const mention = toolById.get(toolId)?.mention;
  if (!mention) return trimmed;
  return trimmed ? `Utilize ${mention} ${trimmed}` : `Utilize ${mention}`;
}

export type PromptBoxProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "disabled"
> & {
    /**
     * When set, wraps the box in a form and calls this on submit (then clears input and attachments).
     * Pass `files` from the hidden file input via AI SDK `sendMessage({ text, files })`.
     */
    onMessageSubmit?: (payload: {
      text: string;
      files?: FileList;
    }) => void | Promise<void>;
    /** When true, blocks sending only; the textarea stays focusable so users can draft while busy. */
    disabled?: boolean;
  };

type PendingAttachment = { id: string; file: File; previewUrl?: string };

function makeAttachmentId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// --- The Final, Self-Contained PromptBox Component ---
export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  (
    {
      className,
      onMessageSubmit,
      onKeyDown,
      disabled: submitLocked = false,
      ...props
    },
    ref,
  ) => {
    const formRef = React.useRef<HTMLFormElement>(null);
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const wasSubmitLockedRef = React.useRef(false);
    const focusComposer = React.useCallback(() => {
      internalTextareaRef.current?.focus({ preventScroll: true });
    }, []);

    React.useEffect(() => {
      if (wasSubmitLockedRef.current && !submitLocked) {
        focusComposer();
      }
      wasSubmitLockedRef.current = submitLocked;
    }, [submitLocked, focusComposer]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [value, setValue] = React.useState("");
    const [attachments, setAttachments] = React.useState<PendingAttachment[]>(
      [],
    );
    const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [lightboxAttachmentId, setLightboxAttachmentId] = React.useState<
      string | null
    >(null);
    const attachmentsRef = React.useRef(attachments);
    attachmentsRef.current = attachments;
    React.useEffect(
      () => () => {
        for (const a of attachmentsRef.current) {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        }
      },
      [],
    );
    // biome-ignore lint/style/noNonNullAssertion: imperative ref matches mounted textarea
    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: scrollHeight reflects `value`; re-run when text changes
    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value]);
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (props.onChange) props.onChange(e);
    };
    const handlePlusClick = () => {
      fileInputRef.current?.click();
    };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list?.length) return;
      setAttachments((prev) => {
        const next = [...prev];
        for (let i = 0; i < list.length; i++) {
          const file = list.item(i);
          if (!file) continue;
          const okImage = file.type.startsWith("image/");
          const okPdf = file.type === "application/pdf";
          if (!okImage && !okPdf) continue;
          next.push({
            id: makeAttachmentId(),
            file,
            previewUrl: okImage ? URL.createObjectURL(file) : undefined,
          });
        }
        return next;
      });
      event.target.value = "";
      queueMicrotask(focusComposer);
    };
    const removeAttachment = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setLightboxAttachmentId((openId) => (openId === id ? null : openId));
      setAttachments((prev) => {
        const found = prev.find((a) => a.id === id);
        if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
        return prev.filter((a) => a.id !== id);
      });
    };
    const trimmedValue = value.trim();
    const hasValue =
      trimmedValue.length > 0 || attachments.length > 0 || selectedTool != null;
    const activeTool = selectedTool ? toolById.get(selectedTool) : undefined;
    const ActiveToolIcon = activeTool?.icon;

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!hasValue || submitLocked) return;
      if (onMessageSubmit) {
        const dt = new DataTransfer();
        for (const a of attachments) {
          dt.items.add(a.file);
        }
        await onMessageSubmit({
          text: buildPromptWithToolHint(value, selectedTool),
          files: dt.files.length > 0 ? dt.files : undefined,
        });
        setLightboxAttachmentId(null);
        for (const a of attachments) {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        }
        setValue("");
        setAttachments([]);
        setSelectedTool(null);
        queueMicrotask(focusComposer);
      }
    };

    const handleTextareaKeyDown = (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        onMessageSubmit &&
        hasValue &&
        !submitLocked
      ) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    return (
      <form
        ref={formRef}
        onSubmit={(e) => void handleFormSubmit(e)}
        onPointerDownCapture={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "button, a, input, textarea, label, [data-radix-popper-content-wrapper]",
            )
          ) {
            return;
          }
          focusComposer();
        }}
        className={cn(
          "flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text",
          className,
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf"
          multiple
        />

        {attachments.length > 0 ? (
          <div className="mb-1 flex flex-wrap gap-2 px-1 pt-1">
            {attachments.map((a) =>
              a.previewUrl ? (
                <Dialog
                  key={a.id}
                  open={lightboxAttachmentId === a.id}
                  onOpenChange={(open) =>
                    setLightboxAttachmentId(open ? a.id : null)
                  }
                >
                  <div className="relative w-fit rounded-[1rem]">
                    <button
                      type="button"
                      className="transition-transform"
                      onClick={() => setLightboxAttachmentId(a.id)}
                    >
                      {/* biome-ignore lint/performance/noImgElement: object URLs from file picker */}
                      <img
                        src={a.previewUrl}
                        alt={a.file.name}
                        className="h-14.5 w-14.5 rounded-[1rem] object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeAttachment(e, a.id)}
                      className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/50 text-black transition-colors hover:bg-accent dark:bg-[#303030] dark:text-white dark:hover:bg-[#515151]"
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <DialogContent>
                      {/* biome-ignore lint/performance/noImgElement: object URLs from file picker */}
                      <img
                        src={a.previewUrl}
                        alt={a.file.name}
                        className="w-full max-h-[95vh] object-contain rounded-[24px]"
                      />
                    </DialogContent>
                  </div>
                </Dialog>
              ) : (
                <div
                  key={a.id}
                  className="relative flex max-w-[14rem] items-center gap-2 rounded-[1rem] border bg-muted/40 px-2.5 py-2 pr-7 text-left text-xs dark:border-transparent dark:bg-muted/30"
                >
                  <span className="truncate font-medium" title={a.file.name}>
                    {a.file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground dark:text-gray-400">
                    PDF
                  </span>
                  <button
                    type="button"
                    onClick={(e) => removeAttachment(e, a.id)}
                    className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/50 text-black transition-colors hover:bg-accent dark:bg-[#303030] dark:text-white dark:hover:bg-[#515151]"
                    aria-label="Remove PDF"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ),
            )}
          </div>
        ) : null}

        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Message..."
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12"
          {...props}
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePlusClick}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none dark:text-white dark:hover:bg-[#515151]"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="sr-only">Attach image or PDF</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}>
                  <p>Attach image or PDF</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-2 rounded-full p-2 text-sm text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none focus-visible:ring-ring"
                      >
                        <Settings2 className="h-4 w-4" />
                        {!selectedTool && "Tools"}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>Explore Tools</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start">
                  <div className="flex flex-col gap-1">
                    {toolsList.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setSelectedTool(tool.id);
                          setIsPopoverOpen(false);
                          queueMicrotask(focusComposer);
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent dark:hover:bg-[#515151]"
                      >
                        <tool.icon className="h-4 w-4" />
                        <span>{tool.name}</span>
                        {tool.extra ? (
                          <span className="ml-auto text-xs text-muted-foreground dark:text-gray-400">
                            {tool.extra}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {activeTool && (
                <>
                  <div className="h-4 w-px bg-border dark:bg-gray-600" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTool(null);
                      queueMicrotask(focusComposer);
                    }}
                    className="flex h-8 items-center gap-2 rounded-full px-2 text-sm dark:hover:bg-[#3b4045] hover:bg-accent cursor-pointer dark:text-[#99ceff] text-[#2294ff] transition-colors flex-row items-center justify-center"
                  >
                    {ActiveToolIcon && <ActiveToolIcon className="h-4 w-4" />}
                    {activeTool.shortName}
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* MODIFIED: Right-aligned buttons container */}
              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none"
                    >
                      <Mic className="h-5 w-5" />
                      <span className="sr-only">Record voice</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>Record voice</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="submit"
                      disabled={!hasValue || !!submitLocked}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                    >
                      <CornerDownRight className="h-5 w-5" aria-hidden />
                      <span className="sr-only">Send message</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>Send</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </form>
    );
  },
);
PromptBox.displayName = "PromptBox";
