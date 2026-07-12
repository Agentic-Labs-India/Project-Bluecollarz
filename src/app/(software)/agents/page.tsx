import { Button } from "@/components/ui/button";
import { BotIcon, SparklesIcon } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-10">
      <h1 className="text-foreground mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
        AI Agents workspace
      </h1>
      <p className="text-muted-foreground mb-10 max-w-2xl text-sm leading-relaxed md:text-base">
        Orchestrate agents, monitor runs, and ship automations from the Agents
        profile — a dedicated layout from Work and Hire.
      </p>

      <section className="border-border bg-card max-w-lg rounded-none border p-6 shadow-sm">
        <BotIcon className="text-primary mb-3 size-5" />
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Agent console
        </h2>
        <p className="text-muted-foreground mb-5 text-sm">
          Launch and manage agent workflows from one place.
        </p>
        <Button className="rounded-full">
          <SparklesIcon className="size-4" />
          New agent run
        </Button>
      </section>
    </div>
  );
}
