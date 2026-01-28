import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Activities table - stores all tracked window activities
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appName: text("app_name").notNull(),
  windowTitle: text("window_title"),
  url: text("url"),
  category: text("category"),
  projectName: text("project_name"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  language: text("language"),
  domain: text("domain"),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  duration: integer("duration").notNull(),
  contextJson: text("context_json"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript types inferred from schema
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
