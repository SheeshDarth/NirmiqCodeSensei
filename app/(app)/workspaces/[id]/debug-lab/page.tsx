export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ArrowLeft, Bug, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getDebugLogsByWorkspaceId } from "@/lib/services/debug-log.service";
import { CreateDebugLogForm } from "@/components/debug-lab/CreateDebugLogForm";
import { DebugLogCard } from "@/components/debug-lab/DebugLogCard";
import { createDebugLogAction, updateDebugLogAction, deleteDebugLogAction } from "./actions";

export default async function DebugLabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wsResult, logsResult] = await Promise.all([
    getWorkspaceById(id),
    getDebugLogsByWorkspaceId(id),
  ]);

  if (!wsResult.ok) notFound();

  const ws = wsResult.data;
  const logs = logsResult.ok ? logsResult.data : [];

  const resolved = logs.filter(
    (l) => l.actualCause && l.fixSummary && l.lessonLearned
  ).length;
  const open = logs.length - resolved;

  // Bind workspace id into the create action
  const boundCreateAction = createDebugLogAction.bind(null, id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/workspaces/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {ws.title}
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bug size={16} className="text-amber-400" />
          <h1 className="text-lg font-semibold text-zinc-100">Debug Lab</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Every bug is a permanent lesson. Log it, resolve it, extract the rule.
        </p>
      </div>

      {/* Stats row */}
      {logs.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="bg-[#0d1117] border border-zinc-800 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-zinc-100">{logs.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Total Bugs</p>
          </div>
          <div className="bg-[#0d1117] border border-amber-900/40 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-amber-400">{open}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Still Open</p>
          </div>
          <div className="bg-[#0d1117] border border-emerald-900/40 rounded-lg px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-emerald-400">{resolved}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Resolved</p>
          </div>
        </div>
      )}

      {/* Create form */}
      <CreateDebugLogForm createAction={boundCreateAction} />

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 mb-4">
            <Bug size={20} className="text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">
            No bugs logged yet
          </h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            When you hit a bug, log it above. Record the error, find the cause,
            extract the lesson. Never pay for the same bug twice.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const boundUpdateAction = updateDebugLogAction.bind(null, id, log.id);
            const boundDeleteAction = deleteDebugLogAction.bind(null, id, log.id);
            return (
              <DebugLogCard
                key={log.id}
                log={log}
                updateAction={boundUpdateAction}
                deleteAction={boundDeleteAction}
              />
            );
          })}
        </div>
      )}

      {/* Lessons extracted */}
      {resolved > 0 && (
        <div className="bg-[#0d1117] border border-emerald-900/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Prevention Rules
            </h2>
          </div>
          <div className="space-y-2">
            {logs
              .filter((l) => l.preventionRule)
              .map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-2 text-xs text-zinc-400"
                >
                  <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                  <span>{l.preventionRule}</span>
                </div>
              ))}
            {logs.filter((l) => l.preventionRule).length === 0 && (
              <p className="text-xs text-zinc-600">
                Add prevention rules when resolving bugs to build your personal
                rulebook.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
