import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ExplainBackPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Explain-Back</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Do not paste AI answers. Explain it like you are in a viva.
        </p>
      </div>

      <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 mb-4">
          <MessageSquare size={20} className="text-violet-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          No questions yet
        </h2>
        <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
          Explain-back questions are generated from your learning maps. Create a
          workspace and a learning map first.
        </p>
        <Link
          href="/workspaces"
          className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium px-4 py-2 rounded-md transition-colors"
        >
          Go to Workspaces
        </Link>
      </div>
    </div>
  );
}
