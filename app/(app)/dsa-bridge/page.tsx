import { Code2 } from "lucide-react";

export default function DSABridgePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">DSA Bridge</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Connect this feature to the fundamentals behind it.
        </p>
      </div>

      <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 mb-4">
          <Code2 size={20} className="text-violet-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          No concept links yet
        </h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          DSA Bridge maps your project features to underlying algorithms and data
          structures. Add a workspace to begin linking concepts.
        </p>
      </div>
    </div>
  );
}
