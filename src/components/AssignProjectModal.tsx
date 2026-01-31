import { useEffect, useState } from "react";
import type { SessionWithActivities, ProjectInfo } from "../types/electron";

interface AssignProjectModalProps {
  session: SessionWithActivities;
  onClose: () => void;
  onSave: () => void;
}

export function AssignProjectModal({ session, onClose, onSave }: AssignProjectModalProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    window.electronAPI.getProjects().then((projs) => {
      setProjects(projs);

      // Auto-suggest: check if any activity has an auto-detected project_name
      // and fuzzy-match it against user's project list
      const detectedName = session.activities.find((a) => a.project_name)?.project_name;
      if (detectedName) {
        const match = projs.find(
          (p) => p.name.toLowerCase() === detectedName.toLowerCase()
        );
        if (match) {
          setSelectedProjectId(match.id);
        }
      }
    });
  }, [session]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedProjectId) {
        await window.electronAPI.assignSessionToProject(session.id, selectedProjectId);
      } else {
        await window.electronAPI.unassignSessionFromProject(session.id);
      }
      onSave();
    } catch (err) {
      console.error("Failed to assign project:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const detectedName = session.activities.find((a) => a.project_name)?.project_name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111113] border border-white/[0.06] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white mb-2">Assign to Project</h3>
          <div className="space-y-1">
            <p className="text-xs text-grey-300 truncate">{session.app_name}</p>
            {session.activities.length > 0 && (
              <p className="text-xs text-grey-500 truncate">
                {session.activities[0].window_title}
              </p>
            )}
            {detectedName && (
              <p className="text-[10px] text-info">
                Detected: {detectedName}
              </p>
            )}
          </div>
        </div>

        {/* Project list */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-grey-500 mb-3">
            Pick a project
          </p>

          {projects.length === 0 ? (
            <p className="text-xs text-grey-500 text-center py-4">
              No projects yet. Create one in Settings.
            </p>
          ) : (
            <div className="space-y-1.5">
              {/* None option */}
              <button
                onClick={() => setSelectedProjectId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                  selectedProjectId === null
                    ? "bg-white/10 ring-1 ring-white/20"
                    : "bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-grey-700" />
                <span className={selectedProjectId === null ? "text-white" : "text-grey-400"}>
                  None
                </span>
              </button>

              {projects.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                      isSelected
                        ? "bg-white/10 ring-1 ring-white/20"
                        : "bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span className={isSelected ? "text-white" : "text-grey-400"}>
                      {proj.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-grey-400 hover:text-white rounded-md hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-white hover:bg-primary-dark"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
