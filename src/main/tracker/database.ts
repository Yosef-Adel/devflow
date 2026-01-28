import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import type { Category } from "./categorizer";

export interface ActivityRecord {
  id?: number;
  app_name: string;
  window_title: string;
  url: string | null;
  category: Category;
  project_name: string | null;
  file_name: string | null;
  file_type: string | null;
  language: string | null;
  domain: string | null;
  start_time: number;
  end_time: number;
  duration: number;
  context_json: string | null;
  created_at?: string;
}

class ActivityDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath("userData"), "activity-tracker.db");
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        window_title TEXT,
        url TEXT,
        category TEXT,
        project_name TEXT,
        file_name TEXT,
        file_type TEXT,
        language TEXT,
        domain TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        context_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_app_name ON activities(app_name);
      CREATE INDEX IF NOT EXISTS idx_category ON activities(category);
      CREATE INDEX IF NOT EXISTS idx_project ON activities(project_name);
      CREATE INDEX IF NOT EXISTS idx_start_time ON activities(start_time);
      CREATE INDEX IF NOT EXISTS idx_date ON activities(created_at);
    `);
  }

  insertActivity(activity: Omit<ActivityRecord, "id" | "created_at">): number {
    const stmt = this.db.prepare(`
      INSERT INTO activities (
        app_name, window_title, url, category,
        project_name, file_name, file_type, language,
        domain, start_time, end_time, duration, context_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      activity.app_name,
      activity.window_title,
      activity.url,
      activity.category,
      activity.project_name,
      activity.file_name,
      activity.file_type,
      activity.language,
      activity.domain,
      activity.start_time,
      activity.end_time,
      activity.duration,
      activity.context_json,
    );

    return result.lastInsertRowid as number;
  }

  getActivitiesInRange(startTime: number, endTime: number): ActivityRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activities
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time DESC
    `);

    return stmt.all(startTime, endTime) as ActivityRecord[];
  }

  getAppUsage(startTime: number, endTime: number): Array<{
    app_name: string;
    total_duration: number;
    session_count: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        app_name,
        SUM(duration) as total_duration,
        COUNT(*) as session_count
      FROM activities
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY app_name
      ORDER BY total_duration DESC
    `);

    return stmt.all(startTime, endTime) as Array<{
      app_name: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  getCategoryBreakdown(startTime: number, endTime: number): Array<{
    category: Category;
    total_duration: number;
    session_count: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        category,
        SUM(duration) as total_duration,
        COUNT(*) as session_count
      FROM activities
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY category
      ORDER BY total_duration DESC
    `);

    return stmt.all(startTime, endTime) as Array<{
      category: Category;
      total_duration: number;
      session_count: number;
    }>;
  }

  getProjectTime(startTime: number, endTime: number): Array<{
    project_name: string;
    total_duration: number;
    session_count: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        project_name,
        SUM(duration) as total_duration,
        COUNT(*) as session_count
      FROM activities
      WHERE start_time >= ? AND start_time <= ? AND project_name IS NOT NULL
      GROUP BY project_name
      ORDER BY total_duration DESC
    `);

    return stmt.all(startTime, endTime) as Array<{
      project_name: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  getDomainUsage(startTime: number, endTime: number): Array<{
    domain: string;
    total_duration: number;
    session_count: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        domain,
        SUM(duration) as total_duration,
        COUNT(*) as session_count
      FROM activities
      WHERE start_time >= ? AND start_time <= ? AND domain IS NOT NULL
      GROUP BY domain
      ORDER BY total_duration DESC
    `);

    return stmt.all(startTime, endTime) as Array<{
      domain: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  getHourlyPattern(startTime: number, endTime: number): Array<{
    hour: string;
    category: Category;
    total_duration: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        strftime('%H', datetime(start_time/1000, 'unixepoch', 'localtime')) as hour,
        category,
        SUM(duration) as total_duration
      FROM activities
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY hour, category
      ORDER BY hour, total_duration DESC
    `);

    return stmt.all(startTime, endTime) as Array<{
      hour: string;
      category: Category;
      total_duration: number;
    }>;
  }

  getDailyTotals(days: number): Array<{
    date: string;
    total_duration: number;
    session_count: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        DATE(datetime(start_time/1000, 'unixepoch', 'localtime')) as date,
        SUM(duration) as total_duration,
        COUNT(*) as session_count
      FROM activities
      WHERE start_time >= ?
      GROUP BY date
      ORDER BY date DESC
    `);

    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return stmt.all(startTime) as Array<{
      date: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  getTotalTrackedTime(startTime: number, endTime: number): number {
    const stmt = this.db.prepare(`
      SELECT SUM(duration) as total FROM activities
      WHERE start_time >= ? AND start_time <= ?
    `);

    const result = stmt.get(startTime, endTime) as { total: number | null };
    return result.total || 0;
  }

  close(): void {
    this.db.close();
  }
}

export default ActivityDatabase;
