import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <div className="bg-muted/20 flex min-h-svh">
        <aside className="border-border hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
          <div className="border-border border-b px-5 py-6">
            <Link href="/agents" className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Gulf Path" width={28} height={28} />
              <div>
                <p className="text-primary text-xs font-semibold uppercase">
                  Agents
                </p>
                <p className="text-foreground text-sm font-semibold">Workspace</p>
              </div>
            </Link>
          </div>
          <nav className="flex flex-col gap-1 p-4 text-sm">
            <Link
              href="/agents"
              className="bg-primary/10 text-primary rounded-lg px-3 py-2 font-medium"
            >
              Overview
            </Link>
            <span className="text-muted-foreground rounded-lg px-3 py-2">
              Pipelines (soon)
            </span>
            <span className="text-muted-foreground rounded-lg px-3 py-2">
              Deployments (soon)
            </span>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border flex h-14 items-center border-b px-6 md:hidden">
            <p className="text-foreground text-sm font-semibold">Agents</p>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </Suspense>
  );
}
