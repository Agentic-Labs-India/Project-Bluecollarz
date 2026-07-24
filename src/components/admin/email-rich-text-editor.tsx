"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { toast } from "sonner";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  ListOrderedIcon,
  Heading2Icon,
  QuoteIcon,
  LinkIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeEmailComposeHtml } from "@/lib/admin/email-html";
import { uploadBlob } from "@/lib/blob/upload";
import { cn } from "@/lib/utils";

function isEditorAlive(editor: Editor | null): editor is Editor {
  if (!editor || editor.isDestroyed) return false;
  try {
    return Boolean(editor.view);
  } catch {
    return false;
  }
}

function ToolbarButton({
  onClick,
  active,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(active && "bg-muted")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function EmailRichTextEditor({
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
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-sm",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write your message…",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id: id || "email-rich-text-editor",
        class:
          "prose-job min-h-48 max-w-none px-3 py-2 text-sm leading-relaxed outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!isEditorAlive(ed)) return;
      onChange(sanitizeEmailComposeHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!isEditorAlive(editor)) return;
    try {
      const current = editor.getHTML();
      const next = value || "";
      if (
        sanitizeEmailComposeHtml(current) === sanitizeEmailComposeHtml(next)
      ) {
        return;
      }
      editor.commands.setContent(next || "", { emitUpdate: false });
    } catch {
      // Editor may be torn down mid-unmount.
    }
  }, [editor, value]);

  if (!isEditorAlive(editor)) {
    return (
      <div
        className={cn(
          "border-input bg-background min-h-56 rounded-none border",
          className,
        )}
      />
    );
  }

  const setLink = () => {
    if (!isEditorAlive(editor)) return;
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

  const insertImage = async (file: File) => {
    if (!isEditorAlive(editor) || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const { url } = await uploadBlob({
        file,
        pathname: `admin/email/${Date.now()}-${safeName}`,
        contentType: file.type || "image/png",
      });
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (error) {
      console.error("email image upload:", error);
      toast.error("Could not upload image");
    } finally {
      uploadingRef.current = false;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "border-input bg-background overflow-hidden rounded-none border",
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
        <ToolbarButton
          label="Insert image"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="size-3.5" />
        </ToolbarButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void insertImage(file);
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
