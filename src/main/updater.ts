import { app, shell } from "electron";
import https from "node:https";
import { log } from "./logger";

const GITHUB_OWNER = "Yosef-Adel";
const GITHUB_REPO = "devflow";
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

export interface UpdateStatus {
  state: "checking" | "available" | "not-available" | "error";
  version?: string;
  downloadUrl?: string;
  error?: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

let statusCallback: ((status: UpdateStatus) => void) | null = null;
let latestRelease: GitHubRelease | null = null;

/**
 * Compare two semver versions (e.g., "1.2.0" vs "1.3.0")
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  // Remove 'v' prefix if present
  const cleanA = a.replace(/^v/, "");
  const cleanB = b.replace(/^v/, "");

  const partsA = cleanA.split(".").map(Number);
  const partsB = cleanB.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Fetch the latest release from GitHub API
 */
function fetchLatestRelease(): Promise<GitHubRelease | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      headers: {
        "User-Agent": `${GITHUB_REPO}/${app.getVersion()}`,
        Accept: "application/vnd.github.v3+json",
      },
    };

    const req = https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data) as GitHubRelease;
            resolve(release);
          } else {
            log.warn(`GitHub API returned status ${res.statusCode}`);
            resolve(null);
          }
        } catch (err) {
          log.warn("Failed to parse GitHub release:", err);
          resolve(null);
        }
      });
    });

    req.on("error", (err) => {
      log.warn("Failed to fetch GitHub release:", err.message);
      resolve(null);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      log.warn("GitHub API request timed out");
      resolve(null);
    });
  });
}

/**
 * Check for updates by comparing current version with latest GitHub release
 */
async function doCheckForUpdates(): Promise<void> {
  if (statusCallback) {
    statusCallback({ state: "checking" });
  }

  const release = await fetchLatestRelease();

  if (!release) {
    // Network error or no releases - don't show error to user
    if (statusCallback) {
      statusCallback({ state: "not-available" });
    }
    return;
  }

  // Skip prereleases and drafts
  if (release.prerelease || release.draft) {
    if (statusCallback) {
      statusCallback({ state: "not-available" });
    }
    return;
  }

  const currentVersion = app.getVersion();
  const latestVersion = release.tag_name.replace(/^v/, "");

  log.info(`Current version: ${currentVersion}, Latest: ${latestVersion}`);

  if (compareVersions(latestVersion, currentVersion) > 0) {
    latestRelease = release;
    if (statusCallback) {
      statusCallback({
        state: "available",
        version: latestVersion,
        downloadUrl: release.html_url,
      });
    }
  } else {
    if (statusCallback) {
      statusCallback({ state: "not-available" });
    }
  }
}

/**
 * Initialize the update checker
 */
export function initAutoUpdater(
  onStatusChange: (status: UpdateStatus) => void,
): void {
  statusCallback = onStatusChange;

  // Check on startup after a delay so the app loads first
  setTimeout(() => {
    doCheckForUpdates();
  }, 10_000);
}

/**
 * Manually trigger an update check
 */
export function checkForUpdates(): void {
  doCheckForUpdates();
}

/**
 * Open the releases page in the default browser
 */
export function downloadUpdate(): void {
  const url = latestRelease?.html_url ?? RELEASES_URL;
  shell.openExternal(url);
}

/**
 * No-op for compatibility - manual download doesn't support auto-install
 */
export function installUpdate(): void {
  // Open releases page instead
  downloadUpdate();
}
