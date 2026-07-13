import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, existsSync, renameSync } from "fs";
import path from "path";
import * as schema from "./schema";

// Default to <cwd>/data; allow an override so out-of-tree entry points (e.g. the
// PostToolUse session-log hook, which runs with cwd = the user's project) can
// point at the NirmiqCodeSensei install's data dir. NCS_DATA_DIR is the current
// name; NIRMIQ_DATA_DIR is read as a fallback so pre-rename setups keep working.
const DATA_DIR = process.env.NCS_DATA_DIR
  ? path.resolve(process.env.NCS_DATA_DIR)
  : process.env.NIRMIQ_DATA_DIR
    ? path.resolve(process.env.NIRMIQ_DATA_DIR)
    : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nirmiqcodesensei.db");

mkdirSync(DATA_DIR, { recursive: true });

// One-time migration: adopt an existing pre-rename database so upgrading users
// keep their data (data/nirmiqlearn.db → data/nirmiqcodesensei.db, incl. WAL).
const LEGACY_DB_PATH = path.join(DATA_DIR, "nirmiqlearn.db");
if (!existsSync(DB_PATH) && existsSync(LEGACY_DB_PATH)) {
  try {
    renameSync(LEGACY_DB_PATH, DB_PATH);
    for (const suffix of ["-wal", "-shm"]) {
      if (existsSync(LEGACY_DB_PATH + suffix)) {
        renameSync(LEGACY_DB_PATH + suffix, DB_PATH + suffix);
      }
    }
  } catch {
    /* fall through — a fresh DB is created if the rename fails */
  }
}

const sqlite = new Database(DB_PATH);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// NORMAL is the recommended durability level under WAL: safe against app
// crashes, only a power-loss window, without fsync-per-write cost.
sqlite.pragma("synchronous = NORMAL");
// The PostToolUse session-log hook can write while the dev server is also
// touching the DB. Wait up to 5s for a lock instead of throwing SQLITE_BUSY.
sqlite.pragma("busy_timeout = 5000");

// Boot-time integrity check — surface corruption loudly instead of failing with
// a cryptic error deep in a query later. quick_check is fast and sufficient for
// a single-user local DB; we warn rather than crash so the app still starts.
try {
  const integrity = sqlite.pragma("quick_check", { simple: true });
  if (integrity !== "ok") {
    console.error(
      `[db] integrity check failed: ${integrity}. Your database may be corrupt — ` +
        `restore from a backup (data/nirmiqcodesensei.db).`
    );
  }
} catch {
  /* pragma unsupported or DB unreadable — surfaced elsewhere on first query */
}

// Fold the WAL back into the main DB file on clean shutdown so the .db file is
// self-contained (consistent backups) and the WAL doesn't grow unbounded. Only
// the synchronous "exit" event is hooked — better-sqlite3's checkpoint/close are
// sync, and we avoid overriding Next.js's own SIGINT/SIGTERM handling.
let dbClosed = false;
process.once("exit", () => {
  if (dbClosed) return;
  dbClosed = true;
  try {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    sqlite.close();
  } catch {
    /* best-effort on shutdown */
  }
});

export const db = drizzle(sqlite, { schema });

/** The raw better-sqlite3 handle — for maintenance ops (backup, checkpoint). */
export const sqliteConnection = sqlite;
