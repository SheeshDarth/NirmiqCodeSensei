import { getAllQuestions } from "@/lib/services/explain-back.service";
import { listWorkspaces } from "@/lib/services/workspace.service";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CONFIDENCE_COLOR = {
  red: "text-red-400 bg-red-500/10",
  yellow: "text-amber-400 bg-amber-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
} as const;

const DIFFICULTY_COLOR = {
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-red-400",
} as const;

export default async function ExplainBackPage() {
  const [questionsResult, workspacesResult] = await Promise.all([
    getAllQuestions(),
    listWorkspaces(),
  ]);

  const allQuestions = questionsResult.ok ? questionsResult.data : [];
  const workspaceMap = Object.fromEntries(
    (workspacesResult.ok ? workspacesResult.data : []).map((w) => [w.id, w])
  );

  const weak = allQuestions.filter(
    (q) => q.confidence === "red" || !q.confidence
  );
  const confident = allQuestions.filter((q) => q.confidence === "green");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Explain-Back</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          All questions across your workspaces. Your project is not mastered
          until every answer is green.
        </p>
      </div>

      {/* Summary stats */}
      {allQuestions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">
              {allQuestions.length}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">Total</p>
          </div>
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {confident.length}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">Confident</p>
          </div>
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{weak.length}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Weak / Unseen</p>
          </div>
        </div>
      )}

      {/* Question list */}
      {allQuestions.length === 0 ? (
        <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 mb-4">
            <MessageSquare size={20} className="text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">
            No questions yet
          </h2>
          <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
            Explain-back questions are added from within a workspace. Open a
            workspace and start adding questions.
          </p>
          <Link
            href="/workspaces"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium px-4 py-2 rounded-md transition-colors"
          >
            Go to Workspaces
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {allQuestions.map((q) => {
            const ws = workspaceMap[q.workspaceId];
            return (
              <Link
                key={q.id}
                href={`/workspaces/${q.workspaceId}/explain-back`}
                className="flex items-start gap-3 bg-[#0d1117] border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 leading-relaxed group-hover:text-white line-clamp-2">
                    {q.question}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ws && (
                      <span className="text-xs text-zinc-600">{ws.title}</span>
                    )}
                    <span
                      className={`text-xs ${
                        DIFFICULTY_COLOR[
                          q.difficulty as keyof typeof DIFFICULTY_COLOR
                        ]
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {q.confidence ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        CONFIDENCE_COLOR[
                          q.confidence as keyof typeof CONFIDENCE_COLOR
                        ]
                      }`}
                    >
                      {q.confidence === "green"
                        ? "Confident"
                        : q.confidence === "yellow"
                        ? "Partial"
                        : "Weak"}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">unanswered</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
