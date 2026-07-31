import { AdminBlogManager } from "@/components/admin/admin-blog-manager";
import { AppPage } from "@/components/layout/app-page";

export default function AdminBlogPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Blog
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Create and publish posts for the blog.
        </p>
      </div>
      <AdminBlogManager />
    </AppPage>
  );
}
