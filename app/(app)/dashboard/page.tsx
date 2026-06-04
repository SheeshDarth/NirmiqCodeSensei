import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Bug,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const STAT_CARDS = [
  {
    label: "Active Workspace",
    value: "—",
    sub: "No workspace selected",
    icon: FolderOpen,
    color: "text-cyan-400",
  },
  {
    label: "Understanding Score",
    value: "—",
    sub: "Answer explain-back questions",
    icon: TrendingUp,
    color: "text-violet-400",
  },
  {
    label: "Explain-Back Accuracy",
    value: "—",
    sub: "No questions answered yet",
    icon: MessageSquare,
    color: "text-emerald-400",
  },
  {
    label: "Debug Lessons",
    value: "0",
    sub: "No bugs logged yet",
    icon: Bug,
    color: "text-amber-400",
  },
  {
    label: "Weak Concepts",
    value: "—",
    sub: "Create a learning map first",
    icon: AlertCircle,
    color: "text-red-400",
  },
  {
    label: "Today's Action",
    value: "—",
    sub: "Start by creating a workspace",
    icon: LayoutDashboard,
    color: "text-zinc-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Your project is not mastered until you can explain it without AI.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STAT_CARDS.map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-[#0d1117] border border-zinc-800 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                {label}
              </span>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>
              {value}
            </p>
            <p className="text-xs text-zinc-600">{sub}</p>
          </div>
        ))}
      </div>

      {/* Empty-state CTA */}
      <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 mb-4">
          <FolderOpen size={20} className="text-cyan-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">
          Create your first workspace
        </h2>
        <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
          A workspace is your learning environment for one project, topic, or
          exam. Once created it becomes your full study system.
        </p>
        <Link
          href="/workspaces"
          className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold px-4 py-2 rounded-md transition-colors"
        >
          Go to Workspaces
        </Link>
      </div>
    </div>
  );
}
