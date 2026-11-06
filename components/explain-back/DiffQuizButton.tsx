"use client";

import { useActionState } from "react";
import { GitBranch } from "lucide-react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/explain-back/actions";

interface Props {
  workspaceId: string;
  action: (workspaceId: string, prev: ActionState) => Promise<ActionState>;
}

/** One click: turn the project's latest code changes into explain-back questions. */
export default function DiffQuizButton({ workspaceId, action }: Props) {
  const [state, formAction, isPending] = useActionState(
    action.bind(null, workspaceId),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 bg-[#0d1117] hover:border-cyan-500/60 disabled:opacity-50 border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-2 rounded-md transition-colors"
      >
        <GitBranch size={13} />
        {isPending ? "Reading your changes…" : "Quiz me on my latest changes"}
      </button>
      {state?.message && (
        <p role="status" className="text-xs text-emerald-400">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
