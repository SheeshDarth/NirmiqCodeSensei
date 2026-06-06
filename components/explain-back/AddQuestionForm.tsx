"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/explain-back/actions";

interface AddQuestionFormProps {
  workspaceId: string;
  action: (
    workspaceId: string,
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
}

export default function AddQuestionForm({
  workspaceId,
  action,
}: AddQuestionFormProps) {
  const [open, setOpen] = useState(false);
  const bound = action.bind(null, workspaceId);
  const [state, formAction, isPending] = useActionState(bound, null);

  return (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus size={14} />
          Add Question
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <form
          action={formAction}
          className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3"
        >
          {state?.error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {state.error}
            </p>
          )}

          {/* Question */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              name="question"
              required
              rows={2}
              placeholder="e.g. How does JWT authentication work in this project?"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Difficulty
            </label>
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map(
                (level) => (
                  <label key={level} className="cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      defaultChecked={level === "beginner"}
                      className="sr-only peer"
                    />
                    <span className="text-xs px-2 py-1 rounded border border-zinc-700 peer-checked:border-cyan-500 peer-checked:text-cyan-400 text-zinc-500 transition-colors cursor-pointer">
                      {level}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Expected points */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Key Points{" "}
              <span className="text-zinc-600 font-normal">
                (hidden from student until revealed)
              </span>
            </label>
            <textarea
              name="expectedPoints"
              rows={3}
              placeholder={`One point per line:\n- Tokens are signed with a secret key\n- Verification happens on every request`}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            {isPending ? "Adding…" : "Add Question"}
          </button>
        </form>
      )}
    </div>
  );
}
