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

export const db = drizzle(sqlite, { schema });
