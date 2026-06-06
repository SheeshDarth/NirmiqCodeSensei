export const dynamic = "force-dynamic";

import { Bug, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { getAllDebugLogs } from "@/lib/services/debug-log.service";
import { listWorkspaces } from "@/lib/services/workspace.service";
import { formatDate } from "@/lib/utils";

export default async function GlobalDebugLabPage() {
  const [logsResult, wsResult] = await Promise.all([
    getAllDebugLogs(),
    listWorkspaces(),
  ]);

  const logs = logsResult.ok ? logsResult.data : [];
  const workspaces = wsResult.ok ? wsResult.data : [];

  const wsMap = new Map(workspaces.map((w) => [w.id, w]));

  const resolved = logs.filter(
    (l) => l.actualCause && l.fixSummary && l.lessonLearned
  ).length;
  const open = logs.length - resolved;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Debug Lab</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Every bug is a permanent lesson if you document it properly.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 mb-4">
            <Bug size={20} className="text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">
            No debug logs yet
          </h2>
          <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
            When you hit a bug, log it inside a workspace. Record the error, cause,
            fix, and lesson so it never costs you twice.
          </p>
          <Link
            href="/workspaces"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium px-4 py-2 rounded-md transition-colors"
          >
            Go to Workspaces
          </Link>
        </div>
      ) : (
        <>
          {/* Stats row */}
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

          {/* Log list */}
          <div className="space-y-2">
            {logs.map((log) => {
              const ws = wsMap.get(log.workspaceId);
              const isResolved = !!(
                log.actualCause &&
                log.fixSummary &&
                log.lessonLearned
              );
              return (
                <Link
                  key={log.id}
                  href={`/workspaces/${log.workspaceId}/debug-lab`}
                  className="group flex items-start gap-3 bg-[#0d1117] border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3 transition-colors block"
                >
                  {isResolved ? (
                    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm text-zinc-100 font-medium group-hover:text-white leading-snug">
                        {log.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {isResolved ? "resolved" : "open"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {ws && (
                        <span className="text-xs text-zinc-600 font-mono">
                          {ws.title}
                        </span>
                      )}
                      <span className="text-zinc-800">·</span>
                      <span className="text-xs text-zinc-700">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.lessonLearned && (
                      <p className="text-xs text-zinc-500 mt-1.5 line-clamp-1">
                        <span className="text-emerald-600">Lesson:</span>{" "}
                        {log.lessonLearned}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
