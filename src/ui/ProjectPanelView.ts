import { ItemView, Notice, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import * as path from "path";
import { VIEW_TYPE } from "../constants";
import { Project, ProjectLink } from "../model/project";
import { discover, findFor, load } from "../model/projectStore";
import { saveLinks } from "../model/persistence";
import { openPath, waitForMetadata } from "../util/obsidian";
import { DirWatcher } from "../util/watch";
import { setAntIcon } from "../icons";
import { openClaudeCode } from "../services/terminal";
import { renderHeader } from "./header";
import { renderTree } from "./tree";
import { renderLinksTab } from "./linksTab";
import { renderNewNoteRow } from "./newNote";
import { ProjectSettingsModal } from "./ProjectSettingsModal";

interface Tab {
  label: string;
  access?: string;
  fsPath?: string;
  relDir?: string | null;
  newestFirst?: boolean;
  isNotes?: boolean;
  links?: ProjectLink[];
}

export class ProjectPanelView extends ItemView {
  private project: Project | null = null;
  private activeTabLabel: string | null = null; // remembered tab across reloads
  private watcher = new DirWatcher(() => void this.reload());

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return this.project?.frontmatter.title ?? "Project"; }
  getIcon(): string { return "my-project"; }

  async onOpen() {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf?.view.getViewType() === VIEW_TYPE) return;
        void this.refresh();
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile &&
            (file.name === "_PROJECT.md" || file.name === "_WORKFRONT-SUMMARY.md")) {
          void this.refresh(true); // force re-render even if same project
        }
      }),
    );
    await this.refresh(true);
  }

  async onClose() {
    this.watcher.dispose();
  }

  // Show the project for the active file, unless it's the same one already shown.
  private async refresh(force = false) {
    const file = this.app.workspace.getActiveFile();
    if (!file) return; // no active file — keep current panel (e.g. terminal tab)

    const projectFile = findFor(file.parent instanceof TFolder ? file.parent : null);
    if (!projectFile) return; // active file has no project — keep current panel

    if (!force && projectFile.path === this.project?.file.path) return; // no change
    await this.loadFile(projectFile);
  }

  // Public: force-show a specific project (used by the file-explorer menu).
  async showProject(projectFile: TFile) {
    await this.loadFile(projectFile);
  }

  // Reload the currently shown project (reload button, watchers, after saves).
  private async reload() {
    if (this.project) await this.loadFile(this.project.file);
  }

  private async loadFile(projectFile: TFile) {
    const project = await load(this.app, projectFile);
    if (!project) { this.renderEmpty("_PROJECT.md missing frontmatter"); return; }
    this.project = project;
    this.renderProject();
  }

  private renderEmpty(msg: string) {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.className = "mpp";
    contentEl.createEl("p", { text: msg, cls: "mpp-empty" });
  }

  private renderProject() {
    const { contentEl } = this;
    const project = this.project;
    if (!project) return;

    contentEl.empty();
    contentEl.className = "mpp";

    // Fixed top region.
    const fixed = contentEl.createDiv("mpp-fixed");
    renderHeader(fixed, project, discover(this.app), {
      onSelectProject: (file) => void this.loadFile(file),
      onReload: () => void this.reload(),
      onSettings: () => this.openSettings(),
      onClaude: () => void openClaudeCode(this.app, project),
    });

    // Tabs: Notes, Links, then writable (RW/W) paths, then read-only (R).
    const ordered: string[] = [];
    for (const p of [...project.reads, ...project.writes]) if (!ordered.includes(p)) ordered.push(p);

    const tabs: Tab[] = [{
      label: "Notes", fsPath: project.absDir, relDir: project.vaultRelDir,
      newestFirst: true, isNotes: true,
    }];
    tabs.push({ label: "Links", links: project.links });
    const pathTabs: Tab[] = ordered.map((p) => ({
      label: path.basename(p),
      access: (project.reads.includes(p) ? "R" : "") + (project.writes.includes(p) ? "W" : ""),
      fsPath: p, relDir: null, newestFirst: false,
    }));
    // Writable first (W in access), read-only last.
    const rank = (a: string) => (a.includes("W") ? 0 : 1);
    pathTabs.sort((a, b) => rank(a.access ?? "") - rank(b.access ?? "") || a.label.localeCompare(b.label));
    tabs.push(...pathTabs);

    const tabBar = contentEl.createDiv("mpp-tabs");
    const body   = contentEl.createDiv("mpp-tab-body");

    const activeLabel =
      this.activeTabLabel && tabs.some((t) => t.label === this.activeTabLabel)
        ? this.activeTabLabel : tabs[0].label;

    const btns = new Map<string, HTMLElement>();
    const show = (label: string) => {
      this.activeTabLabel = label;
      for (const [l, b] of btns) b.toggleClass("is-active", l === label);
      body.empty();
      const tab = tabs.find((t) => t.label === label);
      if (tab) this.renderTabBody(body, tab);
    };

    for (const tab of tabs) {
      const btn = tabBar.createDiv({ cls: "mpp-tab", attr: { title: tab.fsPath ?? tab.label } });
      btn.createSpan({ text: tab.label, cls: "mpp-tab-label" });
      if (tab.access) {
        btn.createSpan({ text: tab.access, cls: `mpp-access mpp-access-${tab.access.toLowerCase()}` });
      }
      btns.set(tab.label, btn);
      btn.addEventListener("click", () => show(tab.label));
    }

    show(activeLabel);

    // Watch the vault notes dir + every external path for changes.
    this.watcher.watch([project.absDir, ...ordered]);
  }

  private renderTabBody(body: HTMLElement, tab: Tab) {
    // Links tab.
    if (tab.links) {
      renderLinksTab(body, tab.links, {
        onAdd: (link) => void this.addLink(link),
        onRemove: (url) => void this.removeLink(url),
      });
      return;
    }

    // Folder tab (Notes or external path).
    const bar = body.createDiv("mpp-tab-bar");
    bar.createSpan({ text: tab.fsPath, cls: "mpp-tab-path", attr: { title: tab.fsPath ?? "" } });
    const finder = bar.createDiv({ cls: "mpp-path-finder", attr: { title: "Open in Finder" } });
    setAntIcon(finder, "folderOpen");
    finder.addEventListener("click", () => openPath(tab.fsPath!));

    // Notes tab: new-note creator on top, above the file tree.
    if (tab.isNotes && this.project) {
      renderNewNoteRow(this.app, body, this.project.vaultRelDir, () => void this.reload());
    }

    const tree = body.createDiv("nav-files-container");
    renderTree(this.app, tree, tab.fsPath!, tab.relDir ?? null, tab.newestFirst ?? false);
  }

  private openSettings() {
    // Target the current _PROJECT.md, or create one in the active file's folder.
    let file: TFile | null = this.project?.file ?? null;
    let folder: TFolder | null = file?.parent instanceof TFolder ? file.parent : null;
    if (!file) {
      const active = this.app.workspace.getActiveFile();
      folder = active?.parent instanceof TFolder ? active.parent : null;
    }
    if (!file && !folder) {
      new Notice("Open a note in a project folder first");
      return;
    }
    new ProjectSettingsModal(this.app, file, folder, this.project?.frontmatter ?? {}, async (saved) => {
      await waitForMetadata(this.app, saved);
      await this.loadFile(saved);
    }).open();
  }

  private async addLink(link: ProjectLink) {
    if (!this.project) return;
    await saveLinks(this.app, this.project.file, [...this.project.links, link]);
    await waitForMetadata(this.app, this.project.file);
    await this.reload();
  }

  private async removeLink(url: string) {
    if (!this.project) return;
    await saveLinks(this.app, this.project.file, this.project.links.filter((l) => l.url !== url));
    await waitForMetadata(this.app, this.project.file);
    await this.reload();
  }
}
