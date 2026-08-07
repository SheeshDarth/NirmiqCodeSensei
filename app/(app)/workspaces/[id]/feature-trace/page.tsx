export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Route, CornerDownRight, AlertTriangle } from "lucide-react";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getFeatureTracesByWorkspaceId } from "@/lib/services/learning-map.service";

// Layer accents mirror the graph's palette so a hop reads the same colour here
// as the node it corresponds to in the Learning Map.
const LAYER_COLOR: Record<string, string> = {
  "Routes & Pages": "text-cyan-400 border-cyan-900/40 bg-cyan-500/10",
  "Server Actions": "text-pink-400 border-pink-900/40 bg-pink-500/10",
  "API Endpoints": "text-sky-400 border-sky-900/40 bg-sky-500/10",
  "Services / Logic": "text-emerald-400 border-emerald-900/40 bg-emerald-500/10",
  "Data Layer": "text-amber-400 border-amber-900/40 bg-amber-500/10",
  "UI Components": "text-violet-400 border-violet-900/40 bg-violet-500/10",
};

function layerStyle(layer: string): string {
  return LAYER_COLOR[layer] ?? "text-zinc-400 border-zinc-800 bg-zinc-800/40";
}

export default async function FeatureTracePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wsResult, tracesResult] = await Promise.all([
    getWorkspaceById(id),
    getFeatureTracesByWorkspaceId(id),
  ]);

  if (!wsResult.ok) notFound();

  const ws = wsResult.data;
  const traces = tracesResult.ok ? tracesResult.data : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href={`/workspaces/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} />
        {ws.title}
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Route size={16} className="text-cyan-400" />
          <h1 className="text-lg font-semibold text-zinc-100">Feature Trace</h1>
        </div>
        <p className="text-sm text-zinc-500">
          A user clicks something — here is what actually runs, from the entry point down to
          the database. Every hop is a real file in your code.
        </p>
      </div>

      {traces.length === 0 ? (
        <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 mb-4">
            <Route size={20} className="text-cyan-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">No traces yet</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Traces are built from your import graph during analysis. Re-import or refresh this
            workspace to generate them — projects with no routed entry points (a library, for
            example) will not produce any.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {traces.map((trace) => (
            <div
              key={trace.id}
              className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-100">{trace.title}</h2>
                <p className="text-xs text-zinc-600 font-mono mt-0.5 truncate">
                  {trace.entry}
                </p>
              </div>

              <ol className="px-4 py-4 space-y-3">
                {trace.hops.map((hop, i) => (
                  <li key={`${trace.id}-${hop.file}-${i}`} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <span className="text-[10px] text-zinc-600 font-mono">{i + 1}</span>
                      {i < trace.hops.length - 1 && (
                        <CornerDownRight size={12} className="text-zinc-700 mt-1" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-300 truncate">
                          {hop.file}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${layerStyle(hop.layer)}`}
                        >
                          {hop.layer}
                        </span>
                      </div>

                      {hop.symbol && (
                        <p className="text-xs text-zinc-500 mt-1 font-mono">
                          {hop.symbol}
                          {hop.line ? `()  — line ${hop.line}` : "()"}
                        </p>
                      )}

                      {hop.concepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {hop.concepts.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {hop.risks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {hop.risks.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300"
                            >
                              <AlertTriangle size={9} />
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="px-4 py-2.5 border-t border-zinc-800 bg-black/20">
                <p className="text-xs text-zinc-500">
                  Ends at{" "}
                  <span className="font-mono text-zinc-400">{trace.terminal}</span> — if this
                  path breaks, everything above it stops working.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
