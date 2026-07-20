import { App, Menu, Notice, TFile, normalizePath } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { FILE_ICONS, FILE_COLOR, setAntIcon } from "../icons";
import { openPath, openNoteLeaf } from "../util/obsidian";

// Render a native-Obsidian file tree.
// relDir = vault-relative dir (md opens in Obsidian, rest external) or
//          null (all entries open externally — files folders).
export function renderTree(
  app: App,
  container: HTMLElement,
  fsDir: string,
  relDir: string | null,
  newestFirst: boolean,
) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(fsDir, { withFileTypes: true });
  } catch {
    container.createEl("p", { text: "Cannot read folder", cls: "mpp-empty" });
    return;
  }

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith(".") && !e.name.startsWith("~$"))
    .sort((a, b) => newestFirst ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));

  for (const dir of dirs) {
    renderNavFolder(
      app, container, dir.name, path.join(fsDir, dir.name),
      relDir !== null ? relDir + "/" + dir.name : null, newestFirst,
    );
  }
  for (const file of files) {
    renderNavFile(
      app, container, file.name, path.join(fsDir, file.name),
      relDir !== null ? relDir + "/" + file.name : null,
    );
  }
  if (!dirs.length && !files.length) {
    container.createEl("p", { text: relDir !== null ? "No notes yet" : "Empty", cls: "mpp-empty" });
  }
}

function renderNavFolder(
  app: App,
  container: HTMLElement,
  name: string,
  fsPath: string,
  relPath: string | null,
  newestFirst: boolean,
) {
  // Native file-explorer markup: .tree-item.nav-folder > .tree-item-self.nav-folder-title
  const folderEl = container.createDiv({ cls: "tree-item nav-folder is-collapsed" });
  const titleEl  = folderEl.createDiv({
    cls: "tree-item-self nav-folder-title is-clickable mod-collapsible",
  });
  const collapseEl = titleEl.createDiv({
    cls: "tree-item-icon collapse-icon nav-folder-collapse-indicator is-collapsed",
  });
  setAntIcon(collapseEl, "caretRight"); // rotates 90° when expanded (CSS)
  titleEl.createDiv({ cls: "tree-item-inner nav-folder-title-content", text: name });

  let childrenEl: HTMLElement | null = null;
  let collapsed = true;

  titleEl.addEventListener("click", () => {
    collapsed = !collapsed;
    folderEl.toggleClass("is-collapsed", collapsed);
    collapseEl.toggleClass("is-collapsed", collapsed); // rotates the triangle
    if (!collapsed) {
      if (!childrenEl) {
        childrenEl = folderEl.createDiv({ cls: "tree-item-children nav-folder-children" });
        renderTree(app, childrenEl, fsPath, relPath, newestFirst);
      }
    } else if (childrenEl) {
      childrenEl.remove(); // Obsidian removes children DOM when collapsing
      childrenEl = null;
    }
  });

  titleEl.addEventListener("contextmenu", (e) =>
    showRowMenu(e, { name, fsPath, openLabel: "Open in Finder", open: () => openPath(fsPath) }));
}

function renderNavFile(
  app: App,
  container: HTMLElement,
  name: string,
  fsPath: string,
  relPath: string | null,
) {
  const ext      = path.extname(name).toLowerCase();
  const baseName = name.slice(0, -ext.length) || name;
  const iconName = FILE_ICONS[ext] ?? "file";
  const color    = FILE_COLOR[ext] ?? "";

  // Native markup: .tree-item.nav-file > .tree-item-self.nav-file-title
  const fileEl  = container.createDiv({ cls: "tree-item nav-file" });
  const titleEl = fileEl.createDiv({ cls: "tree-item-self nav-file-title is-clickable" });

  const iconEl = titleEl.createDiv({ cls: `nav-file-icon${color ? " mpp-icon-" + color : ""}` });
  setAntIcon(iconEl, iconName);

  titleEl.createDiv({ cls: "tree-item-inner nav-file-title-content", text: baseName });

  if (ext) {
    titleEl.createDiv({ text: ext.slice(1), cls: "nav-file-tag" });
  }

  // md inside the vault → open in Obsidian; everything else → default app
  const openInVault = relPath !== null && ext === ".md";
  const open = () => {
    if (openInVault) {
      const vFile = app.vault.getAbstractFileByPath(normalizePath(relPath!));
      if (vFile instanceof TFile) openNoteLeaf(app, vFile);
    } else {
      openPath(fsPath);
    }
  };

  titleEl.addEventListener("click", open);
  titleEl.addEventListener("contextmenu", (e) => showRowMenu(e, { name, fsPath, open }));
}

// Right-click menu for a file/folder row: Open, Copy path, Copy name.
function showRowMenu(
  e: MouseEvent,
  opts: { name: string; fsPath: string; open: () => void; openLabel?: string },
) {
  e.preventDefault();
  e.stopPropagation();
  const menu = new Menu();
  menu.addItem((i) => i.setTitle(opts.openLabel ?? "Open").setIcon("lucide-arrow-up-right").onClick(opts.open));
  menu.addSeparator();
  menu.addItem((i) => i.setTitle("Copy path").setIcon("lucide-copy").onClick(() => {
    void navigator.clipboard.writeText(opts.fsPath);
    new Notice("Path copied");
  }));
  menu.addItem((i) => i.setTitle("Copy name").setIcon("lucide-copy").onClick(() => {
    void navigator.clipboard.writeText(opts.name);
    new Notice("Name copied");
  }));
  menu.showAtMouseEvent(e);
}
