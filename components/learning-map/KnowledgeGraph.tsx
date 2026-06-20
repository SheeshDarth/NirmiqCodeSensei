"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Network, X } from "lucide-react";
import type {
  KnowledgeGraphData,
  GraphNode,
  GraphNodeType,
} from "@/lib/services/knowledge-graph.service";

const TYPE_COLOR: Record<GraphNodeType, string> = {
  project: "#22d3ee", // cyan
  module: "#a78bfa", // violet
  concept: "#34d399", // emerald
  file: "#fbbf24", // amber
};

const TYPE_LABEL: Record<GraphNodeType, string> = {
  project: "Project",
  module: "Module",
  concept: "Concept",
  file: "File",
};

// Node enriched with runtime coords the force library adds
type RNode = GraphNode & { x?: number; y?: number };

// Minimal chainable interface shared by force-graph (2D) and 3d-force-graph (3D)
interface ForceGraphInstance {
  width(w: number): ForceGraphInstance;
  height(h: number): ForceGraphInstance;
  backgroundColor(c: string): ForceGraphInstance;
  graphData(d: KnowledgeGraphData): ForceGraphInstance;
  nodeLabel(fn: (n: RNode) => string): ForceGraphInstance;
  nodeColor(fn: (n: RNode) => string): ForceGraphInstance;
  nodeVal(fn: (n: RNode) => number): ForceGraphInstance;
  nodeRelSize(n: number): ForceGraphInstance;
  linkColor(fn: () => string): ForceGraphInstance;
  linkWidth(n: number): ForceGraphInstance;
  onNodeClick(fn: (n: RNode) => void): ForceGraphInstance;
  nodeCanvasObjectMode(fn: () => string): ForceGraphInstance;
  nodeCanvasObject(
    fn: (n: RNode, ctx: CanvasRenderingContext2D, scale: number) => void
  ): ForceGraphInstance;
  _destructor(): void;
}

type ForceGraphCtor = new (el: HTMLElement) => ForceGraphInstance;

export default function KnowledgeGraph({ data }: { data: KnowledgeGraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ForceGraphInstance | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    const destroy = () => {
      if (instanceRef.current) {
        try {
          instanceRef.current._destructor();
        } catch {
          /* noop */
        }
        instanceRef.current = null;
      }
      el.innerHTML = "";
    };

    async function init() {
      setLoading(true);
      destroy();

      const width = el!.clientWidth || 640;
      const height = 460;

      // Clone so the force layout doesn't mutate the props between renders
      const graphData: KnowledgeGraphData = {
        nodes: data.nodes.map((n) => ({ ...n })),
        links: data.links.map((l) => ({ ...l })),
      };

      const mod =
        mode === "3d"
          ? await import("3d-force-graph")
          : await import("force-graph");
      if (cancelled) return;

      const Ctor = (mod.default ?? mod) as unknown as ForceGraphCtor;
      const g = new Ctor(el!)
        .width(width)
        .height(height)
        .backgroundColor("#0a0c10")
        .graphData(graphData)
        .nodeLabel((n) => `${n.label} · ${TYPE_LABEL[n.type]}`)
        .nodeColor((n) => TYPE_COLOR[n.type] ?? "#9ca3af")
        .nodeVal((n) => n.val)
        .nodeRelSize(4)
        .linkColor(() => "rgba(148,163,184,0.18)")
        .linkWidth(0.8)
        .onNodeClick((n) =>
          setSelected({
            id: n.id,
            label: n.label,
            type: n.type,
            val: n.val,
            summary: n.summary,
          })
        );

      // 2D: draw always-on labels next to each node for readability
      if (mode === "2d") {
        g.nodeCanvasObjectMode(() => "after").nodeCanvasObject((n, ctx, scale) => {
          if (n.x === undefined || n.y === undefined) return;
          const fontSize = Math.max(11 / scale, 1.5);
          ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(228,228,231,0.85)";
          const r = Math.sqrt(Math.max(n.val, 1)) * 4;
          ctx.fillText(n.label, n.x, n.y + r + 1.5);
        });
      }

      instanceRef.current = g;
      setLoading(false);
    }

    init();

    const onResize = () => {
      if (instanceRef.current && el) instanceRef.current.width(el.clientWidth);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      destroy();
    };
  }, [data, mode]);

  const isEmpty = data.nodes.length <= 1;

  if (isEmpty) {
    return (
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-6 text-center">
        <Network size={18} className="text-zinc-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">
          The graph appears once this workspace has an analyzed learning map.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-zinc-800 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-zinc-200">Project Map</span>
          {loading && (
            <span className="text-xs text-zinc-600 animate-pulse">rendering…</span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode("2d")}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              mode === "2d"
                ? "bg-cyan-500/15 text-cyan-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Network size={11} /> 2D
          </button>
          <button
            type="button"
            onClick={() => setMode("3d")}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              mode === "3d"
                ? "bg-violet-500/15 text-violet-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Box size={11} /> 3D
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="relative">
        <div ref={containerRef} style={{ height: 460 }} className="w-full" />

        {/* Selected node detail */}
        {selected && (
          <div className="absolute top-3 left-3 max-w-xs bg-zinc-950/95 border border-zinc-700 rounded-lg p-3 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLOR[selected.type] }}
                />
                <span className="text-xs font-semibold text-zinc-100">
                  {selected.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">
              {TYPE_LABEL[selected.type]}
            </p>
            {selected.summary && (
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                {selected.summary}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-zinc-800 flex-wrap">
        {(Object.keys(TYPE_COLOR) as GraphNodeType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TYPE_COLOR[t] }}
            />
            {TYPE_LABEL[t]}
          </span>
        ))}
        <span className="text-xs text-zinc-700 ml-auto">
          drag to move · scroll to zoom · click a node for details
        </span>
      </div>
    </div>
  );
}
