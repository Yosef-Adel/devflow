export interface BrowserContext {
  domain: string;
  path: string;
  isLocalhost: boolean;
  github?: GitHubContext;
  youtube?: YouTubeContext;
  stackoverflow?: StackOverflowContext;
}

export interface GitHubContext {
  owner: string;
  repo: string;
  section?: string;
  itemNumber?: string;
}

export interface YouTubeContext {
  videoTitle: string;
  videoId?: string;
}

export interface StackOverflowContext {
  question: string;
  questionId?: string;
}

export interface VSCodeContext {
  filename: string;
  project: string;
  fileType: string;
  language: string;
}

export interface TerminalContext {
  currentPath?: string;
  currentCommand?: string;
  project?: string;
}

export interface ExtractedContext {
  project?: string;
  filename?: string;
  fileType?: string;
  language?: string;
  domain?: string;
  browser?: BrowserContext;
  vscode?: VSCodeContext;
  terminal?: TerminalContext;
}

class ContextExtractor {
  extractBrowserContext(url: string, title: string): BrowserContext | null {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace("www.", "");

      const context: BrowserContext = {
        domain,
        path: parsedUrl.pathname,
        isLocalhost:
          domain === "localhost" || domain.startsWith("127.0.0.1"),
      };

      // Extract specific site contexts
      const github = this.extractGitHubContext(parsedUrl, title);
      if (github) context.github = github;

      const youtube = this.extractYouTubeContext(parsedUrl, title);
      if (youtube) context.youtube = youtube;

      const stackoverflow = this.extractStackOverflowContext(parsedUrl, title);
      if (stackoverflow) context.stackoverflow = stackoverflow;

      return context;
    } catch {
      return null;
    }
  }

  private extractGitHubContext(
    url: URL,
    _title: string,
  ): GitHubContext | null {
    if (!url.hostname.includes("github.com")) return null;

    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return null;

    return {
      owner: pathParts[0],
      repo: pathParts[1],
      section: pathParts[2],
      itemNumber: pathParts[3],
    };
  }

  private extractYouTubeContext(
    url: URL,
    title: string,
  ): YouTubeContext | null {
    if (
      !url.hostname.includes("youtube.com") &&
      !url.hostname.includes("youtu.be")
    ) {
      return null;
    }

    return {
      videoTitle: title.replace(" - YouTube", ""),
      videoId: url.searchParams.get("v") || undefined,
    };
  }

  private extractStackOverflowContext(
    url: URL,
    title: string,
  ): StackOverflowContext | null {
    if (!url.hostname.includes("stackoverflow.com")) return null;

    const questionIdMatch = url.pathname.match(/\/questions\/(\d+)/);

    return {
      question: title.replace(" - Stack Overflow", ""),
      questionId: questionIdMatch?.[1],
    };
  }

  extractVSCodeContext(title: string): VSCodeContext | null {
    // Separator can be " - " (hyphen) or " — " (em dash, used on macOS)
    const sep = `\\s[-\u2014]\\s`;

    // Format: "filename.ext - projectname - Visual Studio Code"
    const match = title.match(new RegExp(`^(.+?)${sep}(.+?)${sep}(?:Visual Studio Code|Code)$`));

    if (match) {
      const [, filename, project] = match;
      const extension = filename.split(".").pop() || "";

      return {
        filename,
        project,
        fileType: extension,
        language: this.getLanguageFromExtension(extension),
      };
    }

    // Alternative format: "projectname - Visual Studio Code"
    const projectOnlyMatch = title.match(new RegExp(`^(.+?)${sep}(?:Visual Studio Code|Code)$`));
    if (projectOnlyMatch) {
      return {
        filename: "",
        project: projectOnlyMatch[1],
        fileType: "",
        language: "",
      };
    }

    // macOS: get-windows returns title without app name suffix
    // VS Code title format: "filename — project — status" or "filename — project"
    // The project is always the second segment (index 1)
    const parts = title.split(/\s[-\u2014]\s/);
    if (parts.length >= 2) {
      const project = parts[1];
      const filename = parts[0];
      const extension = filename.split(".").pop() || "";

      return {
        filename,
        project,
        fileType: extension,
        language: this.getLanguageFromExtension(extension),
      };
    }

    // Single segment: just the project name (e.g. "composable")
    if (title) {
      return {
        filename: "",
        project: title,
        fileType: "",
        language: "",
      };
    }

    return null;
  }

  private getLanguageFromExtension(ext: string): string {
    const extensionMap: Record<string, string> = {
      js: "JavaScript",
      ts: "TypeScript",
      jsx: "React",
      tsx: "React TypeScript",
      py: "Python",
      java: "Java",
      cpp: "C++",
      c: "C",
      go: "Go",
      rs: "Rust",
      rb: "Ruby",
      php: "PHP",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      sass: "Sass",
      less: "Less",
      md: "Markdown",
      json: "JSON",
      yaml: "YAML",
      yml: "YAML",
      xml: "XML",
      sql: "SQL",
      sh: "Shell",
      bash: "Bash",
      zsh: "Zsh",
      swift: "Swift",
      kt: "Kotlin",
      dart: "Dart",
      vue: "Vue",
      svelte: "Svelte",
    };

    return extensionMap[ext.toLowerCase()] || ext.toUpperCase();
  }

  extractTerminalContext(title: string): TerminalContext | null {
    // Try to extract current directory
    const pathMatch = title.match(/(?:~|\/)[^\s:]+/);
    const currentPath = pathMatch?.[0];

    // Try to extract current command
    const commandMatch = title.match(/:\s*([^\s]+)/);
    const currentCommand = commandMatch?.[1];

    return {
      currentPath,
      currentCommand,
      project: this.extractProjectFromPath(currentPath),
    };
  }

  private extractProjectFromPath(path?: string): string | undefined {
    if (!path) return undefined;

    // Extract project name from paths like ~/projects/my-project
    const projectMatch = path.match(/(?:projects|repos|dev|code)\/([^/]+)/i);
    if (projectMatch) return projectMatch[1];

    // Fallback: get last directory name
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }

  extract(appName: string, title: string, url?: string | null): ExtractedContext {
    const context: ExtractedContext = {};

    // VS Code
    if (
      appName === "Code" ||
      appName === "Visual Studio Code" ||
      appName.includes("VS Code")
    ) {
      const vscode = this.extractVSCodeContext(title);
      if (vscode) {
        context.vscode = vscode;
        context.project = vscode.project;
        context.filename = vscode.filename;
        context.fileType = vscode.fileType;
        context.language = vscode.language;
      }
    }

    // Terminal
    if (
      appName === "Terminal" ||
      appName === "iTerm2" ||
      appName === "Warp" ||
      appName === "Hyper" ||
      appName === "Alacritty" ||
      appName === "kitty"
    ) {
      const terminal = this.extractTerminalContext(title);
      if (terminal) {
        context.terminal = terminal;
        context.project = terminal.project;
      }
    }

    // Browser
    if (url) {
      const browser = this.extractBrowserContext(url, title);
      if (browser) {
        context.browser = browser;
        context.domain = browser.domain;
        if (browser.github) {
          context.project = `${browser.github.owner}/${browser.github.repo}`;
        }
      }
    }

    return context;
  }
}

export default ContextExtractor;
