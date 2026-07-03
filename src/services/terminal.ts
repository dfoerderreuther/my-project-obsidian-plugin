import { App, Notice, WorkspaceLeaf } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { TERMINAL_PROFILE, TERMINAL_VIEW_TYPE } from "../constants";
import { vaultBasePath } from "../util/obsidian";
import { Project } from "../model/project";

// Read the terminal plugin's macOS integrated profile OBJECT from its data.json.
function loadTerminalProfile(app: App): Record<string, unknown> | null {
  try {
    const dataPath = path.join(vaultBasePath(app), ".obsidian", "plugins", "terminal", "data.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
      profiles?: Record<string, Record<string, unknown>>;
    };
    return data.profiles?.[TERMINAL_PROFILE] ?? null;
  } catch {
    return null;
  }
}

// The Claude Code button relies on polyipseity/obsidian-terminal (plugin id
// "terminal"). No Obsidian API declares or auto-installs dependencies, so:
//   installed + enabled → ok
//   installed, disabled → enable it (one real API call)
//   missing             → open its marketplace page to install
export async function ensureReady(app: App): Promise<boolean> {
  const plugins = (app as unknown as {
    plugins: {
      plugins: Record<string, unknown>;
      enabledPlugins: Set<string>;
      manifests: Record<string, unknown>;
      enablePlugin(id: string): Promise<void>;
    };
  }).plugins;

  if (plugins.plugins["terminal"] && plugins.enabledPlugins.has("terminal")) return true;

  // Installed but not enabled → enable it now.
  if (plugins.manifests["terminal"]) {
    try {
      await plugins.enablePlugin("terminal");
      new Notice("Enabled the Terminal plugin");
      // Give it a tick to register its view type before we open a leaf.
      await sleep(300);
      return !!plugins.plugins["terminal"];
    } catch (e) {
      new Notice(`Could not enable Terminal plugin: ${e}`);
      return false;
    }
  }

  // Not installed → send the user to its install page.
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode("Claude Code needs the Terminal plugin. "));
  const link = document.createElement("a");
  link.textContent = "Click to install.";
  link.href = "#";
  link.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("obsidian://show-plugin?id=terminal");
  });
  frag.appendChild(link);
  new Notice(frag, 10000);
  return false;
}

// Create a new leaf as a tab in the same group as `sibling`, or null on failure.
function openTabBeside(app: App, sibling: WorkspaceLeaf): WorkspaceLeaf | null {
  try {
    const parent = (sibling as unknown as { parent?: unknown }).parent;
    if (!parent) return null;
    const ws = app.workspace as unknown as {
      createLeafInParent(p: unknown, index: number): WorkspaceLeaf;
    };
    const children = (parent as { children?: unknown[] }).children ?? [];
    return ws.createLeafInParent(parent, children.length);
  } catch {
    return null;
  }
}

// Open an integrated terminal in `cwd`, running an optional command, tab titled `title`.
// Reuses the terminal tab group if one is open, else splits below the notes.
async function spawnTerminal(app: App, cwd: string, title: string, cmd: string | null): Promise<void> {
  if (!(await ensureReady(app))) return;

  // The profile must be the full object from the terminal plugin's data.json,
  // not the string key. When cmd is given, override args to run it (login shell).
  const base = loadTerminalProfile(app);
  const profile = cmd
    ? (base
        ? { ...base, args: ["-l", "-c", cmd] }
        : { type: "integrated", executable: "/bin/zsh", args: ["-l", "-c", cmd] })
    : (base ?? { type: "integrated", executable: "/bin/zsh", args: ["-l"] });

  // If a terminal is already open, add this one as a tab in its group.
  // Otherwise open a fresh horizontal split below the notes.
  const existing = app.workspace.getLeavesOfType(TERMINAL_VIEW_TYPE);
  let leaf = existing.length
    ? openTabBeside(app, existing[existing.length - 1])
    : null;
  if (!leaf) leaf = app.workspace.getLeaf("split", "horizontal");

  try {
    await leaf.setViewState({
      type: TERMINAL_VIEW_TYPE,
      active: true,
      state: {
        [TERMINAL_VIEW_TYPE]: { profile, cwd, serial: Date.now() },
      },
    });
    app.workspace.revealLeaf(leaf);

    // Rename the tab — poll until the tab header element exists, then set text directly.
    // The terminal plugin regenerates the title from the PTY hostname; we override after.
    void (async () => {
      for (let i = 0; i < 30; i++) {
        await sleep(100);
        const el = (leaf as unknown as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
        if (el) { el.textContent = title; break; }
      }
    })();
  } catch (e) {
    new Notice(`Failed to open terminal: ${e}`);
    console.error("[my-project-panel]", e);
  }
}

// Terminal running Claude Code (auto permission mode) in the project directory,
// kept alive after it exits. Prepend ~/.local/bin (where `claude` lives) to PATH.
export function openClaudeCode(app: App, project: Project): Promise<void> {
  const title = (project.frontmatter.title ?? "Project").replace(/'/g, "");
  const cmd = `export PATH=$HOME/.local/bin:$PATH; printf '\\e]0;${title}\\a'; claude --permission-mode auto; exec zsh -l`;
  return spawnTerminal(app, project.absDir, title, cmd);
}

// Plain integrated terminal in an arbitrary folder, tab titled with the folder name.
export function openTerminalIn(app: App, cwd: string, title: string): Promise<void> {
  return spawnTerminal(app, cwd, title, null);
}
