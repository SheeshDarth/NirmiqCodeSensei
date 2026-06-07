/**
 * NirmiqLearn OS — Pro License Verification
 *
 * Validates Gumroad license keys for the Pro tier.
 *
 * Flow:
 *   1. Read NIRMIQ_PRO_KEY from environment.
 *   2. Check local cache (data/license-cache.json). If fresh (< 7 days), use it.
 *   3. If stale or missing, call Gumroad's verify API.
 *   4. Write result to cache. Return verdict.
 *
 * Security:
 *   - Raw key is never stored. Cache stores only SHA-256(key).
 *   - Cache file is gitignored.
 *   - Dev bypass: NIRMIQ_PRO_KEY=dev skips verification (local dev only).
 *   - Network failure falls back to cached result if available; otherwise invalid.
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// ── Config ─────────────────────────────────────────────────────────────────────

const CACHE_PATH = path.resolve(process.cwd(), "data", "license-cache.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Update this to match your Gumroad product permalink once the product is live.
// Found in: Gumroad dashboard → Product → Edit → the slug in the product URL.
const GUMROAD_PRODUCT_PERMALINK = "nirmiqlearn";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LicenseCache {
  keyHash: string;
  valid: boolean;
  verifiedAt: string; // ISO 8601
  email?: string;
}

export interface LicenseResult {
  valid: boolean;
  /** Human-readable reason — shown only in error messages, not to the user directly. */
  reason: "dev-mode" | "cached-valid" | "cached-invalid" | "verified" | "invalid-key" | "no-key" | "network-error";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashKey(key: string): string {
  return createHash("sha256").update(key.trim().toLowerCase()).digest("hex");
}

function readCache(): LicenseCache | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8")) as LicenseCache;
  } catch {
    return null;
  }
}

function writeCache(entry: LicenseCache): void {
  try {
    mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), "utf-8");
  } catch {
    // Non-fatal — verification still proceeds; cache just won't persist.
  }
}

async function verifyWithGumroad(
  key: string
): Promise<{ valid: boolean; email?: string }> {
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_permalink: GUMROAD_PRODUCT_PERMALINK,
        license_key: key.trim(),
        increment_uses_count: "false", // don't count re-validations as new uses
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return { valid: false };

    const data = (await res.json()) as {
      success: boolean;
      purchase?: { email: string };
    };

    return data.success
      ? { valid: true, email: data.purchase?.email }
      : { valid: false };
  } catch {
    throw new Error("network-unreachable");
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Check whether the Pro license key in the environment is valid.
 *
 * This function is safe to call on every tool invocation — it returns the
 * cached result in < 1ms after the first network call.
 */
export async function checkLicense(): Promise<LicenseResult> {
  const key = process.env.NIRMIQ_PRO_KEY?.trim();

  // Dev/CI bypass — never in production packages
  if (key === "dev" || key === "DEV" || key === "development") {
    return { valid: true, reason: "dev-mode" };
  }

  if (!key) {
    return { valid: false, reason: "no-key" };
  }

  const keyHash = hashKey(key);
  const cache = readCache();

  // Return cached result if it's fresh and matches the current key
  if (cache && cache.keyHash === keyHash) {
    const ageMs = Date.now() - new Date(cache.verifiedAt).getTime();
    if (ageMs < CACHE_TTL_MS) {
      return {
        valid: cache.valid,
        reason: cache.valid ? "cached-valid" : "cached-invalid",
      };
    }
  }

  // Verify with Gumroad
  try {
    const result = await verifyWithGumroad(key);
    writeCache({
      keyHash,
      valid: result.valid,
      verifiedAt: new Date().toISOString(),
      email: result.email,
    });
    return { valid: result.valid, reason: result.valid ? "verified" : "invalid-key" };
  } catch {
    // Network unreachable — fall back to stale cache if it exists
    if (cache && cache.keyHash === keyHash && cache.valid) {
      return { valid: true, reason: "cached-valid" };
    }
    return { valid: false, reason: "network-error" };
  }
}

// ── Friendly error messages ────────────────────────────────────────────────────

export const NO_PRO_KEY_MSG = [
  "🔒 AI tools require NirmiqLearn Pro.",
  "",
  "1. Get your license key at: https://gumroad.com/l/nirmiqlearn",
  "2. Add to .env.local in your NirmiqLearnOS directory:",
  "   NIRMIQ_PRO_KEY=XXXX-XXXX-XXXX-XXXX",
  "3. Also add your Anthropic API key:",
  "   ANTHROPIC_API_KEY=sk-ant-api03-...",
  "4. Restart the MCP server.",
  "",
  "The 7 free tools (list_workspaces, add_debug_log, etc.) work without a key.",
].join("\n");

export const INVALID_KEY_MSG = [
  "🔒 Pro license key not recognised.",
  "",
  "Check that NIRMIQ_PRO_KEY in .env.local matches the key in your Gumroad receipt.",
  "Keys are case-insensitive. Spaces are ignored.",
  "",
  "If you believe this is an error, email: siddharthprashoo@gmail.com",
].join("\n");

export const NETWORK_ERROR_MSG = [
  "⚠️ Could not verify Pro license — Gumroad unreachable.",
  "",
  "If you've verified before, restart the MCP server to retry.",
  "If this is your first activation, check your internet connection.",
].join("\n");

export function licenseErrorMessage(reason: LicenseResult["reason"]): string {
  switch (reason) {
    case "no-key":
      return NO_PRO_KEY_MSG;
    case "invalid-key":
    case "cached-invalid":
      return INVALID_KEY_MSG;
    case "network-error":
      return NETWORK_ERROR_MSG;
    default:
      return NO_PRO_KEY_MSG;
  }
}
