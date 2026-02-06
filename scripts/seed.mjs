#!/usr/bin/env node

/**
 * Seed script for devflow database.
 * Generates realistic activity data spanning the last 30 days.
 * Uses sqlite3 CLI to avoid native module version mismatch with Electron.
 *
 * Usage: node scripts/seed.mjs
 */

import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

const dbPath = path.join(
  os.homedir(),
  "Library/Application Support/devflow/devflow.db"
);

// Ensure dir exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

function sql(query) {
  execSync(`sqlite3 "${dbPath}" "${query.replace(/"/g, '\\"')}"`, { stdio: "pipe" });
}

// Create tables
sql(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL,
    category TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    total_duration INTEGER NOT NULL DEFAULT 0,
    activity_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

sql(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
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
  );
`);

// --- Data templates ---

const devFiles = [
  { name: "App.tsx", type: "tsx", lang: "React TypeScript" },
  { name: "index.ts", type: "ts", lang: "TypeScript" },
  { name: "useAuth.ts", type: "ts", lang: "TypeScript" },
  { name: "Button.tsx", type: "tsx", lang: "React TypeScript" },
  { name: "api.ts", type: "ts", lang: "TypeScript" },
  { name: "schema.prisma", type: "prisma", lang: "Prisma" },
  { name: "tailwind.config.ts", type: "ts", lang: "TypeScript" },
  { name: "page.tsx", type: "tsx", lang: "React TypeScript" },
  { name: "layout.tsx", type: "tsx", lang: "React TypeScript" },
  { name: "middleware.ts", type: "ts", lang: "TypeScript" },
  { name: "utils.py", type: "py", lang: "Python" },
  { name: "main.go", type: "go", lang: "Go" },
];

const projects = ["composable", "devflow", "my-saas", "portfolio", "api-gateway"];

const websites = [
  { domain: "github.com", url: "https://github.com/Yosef-Adel/composable", title: "Yosef-Adel/composable", category: "development", project: "Yosef-Adel/composable" },
  { domain: "github.com", url: "https://github.com/Yosef-Adel/devflow", title: "Yosef-Adel/devflow", category: "development", project: "Yosef-Adel/devflow" },
  { domain: "stackoverflow.com", url: "https://stackoverflow.com/questions/12345/react-hooks", title: "React hooks question - Stack Overflow", category: "research" },
  { domain: "chat.openai.com", url: "https://chat.openai.com", title: "ChatGPT", category: "research" },
  { domain: "docs.google.com", url: "https://docs.google.com/document/d/abc", title: "Project Spec - Google Docs", category: "productivity" },
  { domain: "figma.com", url: "https://figma.com/file/xyz", title: "Dashboard Design - Figma", category: "design" },
  { domain: "youtube.com", url: "https://youtube.com/watch?v=abc", title: "React Server Components Explained - YouTube", category: "entertainment" },
  { domain: "twitter.com", url: "https://twitter.com/home", title: "X / Home", category: "social" },
  { domain: "reddit.com", url: "https://reddit.com/r/programming", title: "r/programming - Reddit", category: "social" },
  { domain: "slack.com", url: "https://app.slack.com/client/T123/C456", title: "Slack - general", category: "communication" },
  { domain: "mail.google.com", url: "https://mail.google.com/mail/u/0/", title: "Inbox - Gmail", category: "email" },
  { domain: "notion.so", url: "https://notion.so/workspace/sprint-board", title: "Sprint Board - Notion", category: "productivity" },
  { domain: "vercel.com", url: "https://vercel.com/dashboard", title: "Dashboard - Vercel", category: "development" },
  { domain: "ui.shadcn.com", url: "https://ui.shadcn.com/docs/components/button", title: "Button - shadcn/ui", category: "research" },
  { domain: "npmjs.com", url: "https://npmjs.com/package/drizzle-orm", title: "drizzle-orm - npm", category: "research" },
  { domain: "netflix.com", url: "https://netflix.com/browse", title: "Netflix", category: "entertainment" },
  { domain: "discord.com", url: "https://discord.com/channels/123/456", title: "Discord - dev-chat", category: "communication" },
];

const terminalCommands = [
  "npm run dev", "git status", "git push", "npm install", "docker compose up",
  "pnpm build", "vitest", "eslint .", "prisma migrate dev",
];

const apps = [
  { name: "Code", category: "development", weight: 30 },
  { name: "WezTerm", category: "development", weight: 15 },
  { name: "Google Chrome", category: "research", weight: 20 },
  { name: "Slack", category: "communication", weight: 8 },
  { name: "Discord", category: "communication", weight: 4 },
  { name: "Notion", category: "productivity", weight: 5 },
  { name: "Finder", category: "uncategorized", weight: 3 },
  { name: "Figma", category: "design", weight: 5 },
  { name: "Spotify", category: "entertainment", weight: 5 },
  { name: "Messages", category: "communication", weight: 3 },
  { name: "Preview", category: "uncategorized", weight: 2 },
];

const totalWeight = apps.reduce((s, a) => s + a.weight, 0);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPickApp() {
  let r = Math.random() * totalWeight;
  for (const a of apps) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return apps[0];
}

function esc(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function generateActivityForApp(app, startTime) {
  const durationMs = randBetween(5000, 180000);
  const endTime = startTime + durationMs;

  let windowTitle = "";
  let url = null;
  let projectName = null;
  let fileName = null;
  let fileType = null;
  let language = null;
  let domain = null;
  let category = app.category;

  if (app.name === "Code") {
    const file = pick(devFiles);
    const project = pick(projects);
    windowTitle = `${file.name} — ${project}`;
    projectName = project;
    fileName = file.name;
    fileType = file.type;
    language = file.lang;
  } else if (app.name === "WezTerm") {
    const cmd = pick(terminalCommands);
    const project = pick(projects);
    windowTitle = `~/dev/${project}: ${cmd}`;
    projectName = project;
  } else if (app.name === "Google Chrome") {
    const site = pick(websites);
    windowTitle = site.title;
    url = site.url;
    domain = site.domain;
    category = site.category;
    if (site.project) projectName = site.project;
  } else if (app.name === "Slack") {
    windowTitle = pick(["general - Slack", "dev-team - Slack", "random - Slack", "DM - John - Slack"]);
  } else if (app.name === "Discord") {
    windowTitle = pick(["Discord - dev-chat", "Discord - general", "Discord - Voice Channel"]);
  } else if (app.name === "Notion") {
    windowTitle = pick(["Sprint Board - Notion", "Meeting Notes - Notion", "API Docs - Notion", "Roadmap - Notion"]);
    category = "productivity";
  } else if (app.name === "Figma") {
    windowTitle = pick(["Dashboard Design - Figma", "Landing Page - Figma", "Component Library - Figma"]);
  } else if (app.name === "Spotify") {
    windowTitle = pick(["Spotify - Lo-fi Beats", "Spotify - Coding Music", "Spotify - Jazz Vibes"]);
  } else if (app.name === "Messages") {
    windowTitle = "Messages";
  } else if (app.name === "Finder") {
    windowTitle = pick(["Downloads", "Documents", "Desktop", "Applications"]);
  } else if (app.name === "Preview") {
    windowTitle = pick(["screenshot.png", "design-spec.pdf", "wireframe.png"]);
  }

  return { appName: app.name, windowTitle, url, category, projectName, fileName, fileType, language, domain, startTime, endTime, duration: durationMs };
}

// --- Generate data for the last 30 days ---

const NOW = Date.now();
const DAYS = 30;

let totalActivities = 0;
let totalSessions = 0;

// Build all SQL statements and execute in one batch
const statements = ["BEGIN TRANSACTION;"];

for (let d = 0; d < DAYS; d++) {
  const dayStart = new Date(NOW - d * 24 * 60 * 60 * 1000);
  dayStart.setHours(0, 0, 0, 0);

  const dayOfWeek = dayStart.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const workStartHour = isWeekend ? 10 : randBetween(7, 9);
  const workEndHour = isWeekend ? 18 : randBetween(19, 22);
  const sessionsForDay = isWeekend ? randBetween(5, 15) : randBetween(15, 40);

  let cursor = dayStart.getTime() + workStartHour * 60 * 60 * 1000;
  const dayEnd = dayStart.getTime() + workEndHour * 60 * 60 * 1000;

  for (let s = 0; s < sessionsForDay && cursor < dayEnd; s++) {
    const app = weightedPickApp();
    const activityCount = randBetween(1, 8);
    const sessionStart = cursor;
    const sessionActivities = [];

    for (let a = 0; a < activityCount && cursor < dayEnd; a++) {
      const activity = generateActivityForApp(app, cursor);
      sessionActivities.push(activity);
      cursor = activity.endTime;
    }

    if (sessionActivities.length === 0) continue;

    const sessionEnd = sessionActivities[sessionActivities.length - 1].endTime;
    const sessionDuration = sessionEnd - sessionStart;

    totalSessions++;

    statements.push(
      `INSERT INTO sessions (app_name, category, start_time, end_time, total_duration, activity_count) VALUES (${esc(app.name)}, ${esc(app.category)}, ${sessionStart}, ${sessionEnd}, ${sessionDuration}, ${sessionActivities.length});`
    );

    for (const act of sessionActivities) {
      totalActivities++;
      statements.push(
        `INSERT INTO activities (session_id, app_name, window_title, url, category, project_name, file_name, file_type, language, domain, start_time, end_time, duration, context_json) VALUES (last_insert_rowid(), ${esc(act.appName)}, ${esc(act.windowTitle)}, ${esc(act.url)}, ${esc(act.category)}, ${esc(act.projectName)}, ${esc(act.fileName)}, ${esc(act.fileType)}, ${esc(act.language)}, ${esc(act.domain)}, ${act.startTime}, ${act.endTime}, ${act.duration}, NULL);`
      );
    }

    // Gap between sessions
    cursor += randBetween(30000, 900000);
  }
}

statements.push("COMMIT;");

// Write to temp file and execute (avoid shell argument length limits)
const tmpFile = path.join(os.tmpdir(), "devflow-seed.sql");
fs.writeFileSync(tmpFile, statements.join("\n"));

try {
  execSync(`sqlite3 "${dbPath}" < "${tmpFile}"`, { stdio: "inherit" });
  console.log(`Seeded ${totalSessions} sessions and ${totalActivities} activities over ${DAYS} days.`);
} finally {
  fs.unlinkSync(tmpFile);
}
