"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  ListOrderedIcon,
  Heading2Icon,
  QuoteIcon,
  LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-muted")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder:
          placeholder || "Describe the role, expectations, and ideal profile…",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id: id || "rich-text-editor",
        class:
          "prose-job min-h-40 max-w-none px-3 py-2 text-sm leading-relaxed outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeRichTextHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (sanitizeRichTextHtml(current) === sanitizeRichTextHtml(next)) return;
    editor.commands.setContent(next || "", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn(
          "border-input bg-background min-h-48 rounded-lg border",
          className,
        )}
      />
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div
      className={cn(
        "border-input bg-background overflow-hidden rounded-lg border",
        className,
      )}
    >
      <div className="border-border flex flex-wrap gap-0.5 border-b px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2Icon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
