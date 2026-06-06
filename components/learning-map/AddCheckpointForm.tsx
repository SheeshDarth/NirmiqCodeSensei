"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/learning-map/actions";

interface AddCheckpointFormProps {
  workspaceId: string;
  mapId: string;
  action: (
    workspaceId: string,
    mapId: string,
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
}

export default function AddCheckpointForm({
  workspaceId,
  mapId,
  action,
}: AddCheckpointFormProps) {
  const boundAction = action.bind(null, workspaceId, mapId);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="flex gap-2 items-start">
      <div className="flex-1 space-y-1">
        {state?.error && (
          <p className="text-xs text-red-400">{state.error}</p>
        )}
        <input
          name="question"
          required
          placeholder="e.g. Explain how JWT tokens are verified"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-xs font-medium px-3 py-2 rounded-md transition-colors shrink-0"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
