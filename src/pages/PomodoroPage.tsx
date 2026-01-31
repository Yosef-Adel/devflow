import { useEffect, useState } from "react";
import { Card, PomodoroTimer } from "../components";
import { formatDuration } from "../utils/time";
import type { PomodoroRecord, ActivityRecord } from "../types/electron";

export function PomodoroPage() {
  const [pomodoros, setPomodoros] = useState<PomodoroRecord[]>([]);
  const [expandedPomodoro, setExpandedPomodoro] = useState<number | null>(null);
  const [pomodoroActivities, setPomodoroActivities] = useState<Record<number, ActivityRecord[]>>({});

  const loadPomodoros = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = await window.electronAPI.getPomodoros(today.getTime(), Date.now());
    setPomodoros(data);
  };

  useEffect(() => {
    loadPomodoros();
  }, []);

  const togglePomodoro = async (pomodoroId: number) => {
    if (expandedPomodoro === pomodoroId) {
      setExpandedPomodoro(null);
    } else {
      setExpandedPomodoro(pomodoroId);
      if (!pomodoroActivities[pomodoroId]) {
        const acts = await window.electronAPI.getActivitiesForPomodoro(pomodoroId);
        setPomodoroActivities((prev) => ({ ...prev, [pomodoroId]: acts }));
      }
    }
  };

  const [deletingPomodoroId, setDeletingPomodoroId] = useState<number | null>(null);

  const handleDeletePomodoro = async (pomodoroId: number) => {
    await window.electronAPI.deletePomodoro(pomodoroId);
    setDeletingPomodoroId(null);
    await loadPomodoros();
  };

  const completedWork = pomodoros.filter((p) => p.completed === 1 && p.type === "work");
  const totalWorkTime = completedWork.reduce((sum, p) => sum + p.duration, 0);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Pomodoro Timer</h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Timer */}
        <Card className="xl:col-span-2">
          <PomodoroTimer onComplete={loadPomodoros} />
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{completedWork.length}</p>
              <p className="text-sm text-grey-400">Completed Today</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">{formatDuration(totalWorkTime)}</p>
              <p className="text-sm text-grey-400">Focus Time</p>
            </div>
          </Card>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-medium text-grey-400 mb-3">Today&apos;s Pomodoros</h3>

        {pomodoros.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-6 h-6 text-grey-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-grey-400 mb-1">No pomodoros yet today</p>
              <p className="text-grey-600 text-sm">Start a pomodoro to begin tracking your focus time</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {pomodoros.map((pomodoro) => {
              const isExpanded = expandedPomodoro === pomodoro.id;
              const acts = pomodoroActivities[pomodoro.id] || [];
              const typeLabel = pomodoro.type.replace(/_/g, " ");
              const typeColor = pomodoro.type === "work" ? "#6366F1" : "#10B981";

              return (
                <Card key={pomodoro.id} noPadding>
                  <div
                    className="group flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => togglePomodoro(pomodoro.id)}
                  >
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: typeColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm capitalize">{typeLabel}</span>
                        <span
                          className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded"
                          style={{
                            backgroundColor: typeColor + "20",
                            color: typeColor,
                          }}
                        >
                          {pomodoro.completed ? "Completed" : "Abandoned"}
                        </span>
                        {pomodoro.label && (
                          <span className="text-xs text-grey-400">{pomodoro.label}</span>
                        )}
                      </div>
                      {!isExpanded && acts.length > 0 && (
                        <p className="text-xs text-grey-500">
                          {acts.length} activit{acts.length === 1 ? "y" : "ies"} tracked
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-grey-500">
                        {new Date(pomodoro.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm font-medium text-white">
                        {formatDuration(pomodoro.duration)}
                      </p>
                    </div>
                    {deletingPomodoroId === pomodoro.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeletePomodoro(pomodoro.id)}
                          className="p-1 rounded hover:bg-error/20 transition-all text-error"
                          title="Confirm delete"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingPomodoroId(null)}
                          className="p-1 rounded hover:bg-white/10 transition-all text-grey-500"
                          title="Cancel"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingPomodoroId(pomodoro.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 transition-all"
                        title="Delete pomodoro"
                      >
                        <svg className="w-3 h-3 text-grey-500 hover:text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-grey-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded Activities */}
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 ml-5 border-l border-white/[0.06] space-y-1">
                        {acts.length === 0 ? (
                          <p className="text-xs text-grey-500 py-2 pl-4">No activities tracked during this pomodoro</p>
                        ) : (
                          acts.map((activity, index) => (
                            <div
                              key={activity.id}
                              className="flex items-center gap-4 py-2 pl-4 rounded hover:bg-white/[0.02] transition-all duration-300"
                              style={{
                                opacity: isExpanded ? 1 : 0,
                                transform: isExpanded ? "translateY(0)" : "translateY(-10px)",
                                transitionDelay: isExpanded ? `${index * 30}ms` : "0ms",
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-grey-300 truncate">{activity.window_title}</p>
                                <p className="text-xs text-grey-500">{activity.app_name}</p>
                              </div>
                              <p className="text-xs text-grey-400">{formatDuration(activity.duration)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
