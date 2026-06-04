import { BookOpen } from "lucide-react";

export default function DailyLogPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Daily Log</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          What did you build? What do you still not understand?
        </p>
      </div>

      <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 mb-4">
          <BookOpen size={20} className="text-emerald-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          No daily logs yet
        </h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Log what you built, what you understood, what is still unclear, and
          your next action. One log per day keeps the viva panic away.
        </p>
      </div>
    </div>
  );
}
