"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ExternalLinkIcon,
  ImageIcon,
  PenSquareIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { blobFileUrl } from "@/lib/blob/pathname";
import { uploadBlob } from "@/lib/blob/client/upload";
import type { BlogDetail, BlogListItem, BlogStatus } from "@/lib/blog/types";
import {
  BLOG_STATUSES,
  scoreSeoTitle,
  slugifyBlogTitle,
} from "@/lib/blog/types";
import { formatDateTimeShort } from "@/lib/core/dates";
import { htmlToPlainText } from "@/lib/core/rich-text";
import { cn } from "@/lib/utils";

function label(status: string) {
  return status.replace(/_/g, " ");
}

function SeoTitleScoreBadge({ title }: { title: string }) {
  const score = scoreSeoTitle(title);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            score.level === "excellent" &&
              "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
            score.level === "good" &&
              "bg-amber-500/15 text-amber-800 dark:text-amber-400",
            score.level === "bad" &&
              "bg-red-500/15 text-red-700 dark:text-red-400",
          )}
        >
          SEO · {score.label}
        </span>
        <span className="text-mute text-xs tabular-nums">
          {score.length} / 60 chars
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{score.hint}</p>
    </div>
  );
}

type EditorState = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
  coverImageUrl: string | null;
  status: BlogStatus;
};

const emptyEditor = (): EditorState => ({
  id: null,
  title: "",
  slug: "",
  excerpt: "",
  seoTitle: "",
  seoDescription: "",
  content: "",
  coverImageUrl: null,
  status: "draft",
});

const COVER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const COVER_MAX_BYTES = 5 * 1024 * 1024;

