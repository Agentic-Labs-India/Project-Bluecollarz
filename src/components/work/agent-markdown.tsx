"use client";

import { memo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const remarkPlugins = [remarkGfm];

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[15px] leading-[1.65] text-foreground last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 text-[15px] leading-[1.65] text-foreground marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 text-[15px] leading-[1.65] text-foreground marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 text-[15px] leading-[1.65] text-foreground/90">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary font-medium underline underline-offset-2 decoration-primary/50 hover:decoration-primary"
      target="_blank"
      rel="nofollow noreferrer noopener"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
  del: ({ children }) => (
    <del className="text-muted-foreground line-through">{children}</del>
  ),
  table: ({ children }) => (
    <div className="mb-3 max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/80 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-foreground">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 max-h-[min(24rem,50vh)] overflow-auto rounded-lg border border-border bg-muted/60 p-3 text-[13px] leading-relaxed dark:bg-muted/40">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.startsWith("language-"));
    if (isBlock) {
      return (
        <code
          className={cn(
            "block font-mono text-[13px] text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.88em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  input: ({ type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-2 align-middle"
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
};

export const AgentMarkdown = memo(function AgentMarkdown({
  source,
}: {
  source: string;
}) {
  return (
    <div className="min-w-0">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});
