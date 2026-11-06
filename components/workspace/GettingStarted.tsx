import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import DemoButton from "@/components/workspace/DemoButton";

export interface GettingStartedProps {
  /** Latest workspace, or null when none exist. */
  workspaceId: string | null;
  walked: boolean;
  predicted: boolean;
  startDemo: (prev: { error?: string } | null) => Promise<{ error?: string } | null>;
}

/**
 * Three-step first-run checklist. Stateless: every step is derived from data the
 * app already stores, so nothing is tracked and it disappears once all are done.
 */
export default function GettingStarted({
  workspaceId,
  walked,
  predicted,
  startDemo,
}: GettingStartedProps) {
  const steps = [
    {
      done: workspaceId !== null,
      title: "Add a project",
      body: "Import your own code, or try the bundled demo — no setup needed.",
      action:
        workspaceId === null ? (
          <div className="flex items-center gap-3">
            <DemoButton action={startDemo} />
            <Link
              href="/workspaces/import"
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              or import a project
            </Link>
          </div>
        ) : null,
    },
    {
      done: walked,
      title: "Follow one code path",
      body: "Open the walkthrough, read a step and its source, then mark it reviewed.",
      action:
        workspaceId && !walked ? (
          <Link
            href={`/workspaces/${workspaceId}/learning-map`}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Open the walkthrough
          </Link>
        ) : null,
    },
    {
      done: predicted,
      title: "Predict, then answer a question",
      body: "Say how well you expect to explain it before you peek. That gap is your accuracy.",
      action:
        workspaceId && !predicted ? (
          <Link
            href={`/workspaces/${workspaceId}/explain-back`}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Open the questions
          </Link>
        ) : null,
    },
  ];

  if (steps.every((s) => s.done)) return null;

  return (
    <section
      aria-label="Getting started"
      className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5"
    >
      <h2 className="text-sm font-semibold text-zinc-100 mb-3">Get started in a minute</h2>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <Circle size={16} className="text-zinc-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <p className={`text-sm ${step.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                {i + 1}. {step.title}
              </p>
              {!step.done && <p className="text-xs text-zinc-500">{step.body}</p>}
              {!step.done && step.action}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
