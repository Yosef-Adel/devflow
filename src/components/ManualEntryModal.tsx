import { useEffect, useState } from "react";
import type { CategoryInfo } from "../types/electron";

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: () => void;
}

export function ManualEntryModal({ onClose, onSave }: ManualEntryModalProps) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [appName, setAppName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.electronAPI.getCategories().then(setCategories);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    setStartDate(dateStr);
    setStartTime(timeStr);
    setEndDate(dateStr);
    setEndTime(timeStr);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setError("");

    if (!appName.trim()) {
      setError("Activity name is required");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Start and end times are required");
      return;
    }

    const startTimestamp = new Date(`${startDate}T${startTime}`).getTime();
    const endTimestamp = new Date(`${endDate}T${endTime}`).getTime();

    if (endTimestamp <= startTimestamp) {
      setError("End time must be after start time");
      return;
    }

    setIsSaving(true);
    try {
      await window.electronAPI.createManualEntry({
        app_name: appName.trim(),
        category_id: categoryId,
        start_time: startTimestamp,
        end_time: endTimestamp,
        notes: notes.trim() || undefined,
        window_title: appName.trim(),
      });
      onSave();
    } catch {
      setError("Failed to create entry");
    } finally {
      setIsSaving(false);
    }
  };

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
          <h3 className="text-sm font-semibold text-white">Add Manual Time Entry</h3>
          <p className="text-xs text-grey-500 mt-1">
            Record time for meetings, offline work, or other activities
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-grey-500 mb-1.5">
              Activity Name
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g., Team Meeting, Offline Work"
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-grey-600 focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-grey-500 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                    categoryId === cat.id
                      ? "bg-white/10 ring-1 ring-white/20"
                      : "bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className={categoryId === cat.id ? "text-white" : "text-grey-400"}>
                    {cat.name.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-grey-500 mb-1.5">
                Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none focus:border-primary/50 mb-1"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-grey-500 mb-1.5">
                End
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none focus:border-primary/50 mb-1"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-grey-500 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-grey-600 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}
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
            {isSaving ? "Saving..." : "Add Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
