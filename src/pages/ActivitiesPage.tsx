import { useEffect, useState } from "react";
import { Card, RecategorizeModal, AssignProjectModal, ManualEntryModal } from "../components";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchSessions, setDateRangeToday, setDateRangeWeek, setCurrentActivity } from "../store/slices";
import { formatDuration, formatTime } from "../utils/time";
import type { SessionWithActivities } from "../types/electron";

export function ActivitiesPage() {
  const dispatch = useAppDispatch();
  const { sessions, dateRange } = useAppSelector((state) => state.tracking);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [recategorizeSession, setRecategorizeSession] = useState<SessionWithActivities | null>(null);
  const [assignProjectSession, setAssignProjectSession] = useState<SessionWithActivities | null>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);

  const toggleSession = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (viewMode === "today") {
      dispatch(setDateRangeToday());
    } else {
      dispatch(setDateRangeWeek());
    }
  }, [dispatch, viewMode]);

  useEffect(() => {
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));

    const unsubscribe = window.electronAPI.onActivityChanged((activity) => {
      dispatch(setCurrentActivity(activity));
      dispatch(fetchSessions({ start: dateRange.start, end: Date.now() }));
    });

    return () => unsubscribe();
  }, [dispatch, dateRange]);

  // Group sessions by date
  const groupedSessions = sessions.reduce(
    (groups, session) => {
      const date = new Date(session.start_time).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    },
    {} as Record<string, SessionWithActivities[]>,
  );

  // Calculate daily totals
  const dailyTotals = Object.entries(groupedSessions).reduce(
    (totals, [date, daySessions]) => {
      totals[date] = daySessions.reduce((sum, s) => sum + s.total_duration, 0);
      return totals;
    },
    {} as Record<string, number>,
  );

  const handleRecategorizeSave = () => {
    setRecategorizeSession(null);
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));
  };

  const handleProjectSave = () => {
    setAssignProjectSession(null);
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));
  };

  const handleManualEntrySave = () => {
    setShowManualEntryModal(false);
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));
  };

  const handleDeleteActivity = async (activityId: number) => {
    await window.electronAPI.deleteActivity(activityId);
    setDeletingActivityId(null);
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));
  };

  const handleDeleteSession = async (sessionId: number) => {
    await window.electronAPI.deleteSession(sessionId);
    setDeletingSessionId(null);
    dispatch(fetchSessions({ start: dateRange.start, end: dateRange.end }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Activities</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualEntryModal(true)}
            className="px-4 py-1.5 text-sm rounded-md bg-primary hover:bg-primary-dark text-white transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Entry
          </button>
          <button
            onClick={() => setViewMode("today")}
            className={`px-4 py-1.5 text-sm rounded-md transition-all ${
              viewMode === "today"
                ? "bg-white/10 text-white"
                : "text-grey-400 hover:text-white"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-1.5 text-sm rounded-md transition-all ${
              viewMode === "week"
                ? "bg-white/10 text-white"
                : "text-grey-400 hover:text-white"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-6 h-6 text-grey-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-grey-400 mb-1">No activities recorded yet</p>
            <p className="text-grey-600 text-sm">Start using your computer and activities will appear here</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSessions).map(([date, daySessions]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-grey-400">{date}</h3>
                <span className="text-xs text-grey-500">{formatDuration(dailyTotals[date])}</span>
              </div>
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const isExpanded = expandedSessions.has(session.id);
                  const hasMultipleActivities = session.activities.length > 1;
                  const categoryName = session.category_name || "uncategorized";
                  const categoryColor = session.category_color || "#71717a";

                  return (
                    <Card key={session.id} noPadding>
                      <div
                        className={`group flex items-center gap-4 p-4 ${hasMultipleActivities ? "cursor-pointer hover:bg-white/[0.02]" : ""} transition-colors`}
                        onClick={() => hasMultipleActivities && toggleSession(session.id)}
                      >
                        <div
                          className="w-1 self-stretch rounded-full"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm">{session.app_name}</span>
                            {session.is_manual === 1 && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-purple/20 text-purple">
                                Manual
                              </span>
                            )}
                            <span
                              className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded"
                              style={{
                                backgroundColor: categoryColor + "20",
                                color: categoryColor,
                              }}
                            >
                              {categoryName}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecategorizeSession(session);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                              title="Recategorize"
                            >
                              <svg className="w-3 h-3 text-grey-500 hover:text-grey-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignProjectSession(session);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                              title="Assign to project"
                            >
                              <svg className="w-3 h-3 text-grey-500 hover:text-grey-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                              </svg>
                            </button>
                            {deletingSessionId === session.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="p-1 rounded hover:bg-error/20 transition-all text-error"
                                  title="Confirm delete session"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeletingSessionId(null)}
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
                                  setDeletingSessionId(session.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 transition-all"
                                title="Delete session"
                              >
                                <svg className="w-3 h-3 text-grey-500 hover:text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            )}
                            {hasMultipleActivities && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-grey-400">
                                {session.activity_count} items
                              </span>
                            )}
                          </div>
                          {session.notes && (
                            <p className="text-xs text-grey-400 italic truncate">{session.notes}</p>
                          )}
                          {!isExpanded && session.activities.length > 0 && !session.notes && (
                            <p className="text-xs text-grey-500 truncate">
                              {session.activities[0].window_title}
                              {hasMultipleActivities && (
                                <span className="text-grey-600 ml-2">+{session.activity_count - 1} more</span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-grey-500">
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </p>
                          <p className="text-sm font-medium text-white">
                            {formatDuration(session.total_duration)}
                          </p>
                        </div>
                        {hasMultipleActivities && (
                          <svg
                            className={`w-4 h-4 text-grey-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>

                      <div
                        className="grid transition-all duration-300 ease-out"
                        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="px-4 pb-4 ml-5 border-l border-white/[0.06] space-y-1">
                            {session.activities.map((activity, index) => (
                              <div
                                key={activity.id}
                                className="group/activity flex items-center gap-4 py-2 pl-4 rounded hover:bg-white/[0.02] transition-all duration-300"
                                style={{
                                  opacity: isExpanded ? 1 : 0,
                                  transform: isExpanded ? "translateY(0)" : "translateY(-10px)",
                                  transitionDelay: isExpanded ? `${index * 30}ms` : "0ms",
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-grey-300 truncate">
                                    {activity.window_title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    {activity.url && (
                                      <p className="text-xs text-info truncate max-w-xs">{activity.domain || activity.url}</p>
                                    )}
                                    {activity.project_name && (
                                      <p className="text-xs text-primary">
                                        {activity.project_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-xs text-grey-500">
                                  <p>{formatTime(activity.start_time)}</p>
                                  <p className="text-grey-400">{formatDuration(activity.duration)}</p>
                                </div>
                                {deletingActivityId === activity.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteActivity(activity.id)}
                                      className="p-1 rounded hover:bg-error/20 transition-all text-error text-xs"
                                      title="Confirm delete"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setDeletingActivityId(null)}
                                      className="p-1 rounded hover:bg-white/10 transition-all text-grey-500 text-xs"
                                      title="Cancel"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeletingActivityId(activity.id)}
                                    className="opacity-0 group-hover/activity:opacity-100 p-1 rounded hover:bg-error/10 transition-all"
                                    title="Delete activity"
                                  >
                                    <svg className="w-3 h-3 text-grey-500 hover:text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recategorize Modal */}
      {recategorizeSession && (
        <RecategorizeModal
          session={recategorizeSession}
          onClose={() => setRecategorizeSession(null)}
          onSave={handleRecategorizeSave}
        />
      )}

      {/* Assign Project Modal */}
      {assignProjectSession && (
        <AssignProjectModal
          session={assignProjectSession}
          onClose={() => setAssignProjectSession(null)}
          onSave={handleProjectSave}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <ManualEntryModal
          onClose={() => setShowManualEntryModal(false)}
          onSave={handleManualEntrySave}
        />
      )}
    </div>
  );
}
