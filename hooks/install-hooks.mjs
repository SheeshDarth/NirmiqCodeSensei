#!/usr/bin/env node
/**
 * NirmiqLearn OS — Hook Installer
 *
 * Run this from inside any project directory to install the vibe coding companion:
 *
 *   node /path/to/NirmiqLearnOS/hooks/install-hooks.mjs
 *
 * What it does:
 *   - Creates or updates .claude/settings.json in the current directory
 *   - Adds a PreToolUse hook for Bash commands → plain-English explanations
 *   - Preserves any existing hooks and settings
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NIRMIQ_ROOT = path.resolve(__dirname, "..");
const HOOK_SCRIPT = path.join(NIRMIQ_ROOT, "hooks", "pre-bash.mjs").replace(/\\/g, "/");

const CWD = process.cwd();
const CLAUDE_DIR = path.join(CWD, ".claude");
const SETTINGS_PATH = path.join(CLAUDE_DIR, "settings.json");

// Read existing settings or start fresh
let settings = {};
if (existsSync(SETTINGS_PATH)) {
  try {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    console.log("📖 Found existing .claude/settings.json — merging...");
  } catch {
    console.log("⚠️  Could not parse existing settings.json — starting fresh.");
  }
}

// Ensure hooks structure exists
if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

// Check if our hook is already installed
const alreadyInstalled = settings.hooks.PreToolUse.some(
  (h) => h.hooks?.some((hh) => hh.command?.includes("pre-bash.mjs"))
);

if (alreadyInstalled) {
  console.log("✅ NirmiqLearn hook is already installed in this project.");
  process.exit(0);
}

// Add our hook
settings.hooks.PreToolUse.push({
  matcher: "Bash",
  hooks: [
    {
      type: "command",
      command: `node "${HOOK_SCRIPT}"`,
    },
  ],
});

// Write back
mkdirSync(CLAUDE_DIR, { recursive: true });
writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

console.log(`
✅ NirmiqLearn vibe coding companion installed!

Project: ${CWD}
Hook file: ${SETTINGS_PATH}

What happens now:
  → Every Bash command Claude Code runs will be explained in plain English
  → Explanations appear right next to the permission prompt
  → Logged to your NirmiqLearn session log

To uninstall: remove the PreToolUse entry from .claude/settings.json
To update the NirmiqLearn path: edit hooks/pre-bash.mjs

Make sure ANTHROPIC_API_KEY is set in:
  ${path.join(NIRMIQ_ROOT, ".env.local")}
`);
