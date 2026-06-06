"use client";

import { useActionState, useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  createAction: (
    _prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
};

export function CreateDebugLogForm({ createAction }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAction, null);

  return (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/40 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Plus size={14} className="text-amber-400" />
          Log a Bug
        </span>
        {open ? (
          <ChevronUp size={14} className="text-zinc-600" />
        ) : (
          <ChevronDown size={14} className="text-zinc-600" />
        )}
      </button>

      {open && (
        <form action={formAction} className="px-5 pb-5 space-y-4 border-t border-zinc-800">
          <div className="pt-4">
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
              Bug Title <span className="text-amber-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="e.g. JWT token not refreshing on expiry"
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
              Error Message{" "}
              <span className="text-zinc-600">(paste the exact error)</span>
            </label>
            <textarea
              name="errorMessage"
              rows={3}
              placeholder="TypeError: Cannot read properties of undefined..."
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600 resize-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
              Suspected Cause{" "}
              <span className="text-zinc-600">(what do you think went wrong?)</span>
            </label>
            <textarea
              name="suspectedCause"
              rows={2}
              placeholder="Probably a race condition in the useEffect cleanup..."
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {state?.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {pending ? "Saving…" : "Log Bug"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
