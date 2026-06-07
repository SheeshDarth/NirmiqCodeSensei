/**
 * NirmiqLearn OS — AI-Powered MCP Tools (Pro Tier)
 *
 * These tools require:
 *   1. NIRMIQ_PRO_KEY — a valid Gumroad license key (verified once, cached 7 days)
 *   2. ANTHROPIC_API_KEY — the user's own Anthropic API key (BYOK)
 *
 * Model: claude-opus-4-8
 *
 * Security:
 * - Pro license is verified against Gumroad API; raw key is never stored.
 * - Anthropic client is instantiated per-call; key never stored globally.
 * - All prompts are constructed server-side only — no user-controlled injection.
 */

import Anthropic from "@anthropic-ai/sdk";
import { checkLicense, licenseErrorMessage } from "./license";

// ── Pro gate: license + API key ────────────────────────────────────────────────

const NO_ANTHROPIC_KEY_MSG = [
  "🔑 AI tools also need your Anthropic API key.",
  "",
  "Add to .env.local in your NirmiqLearnOS directory:",
  "   ANTHROPIC_API_KEY=sk-ant-api03-...",
  "",
  "Get a key at https://console.anthropic.com/",
  "Restart the MCP server after adding it.",
].join("\n");

/**
 * Verify both the Pro license and the Anthropic API key.
 * Returns null if everything is valid, or an error message string to return immediately.
 */
async function checkPro(): Promise<string | null> {
  const license = await checkLicense();
  if (!license.valid) return licenseErrorMessage(license.reason);
  if (!process.env.ANTHROPIC_API_KEY) return NO_ANTHROPIC_KEY_MSG;
  return null;
}

function getClient(): Anthropic {
  // Called only after checkPro() confirms the key exists
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Extract text blocks from a response, ignoring thinking/tool-use blocks. */
function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Sanitise an error for safe display — strip paths and internal detail. */
function sanitiseError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    return "Invalid or missing ANTHROPIC_API_KEY. Check .env.local and restart the MCP server.";
  }
  if (e instanceof Anthropic.RateLimitError) {
    return "Anthropic rate limit hit. Wait a moment and try again.";
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return "API key lacks permission for this model. Check your Anthropic account tier.";
  }
  const msg =
    e instanceof Error ? e.message : String(e);
  // Strip file paths from error messages
  const safe = msg.replace(/[A-Za-z]:\\[^\s]+|\/[^\s]+/g, "[path]");
  return `AI request failed: ${safe.slice(0, 200)}`;
}

// ── Tool 1: Generate explain-back questions from code ─────────────────────────

export async function generateQuestions(
  codeSnippet: string,
  context?: string
): Promise<string> {
  const gate = await checkPro();
  if (gate) return gate;
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            context
              ? `## What was just built\n${context}\n\n`
              : "",
            "## Code to analyse",
            "```",
            codeSnippet.slice(0, 8000), // guard against huge pastes
            "```",
            "",
            "You are a senior software engineering educator.",
            "Generate exactly 5 explain-back questions a student should be able to",
            "answer about this code. Make them progressively harder:",
            "  Q1-Q2: beginner (what does X do, why is Y used here)",
            "  Q3-Q4: intermediate (trade-offs, edge cases, O() complexity)",
            "  Q5: advanced (design decisions, how you'd extend or test this)",
            "",
            "For each question list 2-4 expected answer bullet points.",
            "",
            "Format exactly as:",
            "**Q1: [question]**",
            "Expected points:",
            "- [point]",
            "- [point]",
            "",
            "Focus on the WHY and HOW, not just WHAT.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const text = extractText(response);
    return `🧠 AI-generated explain-back questions:\n\n${text}\n\n─\nSave these with add_question in each workspace.`;
  } catch (e) {
    return `❌ ${sanitiseError(e)}`;
  }
}

// ── Tool 2: Suggest DSA/CS concepts from code ─────────────────────────────────

export async function suggestConcepts(
  codeSnippet: string,
  featureDescription?: string
): Promise<string> {
  const gate = await checkPro();
  if (gate) return gate;
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            featureDescription
              ? `## Feature being built\n${featureDescription}\n\n`
              : "",
            "## Code",
            "```",
            codeSnippet.slice(0, 8000),
            "```",
            "",
            "You are a CS educator who bridges real-world code to foundational",
            "DSA and CS concepts.",
            "",
            "Identify 3-5 underlying concepts this code demonstrates.",
            "For each concept provide:",
            "  • Concept name + type (one of: Array, HashMap, Tree, Graph, Stack,",
            "    Queue, Heap, Recursion, Dynamic Programming, Sorting, Binary Search,",
            "    Two Pointers, Sliding Window, Greedy, Bit Manipulation, String,",
            "    Linked List, Trie, Math, OS Concept, Networking, Database,",
            "    Design Pattern, or Other)",
            "  • Exactly how this code applies it (1-2 sentences)",
            "  • One concrete 30-min practice task to reinforce it",
            "",
            "Format as a numbered list. Be specific to the actual code, not generic.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const text = extractText(response);
    return `🔗 AI-suggested DSA/CS concepts:\n\n${text}\n\n─\nSave these with add_concept_link in each workspace.`;
  } catch (e) {
    return `❌ ${sanitiseError(e)}`;
  }
}

// ── Tool 3: Debug assist ───────────────────────────────────────────────────────

export async function debugAssist(
  errorMessage: string,
  codeContext?: string
): Promise<string> {
  const gate = await checkPro();
  if (gate) return gate;
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1536,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            "## Error",
            errorMessage.slice(0, 4000),
            "",
            codeContext
              ? `## Code context\n\`\`\`\n${codeContext.slice(0, 4000)}\n\`\`\`\n`
              : "",
            "You are an expert debugging assistant.",
            "Diagnose this error concisely and actionably.",
            "",
            "Reply in this exact structure:",
            "",
            "**Likely root cause**",
            "[1-2 sentences — most probable explanation]",
            "",
            "**Top 3 things to check** (ordered most → least likely)",
            "1. ...",
            "2. ...",
            "3. ...",
            "",
            "**Suggested fix**",
            "[Concrete code change, command, or config edit]",
            "",
            "**Prevention rule**",
            "[One rule to prevent this class of bug in future]",
            "",
            "Be specific. Skip generic advice like 'check your code'.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const text = extractText(response);
    return `🔍 AI debug analysis:\n\n${text}\n\n─\nSave this with add_debug_log in your workspace.`;
  } catch (e) {
    return `❌ ${sanitiseError(e)}`;
  }
}
