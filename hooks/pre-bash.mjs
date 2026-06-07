#!/usr/bin/env node
/**
 * NirmiqLearn OS — Pre-Bash Hook
 *
 * Claude Code calls this BEFORE running any Bash command.
 * We explain the command in plain English and flag risky ones.
 *
 * Install: run `node hooks/install-hooks.mjs` in your project directory.
 *
 * How it works:
 *   1. Claude Code sends hook data as JSON to stdin
 *   2. We read the command
 *   3. Call NirmiqLearn's explain-command MCP tool (or Anthropic API directly)
 *   4. Write plain-English explanation to stderr (Claude Code shows it to user)
 *   5. Exit 0 = allow command, Exit 2 = block command
 *
 * Exit codes:
 *   0 = allow the command to run
 *   2 = block the command (only for truly dangerous commands)
 */

import { createInterface } from "readline";
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NIRMIQ_ROOT = path.resolve(__dirname, "..");

// Read hook data from stdin
async function readStdin() {
  const rl = createInterface({ input: process.stdin, terminal: false });
  let data = "";
  for await (const line of rl) data += line + "\n";
  return data.trim();
}

// Load .env.local for API key
function loadEnv() {
  const envPath = path.join(NIRMIQ_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length && !key.startsWith("#")) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  } catch { /* ignore */ }
}

// Commands too dangerous to run without explanation (block and warn)
const BLOCK_PATTERNS = [
  /rm\s+-rf\s+\/(?!\S)/,        // rm -rf / (root)
  /rm\s+-rf\s+~\s*$/,           // rm -rf ~ (home)
  /format\s+[a-zA-Z]:/,         // format C: etc
  /dd\s+if=.*of=\/dev\//,       // dd to disk device
  /:\(\)\{.*\};\:/,             // fork bomb
];

// Commands that are always safe to skip explaining (too frequent, too boring)
const SKIP_PATTERNS = [
  /^echo\s/,
  /^ls(\s|$)/,
  /^pwd$/,
  /^cat\s/,
  /^which\s/,
  /^type\s/,
  /^where\s/,
  /^cd\s/,
  /^mkdir\s/,
  /^cp\s/,
  /^mv\s/,
  /^true$/,
  /^false$/,
];

async function explainWithAI(command) {
  const require = createRequire(import.meta.url);

  // Try global pptxgenjs path pattern to find anthropic
  const possiblePaths = [
    path.join(NIRMIQ_ROOT, "node_modules", "@anthropic-ai", "sdk"),
  ];

  let Anthropic;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        Anthropic = require(p).default ?? require(p);
        break;
      } catch { /* try next */ }
    }
  }

  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Explain this shell command to a developer who is learning and may not know what it does. Be plain and direct. Max 3 sentences.\n\nCommand: ${command.slice(0, 500)}\n\nReply with ONLY: <emoji> <plain explanation>. Emoji guide: ✅ safe/normal, ⚠️ modifies files/config, 🔴 risky/destructive. No markdown.`,
      }],
    });
    return response.content.find(b => b.type === "text")?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnv();

  let hookData;
  try {
    const stdin = await readStdin();
    hookData = JSON.parse(stdin);
  } catch {
    process.exit(0); // can't parse — allow
  }

  const command = hookData?.tool_input?.command ?? "";
  if (!command) process.exit(0);

  // Check skip patterns — don't explain trivial commands
  if (SKIP_PATTERNS.some(p => p.test(command))) process.exit(0);

  // Check block patterns — block truly dangerous commands
  if (BLOCK_PATTERNS.some(p => p.test(command))) {
    process.stderr.write(
      `\n🔴 NirmiqLearn: This command looks dangerous and has been blocked.\n` +
      `Command: ${command}\n` +
      `If you meant to run this, remove it from the block list in hooks/pre-bash.mjs.\n\n`
    );
    process.exit(2); // block
  }

  // Try AI explanation
  const explanation = await explainWithAI(command);

  if (explanation) {
    process.stderr.write(`\n💡 NirmiqLearn explains: ${explanation}\n\n`);
  }

  process.exit(0); // allow
}

main().catch(() => process.exit(0));
