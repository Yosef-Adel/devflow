import { useEffect, useState, useCallback, useRef } from "react";
import type { ActivePomodoro } from "../types/electron";

interface PomodoroTimerProps {
  onComplete: () => void;
}

export function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [activePomodoro, setActivePomodoro] = useState<ActivePomodoro | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("25");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"work" | "break">("work");
  const completingRef = useRef(false);

  const loadActivePomodoro = useCallback(async () => {
    const active = await window.electronAPI.getActivePomodoro();
    setActivePomodoro(active);

    if (active) {
      const elapsed = Date.now() - active.start_time;
      const remaining = Math.max(0, active.duration - elapsed);
      setTimeRemaining(remaining);
    }
  }, []);

  useEffect(() => {
    loadActivePomodoro();
  }, [loadActivePomodoro]);

  const handleComplete = useCallback(async () => {
    if (!activePomodoro || completingRef.current) return;
    completingRef.current = true;

    try {
      const pomodoroStart = activePomodoro.start_time;
      const pomodoroEnd = Date.now();
      const allActivities = await window.electronAPI.getActivities(pomodoroStart, pomodoroEnd);
      const activityIds = allActivities.map((a) => a.id);

      if (activityIds.length > 0) {
        await window.electronAPI.tagActivitiesWithPomodoro(activePomodoro.id, activityIds);
      }

      await window.electronAPI.completePomodoro(activePomodoro.id);
      setActivePomodoro(null);
      setTimeRemaining(0);
      onComplete();
    } finally {
      completingRef.current = false;
    }
  }, [activePomodoro, onComplete]);

  // Countdown timer
  useEffect(() => {
    if (!activePomodoro) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - activePomodoro.start_time;
      const remaining = Math.max(0, activePomodoro.duration - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePomodoro, handleComplete]);

  const handleStart = async () => {
    const mins = parseInt(customMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 180) return;

    const type = mode === "work" ? "work" : "short_break";
    const duration = mins * 60 * 1000;
    const pomodoroLabel = label.trim() || undefined;

    setIsStarting(true);
    try {
      await window.electronAPI.startPomodoro(type, duration, pomodoroLabel);
      setLabel("");
      await loadActivePomodoro();
    } finally {
      setIsStarting(false);
    }
  };

  const handleAbandon = async () => {
    if (!activePomodoro) return;
    await window.electronAPI.abandonPomodoro(activePomodoro.id);
    setActivePomodoro(null);
    setTimeRemaining(0);
    onComplete();
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // ─── Active pomodoro view ───
  if (activePomodoro) {
    const progress = ((activePomodoro.duration - timeRemaining) / activePomodoro.duration) * 100;
    const circumference = 2 * Math.PI * 112;
    const isWork = activePomodoro.type === "work";
    const typeColor = isWork ? "#6366F1" : "#10B981";

    return (
      <div className="text-center">
        <div className="relative w-64 h-64 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128" cy="128" r="112"
              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
            />
            <circle
              cx="128" cy="128" r="112"
              fill="none" stroke={typeColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold text-white mb-2">{formatTime(timeRemaining)}</p>
            <p className="text-sm text-grey-400 uppercase tracking-wider">
              {isWork ? "Work" : "Break"}
            </p>
            {activePomodoro.label && (
              <p className="text-xs text-grey-500 mt-2 max-w-[180px] truncate">{activePomodoro.label}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleComplete}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-all"
          >
            Complete
          </button>
          <button
            onClick={handleAbandon}
            className="px-6 py-2.5 bg-error/10 hover:bg-error/20 text-error rounded-lg text-sm font-medium transition-all"
          >
            Abandon
          </button>
        </div>
      </div>
    );
  }

  // ─── Setup view ───
  const presets = [
    { label: "25", minutes: "25" },
    { label: "15", minutes: "15" },
    { label: "5", minutes: "5" },
    { label: "45", minutes: "45" },
  ];

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex bg-white/[0.04] rounded-lg p-1">
          <button
            onClick={() => { setMode("work"); setCustomMinutes("25"); }}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "work"
                ? "bg-[#6366F1]/20 text-[#6366F1]"
                : "text-grey-400 hover:text-white"
            }`}
          >
            Work
          </button>
          <button
            onClick={() => { setMode("break"); setCustomMinutes("5"); }}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "break"
                ? "bg-[#10B981]/20 text-[#10B981]"
                : "text-grey-400 hover:text-white"
            }`}
          >
            Break
          </button>
        </div>
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <input
          type="number"
          min={1}
          max={180}
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          className="w-24 px-3 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-4xl font-bold text-white text-center focus:outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-lg text-grey-500 ml-1">min</span>
      </div>

      {/* Presets */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {presets.map((p) => (
          <button
            key={p.minutes}
            onClick={() => setCustomMinutes(p.minutes)}
            className={`px-4 py-1.5 text-xs rounded-full transition-all ${
              customMinutes === p.minutes
                ? "bg-white/10 text-white"
                : "text-grey-500 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {p.label}m
          </button>
        ))}
      </div>

      {/* Label input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="What are you working on?"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-grey-600 focus:outline-none focus:border-primary/50 transition-all"
        />
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={isStarting}
        className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
          mode === "work"
            ? "bg-[#6366F1] hover:bg-[#4F46E5] text-white"
            : "bg-[#10B981] hover:bg-[#059669] text-white"
        }`}
      >
        {isStarting ? "Starting..." : "Start"}
      </button>
    </div>
  );
}
