import { Notification } from "electron";
import type ActivityDatabase from "./tracker/database";

interface DailyGoal {
  categoryName: string;
  targetMs: number;
}

export class NotificationManager {
  private db: ActivityDatabase;
  private notifiedGoalsToday = new Set<string>();
  private lastNotifiedDate: string | null = null;
  private breakTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBreakNotification = 0;

  constructor(db: ActivityDatabase) {
    this.db = db;
  }

  /** Called when user becomes active (activity started or changed). */
  onActivityStarted(): void {
    if (!this.isBreakRemindersEnabled()) return;
    this.resetBreakTimer();
  }

  /** Called when user goes idle. Clears break timer since they're resting. */
  onIdle(): void {
    this.clearBreakTimer();
  }

  /** Called when tracking is paused. */
  onPaused(): void {
    this.clearBreakTimer();
  }

  /** Check if any daily goals have been reached and fire notifications. */
  checkGoals(): void {
    if (!this.isEnabled()) return;

    // Reset notified set if the date has changed
    const today = new Date().toDateString();
    if (this.lastNotifiedDate !== today) {
      this.notifiedGoalsToday.clear();
      this.lastNotifiedDate = today;
    }

    const goalsJson = this.db.getSetting("daily_goals");
    if (!goalsJson) return;

    let goals: DailyGoal[];
    try {
      goals = JSON.parse(goalsJson);
      if (!Array.isArray(goals)) return;
    } catch {
      return;
    }

    // Get today's start timestamp
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTs = startOfToday.getTime();

    const breakdown = this.db.getCategoryBreakdown(startTs, now);

    for (const goal of goals) {
      if (this.notifiedGoalsToday.has(goal.categoryName)) continue;

      const match = breakdown.find((c) => c.category_name === goal.categoryName);
      const currentMs = match?.total_duration ?? 0;

      if (currentMs >= goal.targetMs) {
        this.notifiedGoalsToday.add(goal.categoryName);
        const label = goal.categoryName.replace(/_/g, " ");
        const hours = (goal.targetMs / 3600000).toFixed(1).replace(/\.0$/, "");
        new Notification({
          title: "Goal reached!",
          body: `You hit your ${label} goal of ${hours}h.`,
        }).show();
      }
    }
  }

  /** Clean up timers. */
  shutdown(): void {
    this.clearBreakTimer();
  }

  // --- Private helpers ---

  private isEnabled(): boolean {
    const val = this.db.getSetting("notifications_enabled");
    return val !== "false"; // defaults to enabled
  }

  private isBreakRemindersEnabled(): boolean {
    if (!this.isEnabled()) return false;
    const val = this.db.getSetting("break_reminders_enabled");
    return val !== "false"; // defaults to enabled
  }

  private getBreakIntervalMs(): number {
    const val = this.db.getSetting("break_interval_minutes");
    const minutes = val ? parseInt(val, 10) : 60;
    return (isNaN(minutes) || minutes < 1 ? 60 : minutes) * 60_000;
  }

  private resetBreakTimer(): void {
    this.clearBreakTimer();
    const intervalMs = this.getBreakIntervalMs();
    this.breakTimer = setTimeout(() => {
      this.fireBreakReminder(intervalMs);
    }, intervalMs);
  }

  private clearBreakTimer(): void {
    if (this.breakTimer) {
      clearTimeout(this.breakTimer);
      this.breakTimer = null;
    }
  }

  private fireBreakReminder(intervalMs: number): void {
    const now = Date.now();
    // Guard: minimum 5 min between break notifications
    if (now - this.lastBreakNotification < 5 * 60_000) return;

    this.lastBreakNotification = now;
    const minutes = Math.round(intervalMs / 60_000);
    new Notification({
      title: "Time for a break!",
      body: `You've been working for ${minutes} minutes.`,
    }).show();
  }
}
