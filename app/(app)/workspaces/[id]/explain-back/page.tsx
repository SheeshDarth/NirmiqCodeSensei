import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getQuestionsByWorkspaceId } from "@/lib/services/explain-back.service";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import QuestionCard from "@/components/explain-back/QuestionCard";
import AddQuestionForm from "@/components/explain-back/AddQuestionForm";
import {
  addQuestionAction,
  submitAnswerAction,
  deleteQuestionAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function WorkspaceExplainBackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = await params;

  const [wsResult, questionsResult] = await Promise.all([
    getWorkspaceById(workspaceId),
    getQuestionsByWorkspaceId(workspaceId),
  ]);

  if (!wsResult.ok) notFound();

  const workspace = wsResult.data;
  const questions = questionsResult.ok ? questionsResult.data : [];

  const answered = questions.filter((q) => q.userAnswer).length;
  const weak = questions.filter(
    (q) => q.confidence === "red" || !q.confidence
  ).length;
  const confident = questions.filter((q) => q.confidence === "green").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {workspace.title}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Explain-Back</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Do not paste AI answers. Explain it like you are in a viva.
        </p>
      </div>

      {/* Stats row */}
      {questions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{questions.length}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Total</p>
          </div>
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{confident}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Confident</p>
          </div>
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{weak}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Weak / Unseen</p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-8 text-center">
            <p className="text-sm font-medium text-zinc-100 mb-1">
              No questions yet
            </p>
            <p className="text-xs text-zinc-500">
              Add questions to test your understanding of this workspace.
            </p>
          </div>
        ) : (
          questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              workspaceId={workspaceId}
              submitAction={submitAnswerAction}
              deleteAction={deleteQuestionAction}
            />
          ))
        )}

        <AddQuestionForm
          workspaceId={workspaceId}
          action={addQuestionAction}
        />
      </div>

      {/* Progress note */}
      {questions.length > 0 && answered < questions.length && (
        <p className="text-xs text-zinc-600 text-center">
          {questions.length - answered} question
          {questions.length - answered === 1 ? "" : "s"} still unanswered.
        </p>
      )}
    </div>
  );
}
