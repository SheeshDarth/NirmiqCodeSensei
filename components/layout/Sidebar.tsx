"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Map,
  MessageSquare,
  Bug,
  Code2,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workspaces", href: "/workspaces", icon: FolderOpen },
  { label: "Learning Map", href: "/learning-map", icon: Map },
  { label: "Explain-Back", href: "/explain-back", icon: MessageSquare },
  { label: "Debug Lab", href: "/debug-lab", icon: Bug },
  { label: "DSA Bridge", href: "/dsa-bridge", icon: Code2 },
  { label: "Daily Log", href: "/daily-log", icon: BookOpen },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-screen bg-[#0d1117] border-r border-zinc-800 transition-all duration-200 shrink-0 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-2 px-3 py-4 border-b border-zinc-800 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500 shrink-0">
          <Zap size={14} className="text-black" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">
            CodeSensei
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + collapse toggle */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-zinc-800 pt-2">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-cyan-500/10 text-cyan-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
          }`}
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-zinc-600 hover:text-zinc-400 hover:bg-white/5 w-full transition-colors"
          suppressHydrationWarning
        >
          {collapsed ? (
            <ChevronRight size={16} className="shrink-0" />
          ) : (
            <>
              <ChevronLeft size={16} className="shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
