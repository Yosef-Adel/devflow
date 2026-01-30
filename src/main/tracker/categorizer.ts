import { eq } from "drizzle-orm";
import { getDb, categories, categoryRules, activities, sessions } from "../db";

export interface ActivityInput {
  appName: string;
  title: string;
  url?: string | null;
}

export interface CategoryInfo {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
}

interface CachedCategory {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
  apps: string[];
  domains: string[];
  keywords: string[];
}

class ActivityCategorizer {
  private categoryCache: CachedCategory[] = [];
  private uncategorizedId = 0;

  constructor() {
    this.loadFromDb();
  }

  loadFromDb(): void {
    const db = getDb();

    const allCategories = db.select().from(categories).all();
    const allRules = db.select().from(categoryRules).all();

    // Group rules by category ID
    const rulesByCategory = new Map<
      number,
      { apps: string[]; domains: string[]; keywords: string[] }
    >();
    for (const rule of allRules) {
      if (!rulesByCategory.has(rule.categoryId)) {
        rulesByCategory.set(rule.categoryId, {
          apps: [],
          domains: [],
          keywords: [],
        });
      }
      const bucket = rulesByCategory.get(rule.categoryId)!;
      if (rule.type === "app") bucket.apps.push(rule.pattern);
      else if (rule.type === "domain") bucket.domains.push(rule.pattern);
      else if (rule.type === "keyword") bucket.keywords.push(rule.pattern);
    }

    this.categoryCache = allCategories.map((cat) => {
      const rules = rulesByCategory.get(cat.id) || {
        apps: [],
        domains: [],
        keywords: [],
      };
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        isDefault: cat.isDefault === 1,
        apps: rules.apps,
        domains: rules.domains,
        keywords: rules.keywords,
      };
    });

    // Find uncategorized ID
    const uncategorized = this.categoryCache.find(
      (c) => c.name === "uncategorized",
    );
    this.uncategorizedId = uncategorized?.id ?? 0;
  }

  reloadRules(): void {
    this.loadFromDb();
  }

  categorize(activity: ActivityInput): number {
    const appName = activity.appName.toLowerCase();
    const title = activity.title?.toLowerCase() || "";
    const url = activity.url?.toLowerCase() || "";

    // Priority 1: Check app names first (most reliable)
    for (const cat of this.categoryCache) {
      if (cat.name === "uncategorized") continue;
      if (
        cat.apps.length > 0 &&
        cat.apps.some((app) => appName.includes(app.toLowerCase()))
      ) {
        return cat.id;
      }
    }

    // Priority 2: Check domains
    for (const cat of this.categoryCache) {
      if (cat.name === "uncategorized") continue;
      if (
        cat.domains.length > 0 &&
        url &&
        cat.domains.some((domain) => url.includes(domain))
      ) {
        return cat.id;
      }
    }

    // Priority 3: Check keywords in title/url (least reliable)
    for (const cat of this.categoryCache) {
      if (cat.name === "uncategorized") continue;
      if (cat.keywords.length > 0) {
        const combinedText = `${title} ${url}`;
        const matched = cat.keywords.some((keyword) => {
          if (keyword.includes("\\b")) {
            const regex = new RegExp(keyword, "i");
            return regex.test(combinedText);
          }
          return combinedText.includes(keyword);
        });
        if (matched) {
          return cat.id;
        }
      }
    }

    return this.uncategorizedId;
  }

  getCategoryColor(categoryId: number): string {
    const cat = this.categoryCache.find((c) => c.id === categoryId);
    return cat?.color ?? "#64748B";
  }

  getCategoryName(categoryId: number): string {
    const cat = this.categoryCache.find((c) => c.id === categoryId);
    return cat?.name ?? "uncategorized";
  }

  getUncategorizedId(): number {
    return this.uncategorizedId;
  }

  getAllCategories(): CategoryInfo[] {
    return this.categoryCache.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      isDefault: c.isDefault,
    }));
  }

  // CRUD operations

  createCategory(name: string, color: string): number {
    const db = getDb();
    const result = db
      .insert(categories)
      .values({ name, color, isDefault: 0 })
      .returning({ id: categories.id })
      .get();
    this.loadFromDb();
    return result.id;
  }

  updateCategory(id: number, updates: { name?: string; color?: string }): void {
    const db = getDb();
    const setValues: Record<string, string> = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.color !== undefined) setValues.color = updates.color;
    if (Object.keys(setValues).length === 0) return;

    db.update(categories).set(setValues).where(eq(categories.id, id)).run();
    this.loadFromDb();
  }

  deleteCategory(id: number): void {
    const db = getDb();
    // Reassign activities and sessions to uncategorized before deleting
    db.update(activities)
      .set({ categoryId: this.uncategorizedId })
      .where(eq(activities.categoryId, id))
      .run();
    db.update(sessions)
      .set({ categoryId: this.uncategorizedId })
      .where(eq(sessions.categoryId, id))
      .run();
    // Rules are cascade-deleted
    db.delete(categories).where(eq(categories.id, id)).run();
    this.loadFromDb();
  }

  addRule(categoryId: number, type: string, pattern: string): number {
    const db = getDb();
    const result = db
      .insert(categoryRules)
      .values({ categoryId, type, pattern })
      .returning({ id: categoryRules.id })
      .get();
    this.loadFromDb();
    return result.id;
  }

  removeRule(ruleId: number): void {
    const db = getDb();
    db.delete(categoryRules).where(eq(categoryRules.id, ruleId)).run();
    this.loadFromDb();
  }

  getCategoryRules(
    categoryId: number,
  ): Array<{ id: number; type: string; pattern: string }> {
    const db = getDb();
    return db
      .select({
        id: categoryRules.id,
        type: categoryRules.type,
        pattern: categoryRules.pattern,
      })
      .from(categoryRules)
      .where(eq(categoryRules.categoryId, categoryId))
      .all();
  }
}

export default ActivityCategorizer;
