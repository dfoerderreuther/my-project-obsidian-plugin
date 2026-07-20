# My Project Panel

An Obsidian plugin that connects your notes to customer/consulting project folders and launches Claude Code with the right scope and context.

Each project folder holds a `_PROJECT.md` describing the project (title, links, and the external folders you read from and write to). The plugin reads it to give you a side panel that ties everything together — notes, external files, links — and to configure and open Claude Code scoped to that project.

## What it does

- **Links notes and external folders.** A project's Obsidian notes folder sits alongside its external "files" folders (e.g. a synced cloud drive). Both are browsable from one panel.
- **Sets Claude Code's scope.** On save it writes a `.claude/settings.json` next to `_PROJECT.md` that grants edit/write permission to the project folder and your writable paths, marks read-only references, and denies dangerous shell commands.
- **Gives Claude Code context.** It also writes a `CLAUDE.md` (in a managed block) telling Claude where things go: Markdown/notes → the Obsidian notes folder; documents and other files → the first writable files folder.
- **Opens Claude Code with one click**, in an integrated terminal already `cd`-ed into the project directory, running `claude --permission-mode auto`. A plain terminal button per folder is available too.

### Panel features

- Project switcher (all `_PROJECT.md` in the vault, by title).
- Tabs: **Notes**, **Links**, then one tab per external path (writable first, read-only last, each marked R/W/RW).
- Native Obsidian file tree per folder; `.md` opens in Obsidian, other files open in their default app.
- Per-folder **Finder** and **Terminal** buttons.
- Create notes (date-prefixed) and add/remove links inline.
- Right-click any file/folder/link: Open, Copy path/name/URL.
- Auto-reload when files change (watches the notes folder and every external path).
- Create/edit a project by right-clicking any folder in Obsidian's file explorer.

## `_PROJECT.md` format

Put a `_PROJECT.md` at the root of a project folder:

```yaml
---
title: Acme Redesign
links:
  - label: Ticket
    url: https://example.com/ticket/123
read_paths:
  - /absolute/path/to/a/reference/folder
write_paths:
  - /absolute/path/to/the/deliverables/folder
---
```

You don't have to write this by hand — use the panel's gear icon, or right-click a folder → **Create project**.

## Requirements

- **Desktop only** (uses the local filesystem and Electron).
- **[Terminal](https://github.com/polyipseity/obsidian-terminal)** plugin (id `terminal`) — required for the Claude Code and Terminal buttons. The plugin will offer to enable it if installed, or link you to install it.
- **[Claude Code](https://claude.com/claude-code)** CLI on your `PATH` (the plugin also prepends `~/.local/bin`).

## Install

This is not (yet) in the community plugin store — install it manually, either from source or from a prebuilt zip.

1. Install the required **Terminal** plugin: in Obsidian, **Settings → Community plugins → Browse**, search "Terminal" (by polyipseity), install and enable it.

### Option A: from source (`install.sh`)

Requires `git` and Node/npm.

2. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd my-project-panel
   npm install
   ```
3. Point the installer at your vault. Copy the example env and set your vault path:
   ```bash
   cp .env.example .env
   # edit .env → VAULT="/absolute/path/to/your/ObsidianVault"
   ```
4. Build and install into the vault:
   ```bash
   bash install.sh
   ```
   This builds `main.js` and copies `main.js`, `manifest.json`, and `styles.css` into
   `<VAULT>/.obsidian/plugins/my-project-panel/`.
5. In Obsidian: **Settings → Community plugins**, enable **My Project Panel** (reload Obsidian if it doesn't appear).

`.env` is gitignored — your vault path never leaves your machine.

### Option B: from a prebuilt zip (no git/npm needed)

2. Download `my-project-panel.zip` from the [Releases page](../../releases/latest).
3. Unzip it — you get a `my-project-panel/` folder containing `main.js`, `manifest.json`, `styles.css`.
4. Copy that folder into `<VAULT>/.obsidian/plugins/` (create `.obsidian/plugins/` if it doesn't exist; it's hidden, so enable hidden files in Finder/Explorer or navigate to it directly).
5. In Obsidian: **Settings → Community plugins**, enable **My Project Panel** (reload Obsidian if it doesn't appear).

## Development

```bash
npm run dev     # esbuild watch (unminified, inline sourcemap)
npm run build   # production build (minified)
bash install.sh # build + copy into the vault from .env
```

Source is split into small modules under `src/` (`model/`, `services/`, `ui/`, `util/`); `main.ts` is just the plugin entry point.
