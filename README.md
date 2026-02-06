# DevFlow

A desktop time tracking app that runs quietly in the background, watches which windows you use, and tells you where your time actually goes. Think of it as RescueTime or ActivityWatch, but open source and built with Electron.

I built this because I wanted an honest picture of how I spend my day on the computer — not what I think I do, but what I actually do.

## What It Does

- **Automatic tracking** — detects the active window every few seconds, logs the app name, window title, URL, and duration. You don't have to remember to start or stop anything.
- **Smart categorization** — assigns each activity a category (development, communication, social media, entertainment, etc.) using a scoring system with weighted rules. You can customize categories and rules in settings.
- **Context extraction** — pulls out useful details like VS Code project names, GitHub repos, browser domains, and terminal working directories from window titles.
- **Idle detection** — pauses tracking when you walk away (lock screen, screensaver, or plain inactivity).
- **Session grouping** — consecutive activities in the same app get merged into sessions, and nearby same-category sessions get merged into blocks, so the timeline isn't a mess of 5-second entries.
- **Projects** — create your own projects and assign sessions to them. VS Code and GitHub project names are auto-suggested so things just work most of the time.
- **Pomodoro timer** — built-in focus timer that tags your activities during work sessions so you can see what you actually did during a pomodoro.
- **Manual entries** — for meetings, phone calls, or anything the tracker can't see. They show up in the timeline with a badge.
- **Dashboard** — today's stats, top apps, websites, projects, and a session feed. Also has a YouTube Shorts insight card if you want to keep that in check.
- **Reports** — breakdowns by category, app, and time period with day and week views.
- **System tray** — minimizes to tray so it stays out of your way. Tooltip shows what you're currently doing.
- **Auto-updater** — checks GitHub Releases and lets you download updates from inside the app.
- **Cross-platform** — works on macOS, Windows, and Linux (X11). Wayland isn't supported yet due to security restrictions in the protocol.

## Download

Grab the latest release for your platform from the [Releases page](https://github.com/Yosef-Adel/devflow/releases). Builds are available for:

- **macOS** — ZIP
- **Windows** — Squirrel installer
- **Linux** — DEB and RPM

On macOS, since the app isn't signed with an Apple Developer certificate, macOS will quarantine it. After extracting the app, run this in your terminal before opening it:

```
xattr -dr com.apple.quarantine devflow.app
```

The app also needs Accessibility permission to read window titles. It'll walk you through that on first launch. Screen Recording permission is optional but helps with some apps.

## Development

If you want to run from source or contribute:

```
npm install
npm start
```

This starts the Vite dev server and opens the app with DevTools.

To build installers locally:

```
npm run package    # creates a distributable without installer
npm run make       # creates platform-specific installers
```

## Tech Stack

- Electron + Electron Forge
- React + TypeScript
- Vite
- Redux Toolkit
- Tailwind CSS v4
- Drizzle ORM + better-sqlite3
- Vitest (99 categorizer tests)

## How It Works

The main process polls the active window using the `get-windows` library. Each poll goes through a pipeline: the context extractor parses the window title and URL for project/file/domain info, then the categorizer scores the activity against all category rules (exact match, contains, regex — across app names, domains, keywords, and file paths). The highest-scoring category wins. Everything gets stored in a local SQLite database.

The renderer talks to the main process over IPC. A preload script exposes a typed API (`window.electronAPI`) so the React app never touches Node.js directly. Redux async thunks fetch data from the main process and keep the UI in sync.

## Vision

The app currently does passive observation — it shows you what happened. That's useful, but it's just the first step. The plan is to move through three stages:

**Observation -> Insights -> Behavior Change**

### Stage 1: Insights (v1.1)

Right now the app shows you raw data. The next step is to make that data mean something. Week-over-week comparisons so you can see if you're spending more or less time on development than last week. Trend detection that tells you when you're most focused and when you tend to drift. A weekly digest notification with your summary and one actionable takeaway. A dashboard that knows what time it is and shows you how today compares to your average — "you usually have 2 hours of development by noon, you're at 45 minutes."

### Stage 2: Behavior Change (v1.2)

Once you can see the patterns, the app should help you act on them. Daily goals per category with progress rings on the dashboard. Time limits on apps or categories with notifications when you're getting close. Focus session tracking that flags when you switch to something unproductive during a pomodoro. Break reminders after long stretches of continuous work. The goal is gentle nudges, not a prison warden.

### Stage 3: Developer Niche (v1.3)

This is a time tracker built by a developer for developers, and it should lean into that. Per-project dashboards breaking down time by file type and language. Git integration that correlates time with branches and commits. Code review time tracking from GitHub PR pages. Meeting impact analysis — how much of your day is meetings, and how fragmented are your focus blocks.

Each stage builds on the previous one. No skipping ahead.

## License

MIT

## Author

Yosef Adel — yosefadel002@gmail.com
