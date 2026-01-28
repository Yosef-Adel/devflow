import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import * as schema from "./schema";

// Create database connection
function createDatabase() {
  const dbPath = path.join(app.getPath("userData"), "activity-tracker.db");
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better performance
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
}

// Export database instance (lazy initialization)
let _db: ReturnType<typeof createDatabase> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDatabase();
  }
  return _db;
}

// Export schema for use in queries
export * from "./schema";
