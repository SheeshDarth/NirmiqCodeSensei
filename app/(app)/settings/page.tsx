import {
  Settings,
  Shield,
  Code2,
  ExternalLink,
  Sparkles,
  Download,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Local storage, export options, and preferences.
        </p>
      </div>

      {/* App settings */}
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg divide-y divide-zinc-800">
        {/* Storage */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-100">Storage Location</p>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">
              data/nirmiqcodesensei.db
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Restore: stop the app, replace this file with a backup, restart.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/settings/backup"
              className="inline-flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
            >
              <Download size={12} /> Backup
            </a>
            <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
              local SQLite
            </span>
          </div>
        </div>

        {/* Export */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">Export Format</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Markdown — use the Export button on any workspace
            </p>
          </div>
          <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
            available
          </span>
        </div>

        {/* AI Provider */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">AI Pro Tools</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Needs{" "}
              <code className="font-mono text-amber-400">NCS_PRO_KEY</code>
              {" "}+{" "}
              <code className="font-mono text-amber-400">ANTHROPIC_API_KEY</code>
              {" "}in .env.local
            </p>
          </div>
          <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
            Pro
          </span>
        </div>

        {/* Theme */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">Theme</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              NirmiqCodeSensei Cognitive Graph — dark mode
            </p>
          </div>
          <Settings size={14} className="text-zinc-600" />
        </div>
      </div>

      {/* MCP Integration */}
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={15} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            MCP Integration
          </h2>
          <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded ml-auto">
            available
          </span>
        </div>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Connect NirmiqCodeSensei to Claude Code, Cursor, or Windsurf so your AI
          assistant can automatically log debug sessions, add explain-back
          questions, and link DSA concepts as you build.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5">
              Start the MCP server
            </p>
            <code className="block bg-zinc-900 border border-zinc-800 text-xs text-cyan-300 font-mono px-3 py-2 rounded">
              npm run mcp
            </code>
          </div>

          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5">
              Claude Code — add to{" "}
              <span className="font-mono text-zinc-500">.claude/mcp.json</span>{" "}
              or project settings
            </p>
            <pre className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-3 py-2 rounded overflow-x-auto">
              {`{
  "mcpServers": {
    "nirmiqcodesensei": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/NirmiqCodeSensei"
    }
  }
}`}
            </pre>
          </div>

          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5">
              Cursor / Windsurf — add to MCP settings
            </p>
            <pre className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-3 py-2 rounded overflow-x-auto">
              {`{
  "nirmiqcodesensei": {
    "command": "npm",
    "args": ["run", "mcp"],
    "cwd": "/path/to/NirmiqCodeSensei"
  }
}`}
            </pre>
          </div>

          <p className="text-xs text-zinc-700">
            Free tools (7): list_workspaces · get_workspace_summary ·
            add_debug_log · add_question · add_concept_link · add_daily_log ·
            get_weak_questions
          </p>
          <p className="text-xs text-amber-700 mt-1">
            AI tools (3, needs ANTHROPIC_API_KEY): ncs_generate_questions ·
            ncs_suggest_concepts · ncs_debug_assist
          </p>
        </div>
      </div>

      {/* AI Pro Features */}
      <div className="bg-[#0d1117] border border-amber-900/40 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            AI Pro Features
          </h2>
          <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded ml-auto">
            BYOK
          </span>
        </div>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Three AI-powered MCP tools that call the Anthropic API using{" "}
          <em>your own key</em>. Your code never leaves your machine — it is
          sent directly from the MCP server to Anthropic, not through any
          NirmiqCodeSensei server.
        </p>

        <div className="space-y-3 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-1">
            <p className="text-xs font-mono text-amber-300">
              ncs_generate_questions
            </p>
            <p className="text-xs text-zinc-500">
              Paste a code snippet → get 5 progressive explain-back questions
              with expected answer bullets (beginner → advanced).
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-1">
            <p className="text-xs font-mono text-amber-300">
              ncs_suggest_concepts
            </p>
            <p className="text-xs text-zinc-500">
              Paste code → get 3–5 underlying DSA/CS concepts with 30-min
              practice tasks to reinforce each one.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-1">
            <p className="text-xs font-mono text-amber-300">
              ncs_debug_assist
            </p>
            <p className="text-xs text-zinc-500">
              Paste an error message → get root cause, top 3 checks, suggested
              fix, and a prevention rule.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-400 font-medium mb-1.5">
            Setup — add both keys to{" "}
            <span className="font-mono text-zinc-500">.env.local</span>
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 text-xs text-cyan-300 font-mono px-3 py-2 rounded overflow-x-auto">
            {`# 1. Your Gumroad Pro license key\nNCS_PRO_KEY=XXXX-XXXX-XXXX-XXXX\n\n# 2. Your Anthropic API key (BYOK)\nANTHROPIC_API_KEY=sk-ant-api03-...`}
          </pre>
          <p className="text-xs text-zinc-700 mt-2">
            License verified against Gumroad once, then cached locally for 7
            days — works offline after first activation.
          </p>
          <a
            href="https://gumroad.com/l/nirmiqlearn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-amber-500 hover:text-amber-300 transition-colors"
          >
            Get a Pro license key <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-[#0d1117] border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Privacy &amp; Security
            </h2>
          </div>
          <Link
            href="/privacy"
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
          >
            Full policy <ExternalLink size={11} />
          </Link>
        </div>
        <ul className="space-y-1.5 text-xs text-zinc-500">
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            All data stored locally in SQLite — never leaves your machine
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            Zero telemetry, zero analytics, zero network calls
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            Server binds to 127.0.0.1 — not accessible on your LAN
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            MCP server uses stdio — no network socket opened
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-500">⚠</span>
            Database is not encrypted at rest — do not store secrets
          </li>
        </ul>
      </div>

      {/* Version */}
      <div className="text-center">
        <p className="text-xs text-zinc-700 font-mono">
          NirmiqCodeSensei v0.1.0 ·{" "}
          <a
            href="https://github.com/SheeshDarth/NirmiqCodeSensei"
            className="hover:text-zinc-500 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/SheeshDarth/NirmiqCodeSensei
          </a>
        </p>
      </div>
    </div>
  );
}
