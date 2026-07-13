import { readFileSync, unlinkSync } from "fs";
import path from "path";
import os from "os";
import { sqliteConnection } from "@/lib/db/client";
import type { ServiceResult } from "@/lib/types";

/**
 * Produce a consistent snapshot of the whole database for the user to download.
 *
 * Uses better-sqlite3's online backup API, which copies the DB even while it is
 * in use (WAL-safe) without holding a long write lock — so the resulting file
 * is internally consistent, not a raw byte copy that could catch a half-written
 * page. The snapshot is written to a temp file, read into memory, and the temp
 * file removed; the caller streams the buffer as a download.
 *
 * Restore is intentionally NOT an in-app operation: for a local single-user
 * SQLite file the safe path is to stop the app and replace
 * data/nirmiqcodesensei.db with a backup (documented in Settings).
 */
export async function backupDatabase(): Promise<
  ServiceResult<{ filename: string; data: Buffer }>
> {
  const tmpPath = path.join(
    os.tmpdir(),
    `ncs-backup-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  );
  try {
    await sqliteConnection.backup(tmpPath);
    const data = readFileSync(tmpPath);
    return {
      ok: true,
      data: {
        filename: `nirmiqcodesensei-backup-${Date.now()}.db`,
        data,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Backup failed: ${msg}`, code: "BACKUP_ERROR" };
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* temp cleanup is best-effort */
    }
  }
}
