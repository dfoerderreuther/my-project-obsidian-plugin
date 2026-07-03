import { App, Modal, Notice, Setting, TFile, TFolder } from "obsidian";
import * as path from "path";
import { ProjectFrontmatter, ProjectLink, effectiveLinks } from "../model/project";
import { saveProject } from "../model/persistence";
import { setAntIcon } from "../icons";
import { pickFolders } from "../util/obsidian";

// Create / edit a project's _PROJECT.md (and its generated .claude files).
export class ProjectSettingsModal extends Modal {
  constructor(
    app: App,
    private file: TFile | null,
    private folder: TFolder | null,
    private data: ProjectFrontmatter,
    private onSaved: (file: TFile) => Promise<void> | void,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("mpp-settings-modal");
    contentEl.empty();
    contentEl.createEl("h3", { text: this.file ? "Edit project" : "New project" });

    let title = this.data.title ?? "";
    // Seed links from stored links + legacy workfront (migration on save).
    const links: ProjectLink[] = effectiveLinks(this.data).map((l) => ({ ...l }));
    const readPaths  = [...(this.data.read_paths  ?? [])];
    const writePaths = [...(this.data.write_paths ?? [])];

    new Setting(contentEl)
      .setName("Title")
      .addText((t) => t.setValue(title).onChange((v) => (title = v)));

    this.buildLinkField(contentEl, links);
    this.buildPathField(contentEl, "Read paths", readPaths);
    this.buildPathField(contentEl, "Write paths", writePaths);

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b.setButtonText("Save").setCta().onClick(async () => {
          const t = title.trim();
          if (!t) { new Notice("Title is required"); return; }
          const cleanLinks = links
            .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
            .filter((l) => l.url);
          const saved = await saveProject(this.app, this.file, this.folder, {
            title: t,
            links: cleanLinks,
            read_paths: readPaths,
            write_paths: writePaths,
          });
          this.close();
          if (saved) await this.onSaved(saved);
        }),
      );
  }

  private buildLinkField(container: HTMLElement, list: ProjectLink[]) {
    const field = container.createDiv("mpp-path-field");
    const head  = field.createDiv("mpp-path-head");
    head.createSpan({ text: "Links", cls: "mpp-path-name" });
    const addBtn = head.createEl("button", { cls: "mpp-path-add" });
    setAntIcon(addBtn.createSpan(), "folderAdd");
    addBtn.createSpan({ text: "Add link" });

    const listEl = field.createDiv("mpp-path-list");

    const render = () => {
      listEl.empty();
      if (!list.length) {
        listEl.createDiv({ text: "No links", cls: "mpp-path-empty" });
        return;
      }
      list.forEach((link, i) => {
        const row = listEl.createDiv("mpp-link-edit-row");
        const label = row.createEl("input", { cls: "mpp-link-input-label" });
        label.type = "text"; label.placeholder = "Label"; label.value = link.label;
        label.addEventListener("input", () => (link.label = label.value));
        const url = row.createEl("input", { cls: "mpp-link-input-url" });
        url.type = "text"; url.placeholder = "https://…"; url.value = link.url;
        url.addEventListener("input", () => (link.url = url.value));
        const rm = row.createSpan({ cls: "mpp-path-remove", attr: { title: "Remove" } });
        setAntIcon(rm, "close");
        rm.addEventListener("click", () => { list.splice(i, 1); render(); });
      });
    };

    addBtn.addEventListener("click", () => { list.push({ label: "", url: "" }); render(); });
    render();
  }

  private buildPathField(container: HTMLElement, name: string, list: string[]) {
    const field = container.createDiv("mpp-path-field");
    const head  = field.createDiv("mpp-path-head");
    head.createSpan({ text: name, cls: "mpp-path-name" });
    const addBtn = head.createEl("button", { cls: "mpp-path-add" });
    setAntIcon(addBtn.createSpan(), "folderAdd");
    addBtn.createSpan({ text: "Add folder" });

    const listEl = field.createDiv("mpp-path-list");

    const render = () => {
      listEl.empty();
      if (!list.length) {
        listEl.createDiv({ text: "No folders selected", cls: "mpp-path-empty" });
        return;
      }
      list.forEach((p, i) => {
        const row = listEl.createDiv("mpp-path-row");
        const ic  = row.createSpan("mpp-path-icon");
        setAntIcon(ic, "folder");
        row.createSpan({ text: path.basename(p), cls: "mpp-path-base" });
        row.createSpan({ text: p, cls: "mpp-path-full", attr: { title: p } });
        const rm = row.createSpan({ cls: "mpp-path-remove", attr: { title: "Remove" } });
        setAntIcon(rm, "close");
        rm.addEventListener("click", () => { list.splice(i, 1); render(); });
      });
    };

    addBtn.addEventListener("click", async () => {
      const picked = await pickFolders();
      let changed = false;
      for (const p of picked) if (!list.includes(p)) { list.push(p); changed = true; }
      if (changed) render();
    });

    render();
  }

  onClose() { this.contentEl.empty(); }
}
