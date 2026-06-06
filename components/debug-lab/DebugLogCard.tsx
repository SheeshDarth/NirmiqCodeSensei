"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { DebugLog } from "@/lib/services/debug-log.service";
import { formatDate } from "@/lib/utils";

type Props = {
  log: DebugLog;
  updateAction: (
    _prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
  deleteAction: () => Promise<void>;
};

function isResolved(log: DebugLog): boolean {
  return !!(log.actualCause && log.fixSummary && log.lessonLearned);
}

export function DebugLogCard({ log, updateAction, deleteAction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateAction, null);
  const resolved = isResolved(log);

  return (
    <div
      className={`bg-[#0d1117] border rounded-lg overflow-hidden transition-colors ${
        resolved ? "border-emerald-900/60" : "border-zinc-800"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {resolved ? (
            <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <Circle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
              {log.title}
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">{formatDate(log.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              resolved
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {resolved ? "resolved" : "open"}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
          {/* Error message */}
          {log.errorMessage && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                Error Message
              </p>
              <pre className="text-xs text-red-300/80 bg-red-500/5 border border-red-900/20 px-3 py-2 rounded whitespace-pre-wrap font-mono leading-relaxed">
                {log.errorMessage}
              </pre>
            </div>
          )}

          {/* Suspected cause */}
          {log.suspectedCause && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                Suspected Cause
              </p>
              <p className="text-sm text-zinc-300">{log.suspectedCause}</p>
            </div>
          )}

          {/* Resolution block — shown only if resolved */}
          {resolved && (
            <div className="space-y-3">
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                  Actual Cause
                </p>
                <p className="text-sm text-zinc-300">{log.actualCause}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                  Fix Summary
                </p>
                <p className="text-sm text-zinc-300">{log.fixSummary}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                  Lesson Learned
                </p>
                <p className="text-sm text-zinc-200 font-medium">{log.lessonLearned}</p>
              </div>
              {log.preventionRule && (
                <div className="bg-emerald-500/5 border border-emerald-900/30 rounded px-3 py-2">
                  <p className="text-xs text-emerald-500 uppercase tracking-wide font-medium mb-1">
                    Prevention Rule
                  </p>
                  <p className="text-sm text-emerald-300">{log.preventionRule}</p>
                </div>
              )}
            </div>
          )}

          {/* Resolve / update form */}
          {!editOpen && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded transition-colors"
              >
                {resolved ? "Edit Resolution" : "Add Resolution →"}
              </button>
              <form action={deleteAction}>
                <button
                  type="submit"
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1.5 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </form>
            </div>
          )}

          {/* Resolution inline form */}
          {editOpen && (
            <form action={formAction} className="space-y-3 border-t border-zinc-800 pt-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Actual Cause <span className="text-amber-500">*</span>
                </label>
                <textarea
                  name="actualCause"
                  rows={2}
                  defaultValue={log.actualCause ?? ""}
                  placeholder="What actually caused this bug?"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Fix Summary <span className="text-amber-500">*</span>
                </label>
                <textarea
                  name="fixSummary"
                  rows={2}
                  defaultValue={log.fixSummary ?? ""}
                  placeholder="What did you change to fix it?"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Lesson Learned <span className="text-amber-500">*</span>
                </label>
                <textarea
                  name="lessonLearned"
                  rows={2}
                  defaultValue={log.lessonLearned ?? ""}
                  placeholder="What rule or concept should you remember?"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">
                  Prevention Rule{" "}
                  <span className="text-zinc-600">(optional — one-liner)</span>
                </label>
                <input
                  name="preventionRule"
                  defaultValue={log.preventionRule ?? ""}
                  placeholder="Always validate JWT expiry before every protected route"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-md focus:outline-none focus:border-zinc-600"
                />
              </div>

              {state?.error && (
                <p className="text-xs text-red-400">{state.error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save Resolution"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
