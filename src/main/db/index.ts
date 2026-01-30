import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import * as schema from "./schema";
import { categories, categoryRules } from "./schema";

const DB_VERSION = 2; // Bump this to force a DB reset + re-seed

// Default category seed data
const DEFAULT_CATEGORIES = [
  {
    name: "development",
    color: "#6366F1",
    rules: {
      apps: [
        "Code", "Visual Studio Code", "VS Code", "WebStorm", "IntelliJ",
        "PyCharm", "Xcode", "Android Studio", "Terminal", "WezTerm",
        "iTerm", "Warp", "Hyper", "Alacritty", "kitty", "Electron",
      ],
      domains: [
        "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com",
        "npmjs.com", "localhost",
      ],
      keywords: [
        "debug", "coding", "terminal", "git", "npm", "yarn", "build",
        "compile", "deploy", "\\bta\\b", "\\btat\\b", "nvim", "vim",
      ],
    },
  },
  {
    name: "communication",
    color: "#22C55E",
    rules: {
      apps: [
        "Slack", "Discord", "Microsoft Teams", "Zoom", "Skype",
        "Telegram", "WhatsApp", "Messages",
      ],
      domains: [
        "slack.com", "discord.com", "teams.microsoft.com", "zoom.us",
        "meet.google.com",
      ],
      keywords: ["chat", "meeting", "call", "video"],
    },
  },
  {
    name: "social",
    color: "#EAB308",
    rules: {
      apps: ["Twitter", "Facebook", "TweetDeck"],
      domains: [
        "twitter.com", "x.com", "facebook.com", "instagram.com",
        "reddit.com", "linkedin.com", "tiktok.com",
      ],
      keywords: ["social", "feed", "timeline"],
    },
  },
  {
    name: "entertainment",
    color: "#EF4444",
    rules: {
      apps: ["Spotify", "Apple Music", "Netflix", "VLC", "IINA", "Plex"],
      domains: [
        "youtube.com", "netflix.com", "spotify.com", "twitch.tv",
        "hulu.com", "disneyplus.com", "primevideo.com",
      ],
      keywords: ["video", "music", "stream", "watch", "play"],
    },
  },
  {
    name: "productivity",
    color: "#A855F7",
    rules: {
      apps: [
        "Notion", "Obsidian", "Evernote", "Microsoft Word", "Excel",
        "Numbers", "Pages", "Keynote", "PowerPoint",
      ],
      domains: [
        "notion.so", "docs.google.com", "sheets.google.com",
        "slides.google.com", "trello.com", "asana.com", "monday.com",
      ],
      keywords: ["document", "notes", "spreadsheet", "presentation", "task"],
    },
  },
  {
    name: "research",
    color: "#0EA5E9",
    rules: {
      apps: [],
      domains: [
        "google.com/search", "wikipedia.org", "medium.com", "dev.to",
        "arxiv.org", "scholar.google.com",
      ],
      keywords: ["search", "research", "article", "tutorial", "learn", "wiki"],
    },
  },
  {
    name: "email",
    color: "#EC4899",
    rules: {
      apps: ["Mail", "Outlook", "Thunderbird", "Spark", "Airmail"],
      domains: [
        "gmail.com", "outlook.com", "mail.google.com", "mail.yahoo.com",
      ],
      keywords: ["email", "inbox", "compose"],
    },
  },
  {
    name: "design",
    color: "#F97316",
    rules: {
      apps: [
        "Figma", "Sketch", "Adobe Photoshop", "Adobe Illustrator",
        "Adobe XD", "Canva", "Affinity",
      ],
      domains: ["figma.com", "canva.com", "dribbble.com", "behance.net"],
      keywords: ["design", "prototype", "mockup", "ui", "ux"],
    },
  },
  {
    name: "uncategorized",
    color: "#64748B",
    rules: { apps: [], domains: [], keywords: [] },
  },
];

function createDatabase() {
  const dbPath = path.join(app.getPath("userData"), "activity-tracker.db");
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better performance
  sqlite.pragma("journal_mode = WAL");
  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  // Check version and reset if needed
  const currentVersion = sqlite.pragma("user_version", { simple: true }) as number;

  if (currentVersion < DB_VERSION) {
    // Drop all tables and recreate
    sqlite.exec("DROP TABLE IF EXISTS category_rules");
    sqlite.exec("DROP TABLE IF EXISTS activities");
    sqlite.exec("DROP TABLE IF EXISTS sessions");
    sqlite.exec("DROP TABLE IF EXISTS categories");

    // Set new version
    sqlite.pragma(`user_version = ${DB_VERSION}`);
  }

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      pattern TEXT NOT NULL
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      total_duration INTEGER NOT NULL DEFAULT 0,
      activity_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id),
      app_name TEXT NOT NULL,
      window_title TEXT,
      url TEXT,
      category_id INTEGER REFERENCES categories(id),
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

  // Create indexes
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_app_name ON activities(app_name)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_category_id ON activities(category_id)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_project ON activities(project_name)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_start_time ON activities(start_time)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_session_id ON activities(session_id)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time)");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_category_rules_cat ON category_rules(category_id)");

  const db = drizzle(sqlite, { schema });

  // Seed if categories table is empty
  seedDatabase(db);

  return db;
}

function seedDatabase(db: ReturnType<typeof drizzle>) {
  // Check if categories already exist
  const existing = db.select().from(categories).all();
  if (existing.length > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    const result = db
      .insert(categories)
      .values({
        name: cat.name,
        color: cat.color,
        isDefault: 1,
      })
      .returning({ id: categories.id })
      .get();

    const categoryId = result.id;

    const ruleRows: Array<{ categoryId: number; type: string; pattern: string }> = [];

    for (const app of cat.rules.apps) {
      ruleRows.push({ categoryId, type: "app", pattern: app });
    }
    for (const domain of cat.rules.domains) {
      ruleRows.push({ categoryId, type: "domain", pattern: domain });
    }
    for (const keyword of cat.rules.keywords) {
      ruleRows.push({ categoryId, type: "keyword", pattern: keyword });
    }

    if (ruleRows.length > 0) {
      db.insert(categoryRules).values(ruleRows).run();
    }
  }
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