export function AdminBlogManager() {
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: "50" });
      const res = await fetch(`/api/admin/blog?${params}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: BlogListItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Could not load posts");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      toast.error("Could not load posts");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditor(emptyEditor());
    setOpen(true);
  }

  async function openEdit(item: BlogListItem) {
    setOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/${item.id}`);
      const json = (await res.json().catch(() => ({}))) as {
        post?: BlogDetail;
        error?: string;
      };
      if (!res.ok || !json.post) {
        toast.error(json.error || "Could not open post");
        setOpen(false);
        return;
      }
      const post = json.post;
      setEditor({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        status: post.status,
      });
    } catch {
      toast.error("Could not open post");
      setOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function save() {
    if (!editor.title.trim() || htmlToPlainText(editor.content).length < 10) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editor.title.trim(),
        excerpt: editor.excerpt.trim() || undefined,
        seoTitle: editor.seoTitle.trim() || undefined,
        seoDescription: editor.seoDescription.trim() || undefined,
        content: editor.content,
        status: editor.status,
        coverImageUrl: editor.coverImageUrl,
      };
      const res = await fetch("/api/admin/blog", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editor.id ? { id: editor.id, ...payload } : payload,
        ),
      });
      const json = (await res.json().catch(() => ({}))) as {
        post?: BlogDetail;
        error?: string;
      };
      if (!res.ok || !json.post) {
        toast.error(json.error || "Could not save post");
        return;
      }
      toast.success(editor.id ? "Post updated" : "Post created");
      setOpen(false);
      await load();
    } catch {
      toast.error("Could not save post");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      const res = await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not delete");
        return;
      }
      toast.success("Post deleted");
      if (editor.id === id) setOpen(false);
      await load();
    } catch {
      toast.error("Could not delete");
    }
  }

  async function uploadCover(file: File) {
    if (!COVER_TYPES.has(file.type)) {
      toast.error("Use JPEG, PNG, WebP, or GIF");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      toast.error("Cover image must be under 5 MB");
      return;
    }
    setUploadingCover(true);
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 80);
      const { url } = await uploadBlob({
        file,
        pathname: `admin/blog/${Date.now()}-${safeName}`,
        contentType: file.type || "image/jpeg",
      });
      setEditor((prev) => ({ ...prev, coverImageUrl: url }));
      toast.success("Cover image uploaded");
    } catch (error) {
      console.error("blog cover upload:", error);
      toast.error("Could not upload cover image");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  const columns: ColumnDef<BlogListItem>[] = useMemo(
    () => [
      {
        id: "search",
        accessorFn: (row) => `${row.title} ${row.slug} ${row.excerpt}`,
        header: "Post",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[280px]">
            <p className="text-foreground truncate text-sm font-medium">
              {row.original.title}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
              /blog/{row.original.slug}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-sm capitalize",
              row.original.status === "published"
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {label(row.original.status)}
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
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open blog post"
              asChild
            >
              <a
                href={`/blog/${row.original.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit"
              onClick={(e) => {
                e.stopPropagation();
                void openEdit(row.original);
              }}
            >
              <PenSquareIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                void remove(row.original.id);
              }}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const editingId = editor.id;

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="search"
        searchPlaceholder="Search posts…"
        hideColumns
        onRowClick={(row) => void openEdit(row)}
        leftActions={
          <Button type="button" onClick={openCreate}>
            <PenSquareIcon className="size-4" />
            New post
          </Button>
        }
        rightActions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {BLOG_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {label(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setEditor(emptyEditor());
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-4xl!"
        >
          <SheetHeader className="border-border border-b pb-4">
            <SheetTitle>{editor.id ? "Edit post" : "New post"}</SheetTitle>
            <SheetDescription>
              Publish when ready — published posts appear on /blog and in the
              sitemap.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="blog-title">Title</Label>
                    <Input
                      id="blog-title"
                      value={editor.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setEditor((prev) => ({
                          ...prev,
                          title,
                          slug: slugifyBlogTitle(title),
                        }));
                      }}
                      placeholder="Post title"
                      maxLength={120}
                    />
                    <SeoTitleScoreBadge title={editor.title} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blog-slug">URL slug</Label>
                    <Input
                      id="blog-slug"
                      value={editor.slug || slugifyBlogTitle(editor.title)}
                      readOnly
                      disabled
                      placeholder="derived-from-title"
                    />
                    <p className="text-mute text-xs">
                      Derived from the title. If that slug already exists, we
                      append -1, -2, …
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editor.status}
                      onValueChange={(value) =>
                        setEditor((prev) => ({
                          ...prev,
                          status: value as BlogStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOG_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {label(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Cover image (Open Graph)</Label>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCover(file);
                      }}
                    />
                    {editor.coverImageUrl ? (
                      <div className="border-border space-y-3 border p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blobFileUrl(editor.coverImageUrl)}
                          alt="Cover preview"
                          className="max-h-48 w-full object-cover"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingCover}
                            onClick={() => coverInputRef.current?.click()}
                          >
                            <ImageIcon className="size-4" />
                            Replace
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingCover}
                            onClick={() =>
                              setEditor((prev) => ({
                                ...prev,
                                coverImageUrl: null,
                              }))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <ImageIcon className="size-4" />
                        {uploadingCover ? "Uploading…" : "Upload cover image"}
                      </Button>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Used as the social preview image. Replacing or deleting
                      the post removes the previous file from storage.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="blog-excerpt">Excerpt</Label>
                    <Input
                      id="blog-excerpt"
                      value={editor.excerpt}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          excerpt: e.target.value,
                        }))
                      }
                      placeholder="Short summary (optional — auto from body)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blog-seo-title">SEO title</Label>
                    <Input
                      id="blog-seo-title"
                      value={editor.seoTitle}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          seoTitle: e.target.value,
                        }))
                      }
                      placeholder="Defaults to post title"
                      maxLength={120}
                    />
                    <SeoTitleScoreBadge
                      title={editor.seoTitle.trim() || editor.title}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blog-seo-desc">SEO description</Label>
                    <Input
                      id="blog-seo-desc"
                      value={editor.seoDescription}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          seoDescription: e.target.value,
                        }))
                      }
                      placeholder="Defaults to excerpt"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <RichTextEditor
                    value={editor.content}
                    onChange={(content) =>
                      setEditor((prev) => ({ ...prev, content }))
                    }
                    placeholder="Write the post…"
                    className="min-h-64"
                  />
                </div>
              </>
            )}
          </div>

          <SheetFooter className="border-border shrink-0 border-t">
            <div className="flex w-full gap-2">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex-1"
                  disabled={saving}
                  onClick={() => void remove(editingId)}
                >
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                className="w-full flex-1"
                disabled={saving || detailLoading}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
