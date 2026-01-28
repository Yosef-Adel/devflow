import { useEffect, useState } from "react";
import { Card } from "../components";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchActivities, setDateRangeToday, setDateRangeWeek, setCurrentActivity } from "../store/slices";
import { formatDuration, formatTime } from "../utils/time";
import type { ActivityRecord } from "../types/electron";

const CATEGORY_COLORS: Record<string, string> = {
  development: "#6366F1",
  communication: "#22C55E",
  social: "#EAB308",
  entertainment: "#EF4444",
  productivity: "#A855F7",
  research: "#0EA5E9",
  email: "#EC4899",
  design: "#F97316",
  uncategorized: "#64748B",
};

interface ActivitySession {
  id: string;
  app_name: string;
  category: string;
  activities: ActivityRecord[];
  start_time: number;
  end_time: number;
  total_duration: number;
}

// Group consecutive activities by app into sessions
function groupIntoSessions(activities: ActivityRecord[]): ActivitySession[] {
  if (activities.length === 0) return [];

  const sessions: ActivitySession[] = [];
  let currentSession: ActivitySession | null = null;

  for (const activity of activities) {
    if (!currentSession || currentSession.app_name !== activity.app_name) {
      // Start a new session
      currentSession = {
        id: `session-${activity.id}`,
        app_name: activity.app_name,
        category: activity.category,
        activities: [activity],
        start_time: activity.start_time,
        end_time: activity.end_time,
        total_duration: activity.duration,
      };
      sessions.push(currentSession);
    } else {
      // Add to current session
      currentSession.activities.push(activity);
      currentSession.end_time = activity.end_time;
      currentSession.total_duration += activity.duration;
    }
  }

  return sessions;
}

export function ActivitiesPage() {
  const dispatch = useAppDispatch();
  const { activities, dateRange } = useAppSelector((state) => state.tracking);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (sessionId: string) => {
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
    dispatch(fetchActivities({ start: dateRange.start, end: dateRange.end }));

    // Listen for activity changes and refresh
    const unsubscribe = window.electronAPI.onActivityChanged((activity) => {
      dispatch(setCurrentActivity(activity));
      dispatch(fetchActivities({ start: dateRange.start, end: Date.now() }));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, dateRange.start]);

  // Group activities by date, then into sessions
  const groupedByDate = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.start_time).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityRecord[]>,
  );

  const groupedActivities = Object.entries(groupedByDate).reduce(
    (result, [date, dayActivities]) => {
      result[date] = groupIntoSessions(dayActivities);
      return result;
    },
    {} as Record<string, ActivitySession[]>,
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Activities</h2>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(setDateRangeToday())}
            className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary-light transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => dispatch(setDateRangeWeek())}
            className="px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary-light transition-colors"
          >
            Week
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card>
          <p className="text-grey-400 text-center py-8">
            No activities recorded yet. Start using your computer and activities will
            appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, sessions]) => (
            <div key={date}>
              <h3 className="text-lg font-medium mb-3 text-grey-300">{date}</h3>
              <div className="space-y-2">
                {sessions.map((session) => {
                  const isExpanded = expandedSessions.has(session.id);
                  const hasMultipleActivities = session.activities.length > 1;

                  return (
                    <Card key={session.id} className="!p-4">
                      <div
                        className={`flex items-start gap-4 ${hasMultipleActivities ? "cursor-pointer" : ""}`}
                        onClick={() => hasMultipleActivities && toggleSession(session.id)}
                      >
                        <div
                          className="w-1 h-full min-h-[60px] rounded-full"
                          style={{
                            backgroundColor: CATEGORY_COLORS[session.category],
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{session.app_name}</span>
                            <span
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[session.category] + "30",
                                color: CATEGORY_COLORS[session.category],
                              }}
                            >
                              {session.category}
                            </span>
                            {hasMultipleActivities && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-grey-700 text-grey-300">
                                {session.activities.length} files
                              </span>
                            )}
                          </div>
                          {!isExpanded && (
                            <p className="text-sm text-grey-400 truncate">
                              {session.activities[0].window_title}
                              {hasMultipleActivities && (
                                <span className="text-grey-500 ml-2">
                                  +{session.activities.length - 1} more
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm flex items-center gap-3">
                          <div>
                            <p className="text-grey-400">
                              {formatTime(session.start_time)} -{" "}
                              {formatTime(session.end_time)}
                            </p>
                            <p className="font-medium">
                              {formatDuration(session.total_duration)}
                            </p>
                          </div>
                          {hasMultipleActivities && (
                            <span className="text-grey-400 text-lg">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 ml-5 pl-4 border-l border-grey-700 space-y-3">
                          {session.activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start gap-4 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-grey-300 truncate">
                                  {activity.window_title}
                                </p>
                                {activity.url && (
                                  <p className="text-xs text-info truncate">
                                    {activity.url}
                                  </p>
                                )}
                                {activity.project_name && (
                                  <p className="text-xs text-purple">
                                    Project: {activity.project_name}
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-xs text-grey-400">
                                <p>
                                  {formatTime(activity.start_time)} -{" "}
                                  {formatTime(activity.end_time)}
                                </p>
                                <p>{formatDuration(activity.duration)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
