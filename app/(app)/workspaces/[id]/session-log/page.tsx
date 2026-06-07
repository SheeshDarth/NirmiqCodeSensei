export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ArrowLeft, Activity, Terminal, FileEdit, GitCommit, Package } from "lucide-react";
import Link from "next/link";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getSessionLogsByWorkspaceId } from "@/lib/services/session-log.service";

const RISK_STYLE = {
  safe:    { dot: "bg-emerald-500", text: "text-emerald-400", label: "Safe" },
  caution: { dot: "bg-amber-500",   text: "text-amber-400",   label: "Caution" },
  risky:   { dot: "bg-red-500",     text: "text-red-400",     label: "Risky" },
};

const TOOL_ICON: Record<string, React.ReactNode> = {
  Bash:      <Terminal size={13} className="text-cyan-400" />,
  Write:     <FileEdit size={13} className="text-violet-400" />,
  Edit:      <FileEdit size={13} className="text-violet-400" />,
  MultiEdit: <FileEdit size={13} className="text-violet-400" />,
  Commit:    <GitCommit size={13} className="text-emerald-400" />,
  Install:   <Package size={13} className="text-amber-400" />,
};

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SessionLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wsResult, logsResult] = await Promise.all([
    getWorkspaceById(id),
    getSessionLogsByWorkspaceId(id, 100),
  ]);

  if (!wsResult.ok) notFound();

  const ws = wsResult.data;
  const logs = logsResult.ok ? logsResult.data : [];

  const risky  = logs.filter(l => l.riskLevel === "risky").length;
  const caution = logs.filter(l => l.riskLevel === "caution").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/workspaces/${ws.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {ws.title}
      </Link>

      {/* Header */}
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={15} className="text-cyan-400" />
          <h1 className="text-base font-semibold text-zinc-100">Session Log</h1>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Every command and action your AI assistant ran — explained in plain English.
          Generated automatically via Claude Code hooks.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{logs.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">total actions</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{caution}</p>
            <p className="text-xs text-zinc-500 mt-0.5">caution flags</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{risky}</p>
            <p className="text-xs text-zinc-500 mt-0.5">risky commands</p>
          </div>
        </div>
      </div>

      {/* Setup notice if empty */}
      {logs.length === 0 && (
        <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-6 text-center">
          <Activity size={28} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-300 mb-1">No session logs yet</p>
          <p className="text-xs text-zinc-500 mb-4 max-w-md mx-auto">
            Install the vibe coding companion hook in your project to start
            capturing real-time explanations of every command Claude Code runs.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-left max-w-md mx-auto">
            <p className="text-xs text-zinc-400 font-medium mb-1.5">
              Run this from your project directory:
            </p>
            <code className="text-xs text-cyan-300 font-mono block">
              node /path/to/NirmiqLearnOS/hooks/install-hooks.mjs
            </code>
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Or ask Claude Code: &ldquo;use nirmiq_explain_command to explain your next command&rdquo;
          </p>
        </div>
      )}

      {/* Log entries */}
      {logs.length > 0 && (
        <div className="space-y-1">
          {logs.map((entry, i) => {
            const risk = RISK_STYLE[entry.riskLevel];
            const icon = TOOL_ICON[entry.toolName] ?? <Terminal size={13} className="text-zinc-500" />;
            const showDate =
              i === 0 ||
              formatDate(logs[i - 1].createdAt) !== formatDate(entry.createdAt);

            return (
              <div key={entry.id}>
                {showDate && (
                  <p className="text-xs text-zinc-600 font-mono px-1 py-2">
                    {formatDate(entry.createdAt)}
                  </p>
                )}
                <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {icon}
                      <code className="text-xs text-zinc-300 font-mono truncate max-w-[360px]">
                        {entry.actionSummary}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                        <span className={`text-xs ${risk.text}`}>{risk.label}</span>
                      </div>
                      <span className="text-xs text-zinc-700 font-mono">
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {entry.explanation}
                  </p>

                  {entry.outcome && (
                    <p className="text-xs text-zinc-600 mt-1.5 border-t border-zinc-800 pt-1.5">
                      Outcome: {entry.outcome}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
