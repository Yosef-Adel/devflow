import { autoUpdater } from "electron-updater";
import { log } from "./logger";

export interface UpdateStatus {
  state:
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  version?: string;
  percent?: number;
  error?: string;
}

export function initAutoUpdater(
  onStatusChange: (status: UpdateStatus) => void,
) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;

  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Yosef-Adel",
    repo: "activity-tracker",
  });

  autoUpdater.on("checking-for-update", () => {
    onStatusChange({ state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    onStatusChange({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    onStatusChange({ state: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    onStatusChange({ state: "downloading", percent: progress.percent });
  });

  autoUpdater.on("update-downloaded", (info) => {
    onStatusChange({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err) => {
    // Log the error but don't notify users - this prevents showing errors
    // when the release YAML files aren't published (common with Electron Forge)
    log.warn("Update error:", err.message);
  });

  // Check on startup after a delay so the app loads first
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      // Silently catch network/configuration errors
      log.warn("Auto-update check failed:", err.message);
    });
  }, 10_000);
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("Manual update check failed:", err.message);
  });
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate();
}

export function installUpdate() {
  autoUpdater.quitAndInstall();
}
