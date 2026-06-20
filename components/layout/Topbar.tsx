"use client";

import { Search, Download } from "lucide-react";

interface TopbarProps {
  activeWorkspace?: string | null;
}

export default function Topbar({ activeWorkspace }: TopbarProps) {
  return (
    <header className="h-12 bg-[#0d1117] border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
      {/* Active workspace indicator */}
      <div className="flex items-center gap-2 flex-1">
        {activeWorkspace ? (
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
            {activeWorkspace}
          </span>
        ) : (
          <span className="text-xs text-zinc-600 font-mono">
            no active workspace
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 w-52">
        <Search size={13} className="text-zinc-600 shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none w-full"
          // Browser form-filler extensions inject attributes (e.g. fdprocessedid)
          // before hydration; suppress the resulting attribute mismatch warning.
          suppressHydrationWarning
        />
      </div>

      {/* Export */}
      <button
        disabled
        title="Export — available in Phase 8"
        className="flex items-center gap-1.5 text-xs text-zinc-600 px-2 py-1.5 rounded-md cursor-not-allowed"
        suppressHydrationWarning
      >
        <Download size={13} />
        <span>Export</span>
      </button>
    </header>
  );
}
