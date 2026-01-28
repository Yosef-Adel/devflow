import { activeWindow, Result } from "get-windows";
import os from "os";

export interface PlatformInfo {
  platform: NodeJS.Platform;
  isSupported: boolean;
  message: string;
}

class PlatformTracker {
  private platform: NodeJS.Platform;
  public isSupported: boolean;

  constructor() {
    this.platform = os.platform();
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    // get-windows works on all platforms except Wayland
    if (this.platform === "linux") {
      const isWayland =
        process.env.WAYLAND_DISPLAY ||
        process.env.XDG_SESSION_TYPE === "wayland";

      if (isWayland) {
        console.warn(
          "⚠️  Wayland detected. Window tracking not supported for security reasons.",
        );
        return false;
      }
    }

    return true;
  }

  async getActiveWindow(): Promise<Result | null> {
    if (!this.isSupported) {
      return null;
    }

    try {
      const window = await activeWindow();
      return window ?? null;
    } catch (error) {
      console.error("Error getting active window:", error);
      return null;
    }
  }

  getPlatformInfo(): PlatformInfo {
    return {
      platform: this.platform,
      isSupported: this.isSupported,
      message: this.getSupportMessage(),
    };
  }

  private getSupportMessage(): string {
    if (this.isSupported) {
      return `✓ Window tracking supported on ${this.getPlatformName()}`;
    }

    if (this.platform === "linux") {
      return "✗ Wayland detected. Please switch to X11 for window tracking.";
    }

    return `✗ Window tracking not supported on ${this.getPlatformName()}`;
  }

  private getPlatformName(): string {
    const names: Record<string, string> = {
      darwin: "macOS",
      win32: "Windows",
      linux: "Linux",
    };
    return names[this.platform] || this.platform;
  }
}

export default PlatformTracker;
