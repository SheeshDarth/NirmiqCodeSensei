"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/learning-map/actions";

interface CreateMapFormProps {
  workspaceId: string;
  action: (
    workspaceId: string,
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
}

export default function CreateMapForm({
  workspaceId,
  action,
}: CreateMapFormProps) {
  const boundAction = action.bind(null, workspaceId);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <label
          htmlFor="map-title"
          className="block text-xs font-medium text-zinc-300"
        >
          Map Title <span className="text-red-500">*</span>
        </label>
        <input
          id="map-title"
          name="title"
          type="text"
          required
          placeholder="e.g. NirmiqCodeSensei Architecture Map"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="map-summary"
          className="block text-xs font-medium text-zinc-300"
        >
          Summary{" "}
          <span className="text-zinc-600 font-normal">(optional)</span>
        </label>
        <textarea
          id="map-summary"
          name="summary"
          rows={2}
          placeholder="What does this map cover?"
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold px-5 py-2 rounded-md transition-colors"
      >
        {isPending ? "Creating…" : "Create Learning Map"}
      </button>
    </form>
  );
}
