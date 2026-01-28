import { gte, lte, and, sql, desc, isNotNull } from "drizzle-orm";
import { getDb, activities, type NewActivity, type Activity } from "../db";
import type { Category } from "./categorizer";

// Re-export types for external use
export type { Activity, NewActivity };

export interface ActivityRecord {
  id: number;
  app_name: string;
  window_title: string | null;
  url: string | null;
  category: string | null;
  project_name: string | null;
  file_name: string | null;
  file_type: string | null;
  language: string | null;
  domain: string | null;
  start_time: number;
  end_time: number;
  duration: number;
  context_json: string | null;
  created_at: string | null;
}

class ActivityDatabase {
  private db = getDb();

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    // Create table if not exists using raw SQL (Drizzle doesn't auto-create)
    this.db.run(sql`
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for faster queries
    this.db.run(sql`CREATE INDEX IF NOT EXISTS idx_app_name ON activities(app_name)`);
    this.db.run(sql`CREATE INDEX IF NOT EXISTS idx_category ON activities(category)`);
    this.db.run(sql`CREATE INDEX IF NOT EXISTS idx_project ON activities(project_name)`);
    this.db.run(sql`CREATE INDEX IF NOT EXISTS idx_start_time ON activities(start_time)`);
  }

  // Insert a new activity
  insertActivity(activity: {
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
  }): number {
    const result = this.db
      .insert(activities)
      .values({
        appName: activity.app_name,
        windowTitle: activity.window_title,
        url: activity.url,
        category: activity.category,
        projectName: activity.project_name,
        fileName: activity.file_name,
        fileType: activity.file_type,
        language: activity.language,
        domain: activity.domain,
        startTime: activity.start_time,
        endTime: activity.end_time,
        duration: activity.duration,
        contextJson: activity.context_json,
      })
      .returning({ id: activities.id })
      .get();

    return result?.id ?? 0;
  }

  // Get all activities in a time range
  getActivitiesInRange(startTime: number, endTime: number): ActivityRecord[] {
    const results = this.db
      .select()
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime)
        )
      )
      .orderBy(desc(activities.startTime))
      .all();

    return results.map(this.mapToRecord);
  }

  // Get app usage aggregated by app name
  getAppUsage(
    startTime: number,
    endTime: number
  ): Array<{ app_name: string; total_duration: number; session_count: number }> {
    const results = this.db
      .select({
        app_name: activities.appName,
        total_duration: sql<number>`sum(${activities.duration})`,
        session_count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime)
        )
      )
      .groupBy(activities.appName)
      .orderBy(desc(sql`sum(${activities.duration})`))
      .all();

    return results;
  }

  // Get category breakdown
  getCategoryBreakdown(
    startTime: number,
    endTime: number
  ): Array<{ category: Category; total_duration: number; session_count: number }> {
    const results = this.db
      .select({
        category: activities.category,
        total_duration: sql<number>`sum(${activities.duration})`,
        session_count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime)
        )
      )
      .groupBy(activities.category)
      .orderBy(desc(sql`sum(${activities.duration})`))
      .all();

    return results as Array<{
      category: Category;
      total_duration: number;
      session_count: number;
    }>;
  }

  // Get project time aggregated
  getProjectTime(
    startTime: number,
    endTime: number
  ): Array<{ project_name: string; total_duration: number; session_count: number }> {
    const results = this.db
      .select({
        project_name: activities.projectName,
        total_duration: sql<number>`sum(${activities.duration})`,
        session_count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime),
          isNotNull(activities.projectName)
        )
      )
      .groupBy(activities.projectName)
      .orderBy(desc(sql`sum(${activities.duration})`))
      .all();

    return results as Array<{
      project_name: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  // Get domain usage
  getDomainUsage(
    startTime: number,
    endTime: number
  ): Array<{ domain: string; total_duration: number; session_count: number }> {
    const results = this.db
      .select({
        domain: activities.domain,
        total_duration: sql<number>`sum(${activities.duration})`,
        session_count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime),
          isNotNull(activities.domain)
        )
      )
      .groupBy(activities.domain)
      .orderBy(desc(sql`sum(${activities.duration})`))
      .all();

    return results as Array<{
      domain: string;
      total_duration: number;
      session_count: number;
    }>;
  }

  // Get hourly pattern for productivity analysis
  getHourlyPattern(
    startTime: number,
    endTime: number
  ): Array<{ hour: string; category: Category; total_duration: number }> {
    const results = this.db
      .select({
        hour: sql<string>`strftime('%H', datetime(${activities.startTime}/1000, 'unixepoch', 'localtime'))`,
        category: activities.category,
        total_duration: sql<number>`sum(${activities.duration})`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime)
        )
      )
      .groupBy(
        sql`strftime('%H', datetime(${activities.startTime}/1000, 'unixepoch', 'localtime'))`,
        activities.category
      )
      .orderBy(sql`hour`)
      .all();

    return results as Array<{
      hour: string;
      category: Category;
      total_duration: number;
    }>;
  }

  // Get daily totals for the last N days
  getDailyTotals(
    days: number
  ): Array<{ date: string; total_duration: number; session_count: number }> {
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const results = this.db
      .select({
        date: sql<string>`date(datetime(${activities.startTime}/1000, 'unixepoch', 'localtime'))`,
        total_duration: sql<number>`sum(${activities.duration})`,
        session_count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(gte(activities.startTime, startTime))
      .groupBy(sql`date(datetime(${activities.startTime}/1000, 'unixepoch', 'localtime'))`)
      .orderBy(desc(sql`date`))
      .all();

    return results;
  }

  // Get total tracked time in range
  getTotalTrackedTime(startTime: number, endTime: number): number {
    const result = this.db
      .select({
        total: sql<number>`sum(${activities.duration})`,
      })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startTime),
          lte(activities.startTime, endTime)
        )
      )
      .get();

    return result?.total ?? 0;
  }

  // Map database row to ActivityRecord (for compatibility)
  private mapToRecord(row: Activity): ActivityRecord {
    return {
      id: row.id,
      app_name: row.appName,
      window_title: row.windowTitle,
      url: row.url,
      category: row.category,
      project_name: row.projectName,
      file_name: row.fileName,
      file_type: row.fileType,
      language: row.language,
      domain: row.domain,
      start_time: row.startTime,
      end_time: row.endTime,
      duration: row.duration,
      context_json: row.contextJson,
      created_at: row.createdAt,
    };
  }

  // Close is not needed with Drizzle, but keep for API compatibility
  close(): void {
    // Drizzle handles connection management
  }
}

export default ActivityDatabase;
