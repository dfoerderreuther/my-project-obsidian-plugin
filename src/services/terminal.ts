import { App, Notice } from "obsidian";
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

// Open an integrated terminal split below the notes, running Claude Code in the
// project directory, and rename its tab to the project title.
export async function openClaudeCode(app: App, project: Project): Promise<void> {
  if (!(await ensureReady(app))) return;

  // Load the profile object (not a string key!) and override args to auto-launch claude.
  // Prepend ~/.local/bin (where `claude` lives) to PATH so it's found in the login shell.
  // After claude exits, exec a new interactive login zsh to keep the terminal alive.
  const base  = loadTerminalProfile(app);
  const title = (project.frontmatter.title ?? "Project").replace(/'/g, "");
  const cmd   = `export PATH=$HOME/.local/bin:$PATH; printf '\\e]0;${title}\\a'; claude --permission-mode auto; exec zsh -l`;
  const profile = base
    ? { ...base, args: ["-l", "-c", cmd] }
    : { type: "integrated", executable: "/bin/zsh", args: ["-l", "-c", cmd] };

  const leaf = app.workspace.getLeaf("split", "horizontal");
  try {
    await leaf.setViewState({
      type: TERMINAL_VIEW_TYPE,
      active: true,
      state: {
        [TERMINAL_VIEW_TYPE]: { profile, cwd: project.absDir, serial: Date.now() },
      },
    });
    app.workspace.revealLeaf(leaf);

    // Rename the tab — poll until the tab header element exists, then set text directly.
    // The terminal plugin regenerates the title from the PTY hostname; we override after.
    const tabTitle = project.frontmatter.title ?? "Project";
    void (async () => {
      for (let i = 0; i < 30; i++) {
        await sleep(100);
        const el = (leaf as unknown as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
        if (el) { el.textContent = tabTitle; break; }
      }
    })();
  } catch (e) {
    new Notice(`Failed to open terminal: ${e}`);
    console.error("[my-project-panel]", e);
  }
}
