import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { db } from "./client";

export function runMigrations() {
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "lib/db/migrations"),
  });
}
