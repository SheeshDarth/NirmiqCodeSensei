"use client";

/**
 * Client-only loader for the knowledge graph.
 *
 * The graph pulls in heavy browser-only libraries (force-graph / 3d-force-graph
 * / three). Loading it with next/dynamic + ssr:false keeps those libs entirely
 * out of the server render and out of Next's static-path-generation worker —
 * without this isolation that worker crashes ("Jest worker child process
 * exceptions") on the dynamic /workspaces/[id]/learning-map route.
 */

import dynamic from "next/dynamic";
import { Network } from "lucide-react";
import type { KnowledgeGraphData } from "@/lib/services/knowledge-graph.service";

const KnowledgeGraph = dynamic(() => import("./KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-10 text-center">
      <Network size={18} className="text-zinc-600 mx-auto mb-2 animate-pulse" />
      <p className="text-xs text-zinc-500">Loading project map…</p>
    </div>
  ),
});

export default function KnowledgeGraphLoader({
  data,
}: {
  data: KnowledgeGraphData;
}) {
  return <KnowledgeGraph data={data} />;
}
