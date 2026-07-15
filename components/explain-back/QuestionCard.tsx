"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Eye } from "lucide-react";
import type { ActionState } from "@/app/(app)/workspaces/[id]/explain-back/actions";
import type { Question } from "@/lib/services/explain-back.service";
import { parseExpectedPoints } from "@/lib/utils";

const DIFFICULTY_COLOR = {
  beginner: "text-emerald-400 bg-emerald-500/10",
  intermediate: "text-amber-400 bg-amber-500/10",
  advanced: "text-red-400 bg-red-500/10",
} as const;

const CONFIDENCE_META = {
  red: {
    label: "Cannot explain",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  yellow: {
    label: "Partial",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  green: {
    label: "Confident",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
} as const;

interface QuestionCardProps {
  question: Question;
  workspaceId: string;
  submitAction: (
    workspaceId: string,
    questionId: string,
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
}

export default function QuestionCard({
  question,
  workspaceId,
  submitAction,
  deleteAction,
}: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const boundSubmit = submitAction.bind(null, workspaceId, question.id);
  const [state, formAction, isPending] = useActionState(boundSubmit, null);

  const expectedPoints = parseExpectedPoints(question.expectedPointsJson);
  const hasAnswer = !!question.userAnswer;
  const confidence = question.confidence as keyof typeof CONFIDENCE_META | null;

  return (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                DIFFICULTY_COLOR[question.difficulty as keyof typeof DIFFICULTY_COLOR]
              }`}
            >
              {question.difficulty}
            </span>
            {confidence && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded border ${CONFIDENCE_META[confidence].color}`}
              >
                {CONFIDENCE_META[confidence].label}
              </span>
            )}
            {!hasAnswer && (
              <span className="text-xs text-zinc-600">unanswered</span>
            )}
          </div>
          <p className="text-sm text-zinc-100 leading-relaxed">
            {question.question}
          </p>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="questionId" value={question.id} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <button
              type="submit"
              title="Delete question"
              aria-label="Delete question"
              className="text-zinc-700 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Expanded answer form */}
      {open && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          <p className="text-xs text-zinc-500 italic">
            Do not paste AI answers. Explain it like you are in a viva.
          </p>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {state.error}
              </p>
            )}

            {/* Answer textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                Your Answer
              </label>
              <textarea
                name="userAnswer"
                rows={5}
                defaultValue={question.userAnswer ?? ""}
                placeholder="Explain in your own words, as if you were speaking in a viva…"
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-cyan-500 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-y transition-colors"
              />
            </div>

            {/* Reveal expected points */}
            {expectedPoints.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setRevealed((r) => !r)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Eye size={13} />
                  {revealed ? "Hide key points" : "Reveal key points"}
                </button>
                {revealed && (
                  <ul className="mt-2 space-y-1 pl-3 border-l border-zinc-700">
                    {expectedPoints.map((pt, i) => (
                      <li key={i} className="text-xs text-zinc-400">
                        {pt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Confidence picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                How well did you explain it?{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {(["red", "yellow", "green"] as const).map((level) => {
                  const meta = CONFIDENCE_META[level];
                  return (
                    <label key={level} className="cursor-pointer">
                      <input
                        type="radio"
                        name="confidence"
                        value={level}
                        required
                        defaultChecked={question.confidence === level}
                        className="sr-only peer"
                      />
                      <span
                        className={`text-xs px-3 py-1.5 rounded border transition-colors cursor-pointer peer-checked:${meta.color} border-zinc-700 text-zinc-500 hover:border-zinc-500`}
                      >
                        {meta.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded-md transition-colors"
            >
              {isPending ? "Saving…" : hasAnswer ? "Update Answer" : "Submit Answer"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
