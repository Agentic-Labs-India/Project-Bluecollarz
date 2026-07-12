import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

/** Render sanitized rich-text HTML (job overview, etc.). */
export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = sanitizeRichTextHtml(html);
  if (!clean) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>—</p>
    );
  }

  return (
    <div
      className={cn("prose-job text-muted-foreground text-sm", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
