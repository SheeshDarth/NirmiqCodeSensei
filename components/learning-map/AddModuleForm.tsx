"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/learning-map/actions";

interface AddModuleFormProps {
  workspaceId: string;
  mapId: string;
  action: (
    workspaceId: string,
    mapId: string,
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
}

export default function AddModuleForm({
  workspaceId,
  mapId,
  action,
}: AddModuleFormProps) {
  const [open, setOpen] = useState(false);
  const boundAction = action.bind(null, workspaceId, mapId);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus size={14} />
          Add Module
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

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Authentication Layer"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Difficulty
            </label>
            <div className="flex gap-2">
              {(
                ["beginner", "intermediate", "advanced"] as const
              ).map((level) => (
                <label key={level} className="flex items-center gap-1.5 cursor-pointer">
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
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Summary{" "}
              <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <textarea
              name="summary"
              rows={2}
              placeholder="What does this module do?"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors"
            />
          </div>

          {/* Concepts */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Concepts{" "}
              <span className="text-zinc-600 font-normal">
                (comma-separated)
              </span>
            </label>
            <input
              name="concepts"
              placeholder="e.g. JWT, hashing, middleware"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          {/* Files */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
              Related Files{" "}
              <span className="text-zinc-600 font-normal">
                (comma-separated)
              </span>
            </label>
            <input
              name="files"
              placeholder="e.g. lib/auth.ts, app/api/login/route.ts"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-1.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            {isPending ? "Adding…" : "Add Module"}
          </button>
        </form>
      )}
    </div>
  );
}
