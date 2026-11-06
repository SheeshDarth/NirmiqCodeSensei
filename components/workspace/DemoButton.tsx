"use client";

import { useActionState } from "react";
import { Loader2, Play } from "lucide-react";

interface Props {
  action: (prev: { error?: string } | null) => Promise<{ error?: string } | null>;
  /** "primary" for empty states, "quiet" for secondary placements. */
  variant?: "primary" | "quiet";
}

/** Create or reopen the bundled demo project — no repo or API key needed. */
export default function DemoButton({ action, variant = "primary" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="inline-block">
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "primary"
            ? "inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
            : "inline-flex items-center gap-1.5 border border-zinc-700 hover:border-violet-500/60 disabled:opacity-60 text-zinc-200 text-xs font-medium px-3 py-2 rounded-md transition-colors"
        }
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        {pending ? "Preparing the demo…" : "Try the demo"}
      </button>
      {state?.error && (
        <p role="alert" className="text-xs text-red-400 mt-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
