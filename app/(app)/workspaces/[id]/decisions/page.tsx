export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, GitBranch, Lightbulb } from "lucide-react";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getDecisionRecordsByWorkspaceId } from "@/lib/services/decision.service";

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, decisions] = await Promise.all([
    getWorkspaceById(id),
    getDecisionRecordsByWorkspaceId(id),
  ]);
  if (!workspace.ok) notFound();
  const records = decisions.ok ? decisions.data : [];

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <Link href={`/workspaces/${id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft size={13} /> {workspace.data.title}
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Lightbulb size={16} className="text-amber-400" /><h1 className="text-lg font-semibold text-zinc-100">Implementation Decisions</h1></div>
          <p className="text-sm text-zinc-500">Chosen approaches, viable alternatives, rationale, trade-offs, and affected files.</p>
        </div>
        <a href={`/workspaces/${id}/decisions/export`} download className="inline-flex items-center gap-1.5 text-xs text-zinc-300 px-3 py-2 rounded-md border border-zinc-800 hover:border-zinc-600">
          <Download size={13} /> Export decision.md
        </a>
      </header>

      {records.length === 0 ? (
        <section className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-zinc-300">No decisions recorded yet.</p>
          <p className="text-xs text-zinc-500 mt-2">Ask your coding assistant to use <code className="text-cyan-300">ncs_record_decision</code> after a consequential implementation choice.</p>
        </section>
      ) : records.map((decision) => (
        <article key={decision.id} className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-sm font-semibold text-zinc-100">{decision.title}</h2>
            <time className="text-[11px] text-zinc-600 whitespace-nowrap">{new Date(decision.createdAt).toLocaleString()}</time>
          </div>
          <p className="text-xs text-zinc-300"><strong className="text-zinc-100">Chosen:</strong> {decision.chosenOption}</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{decision.rationale}</p>
          {decision.alternatives.length > 0 && <div><p className="text-[11px] uppercase tracking-wide text-zinc-600 mb-1">Alternatives</p><ul className="list-disc pl-5 text-xs text-zinc-400 space-y-1">{decision.alternatives.map((alternative) => <li key={alternative}>{alternative}</li>)}</ul></div>}
          {decision.acceptedTradeoff && <p className="text-xs text-amber-300/80"><strong>Accepted trade-off:</strong> {decision.acceptedTradeoff}</p>}
          {decision.affectedPaths.length > 0 && <p className="text-xs text-zinc-500"><GitBranch size={12} className="inline mr-1" />{decision.affectedPaths.join(" · ")}</p>}
        </article>
      ))}
    </main>
  );
}
