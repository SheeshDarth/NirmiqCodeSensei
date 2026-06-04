import { Plus, FolderOpen, Code2, BookOpen, GraduationCap } from "lucide-react";

const WORKSPACE_TYPES = [
  {
    label: "Project Workspace",
    icon: FolderOpen,
    description:
      "Understand a codebase or AI-assisted build. Break it into modules, explain every decision.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    label: "DSA Workspace",
    icon: Code2,
    description:
      "Connect data structures and algorithms to real project problems. Practice before placement.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    label: "Exam Workspace",
    icon: GraduationCap,
    description:
      "Prepare for viva, oral exams, or technical interviews with structured Q&A sessions.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    label: "Topic Workspace",
    icon: BookOpen,
    description:
      "Deep-dive into a concept, library, or framework. Build understanding from first principles.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export default function WorkspacesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Workspaces</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Each workspace is a learning environment for one project, topic, or
            goal.
          </p>
        </div>
        <button
          disabled
          title="Workspace creation coming in Phase 3"
          className="flex items-center gap-1.5 bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold px-3 py-2 rounded-md"
        >
          <Plus size={13} />
          New Workspace
        </button>
      </div>

      {/* Empty state */}
      <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 mb-4">
          <FolderOpen size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          No workspaces yet
        </h2>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
          No learning map yet. Create one to turn your project into a study
          system.
        </p>
      </div>

      {/* Workspace type cards */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Workspace Types
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WORKSPACE_TYPES.map(({ label, icon: Icon, description, color, bg }) => (
            <div
              key={label}
              className="bg-[#0d1117] border border-zinc-800 rounded-lg p-4 flex gap-3"
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg ${bg} shrink-0`}
              >
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
