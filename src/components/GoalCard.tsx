import { useState, useEffect } from "react";
import { Card } from "./Card";
import { formatDuration } from "../utils/time";
import type { CategoryBreakdown, CategoryInfo } from "../types/electron";

interface DailyGoal {
  categoryName: string;
  targetMs: number;
}

const STORAGE_KEY = "daily-goals";
const DEFAULT_GOALS: DailyGoal[] = [
  { categoryName: "development", targetMs: 14400000 }, // 4h
];

function loadGoals(): DailyGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_GOALS;
}

function saveGoals(goals: DailyGoal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function formatHours(ms: number): string {
  const hours = ms / 3600000;
  if (hours >= 1) {
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  return `${Math.round(ms / 60000)}m`;
}

interface GoalRingProps {
  current: number;
  target: number;
  color: string;
  categoryName: string;
}

function GoalRing({ current, target, color, categoryName }: GoalRingProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, target > 0 ? current / target : 0);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white capitalize truncate">{categoryName.replace(/_/g, " ")}</p>
        <p className="text-xs text-grey-500">
          {formatDuration(current)} / {formatHours(target)}
        </p>
      </div>
    </div>
  );
}

interface GoalCardProps {
  categoryBreakdown: CategoryBreakdown[];
}

export function GoalCard({ categoryBreakdown }: GoalCardProps) {
  const [goals, setGoals] = useState<DailyGoal[]>(loadGoals);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newHours, setNewHours] = useState("1");

  useEffect(() => {
    if (editing) {
      window.electronAPI.getCategories().then(setCategories);
    }
  }, [editing]);

  const getCategoryTime = (name: string) => {
    const match = categoryBreakdown.find((c) => c.category_name === name);
    return match?.total_duration ?? 0;
  };

  const getCategoryColor = (name: string) => {
    const match = categoryBreakdown.find((c) => c.category_name === name);
    return match?.category_color ?? "#64748B";
  };

  const addGoal = () => {
    if (!newCategory || !newHours) return;
    const hours = parseFloat(newHours);
    if (isNaN(hours) || hours <= 0) return;
    if (goals.some((g) => g.categoryName === newCategory)) return;

    const updated = [...goals, { categoryName: newCategory, targetMs: hours * 3600000 }];
    setGoals(updated);
    saveGoals(updated);
    setNewCategory("");
    setNewHours("1");
  };

  const removeGoal = (categoryName: string) => {
    const updated = goals.filter((g) => g.categoryName !== categoryName);
    setGoals(updated);
    saveGoals(updated);
  };

  // Filter out categories already in goals for the dropdown
  const availableCategories = categories.filter(
    (c) => !goals.some((g) => g.categoryName === c.name),
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-grey-500">Daily Goals</p>
        <button
          onClick={() => setEditing(!editing)}
          className="text-[11px] text-grey-500 hover:text-grey-300 transition-colors"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {goals.length === 0 && !editing && (
        <p className="text-grey-500 text-sm">No goals set</p>
      )}

      <div className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.categoryName} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <GoalRing
                current={getCategoryTime(goal.categoryName)}
                target={goal.targetMs}
                color={getCategoryColor(goal.categoryName)}
                categoryName={goal.categoryName}
              />
            </div>
            {editing && (
              <button
                onClick={() => removeGoal(goal.categoryName)}
                className="p-1 rounded hover:bg-white/5 transition-all shrink-0"
                title="Remove goal"
              >
                <svg className="w-3.5 h-3.5 text-grey-500 hover:text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none"
            >
              <option value="">Select category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              min="0.5"
              step="0.5"
              className="w-16 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none text-center"
              placeholder="hrs"
            />
            <button
              onClick={addGoal}
              disabled={!newCategory || !newHours}
              className="px-2.5 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
