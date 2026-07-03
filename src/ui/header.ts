import { TFile } from "obsidian";
import { Project } from "../model/project";
import { setAntIcon } from "../icons";

export interface HeaderCallbacks {
  onSelectProject(file: TFile): void;
  onReload(): void;
  onSettings(): void;
  onClaude(): void;
}

// Fixed top region: project switcher/title + reload + gear, activity badge, action buttons.
export function renderHeader(
  fixed: HTMLElement,
  project: Project,
  projects: { file: TFile; title: string }[],
  cb: HeaderCallbacks,
) {
  const header = fixed.createDiv("mpp-header");

  // Project switcher — all _PROJECT.md in the vault, by title.
  if (projects.length > 1) {
    const sel = header.createEl("select", { cls: "mpp-project-select dropdown" });
    for (const p of projects) {
      const opt = sel.createEl("option", { text: p.title, value: p.file.path });
      if (p.file.path === project.file.path) opt.selected = true;
    }
    sel.addEventListener("change", () => {
      const target = projects.find((p) => p.file.path === sel.value);
      if (target) cb.onSelectProject(target.file);
    });
  } else {
    header.createEl("h2", { text: project.frontmatter.title ?? "Project", cls: "mpp-title" });
  }

  const reload = header.createDiv({ cls: "mpp-gear", attr: { title: "Reload panel" } });
  setAntIcon(reload, "reload");
  reload.addEventListener("click", () => cb.onReload());

  const gear = header.createDiv({ cls: "mpp-gear", attr: { title: "Edit _PROJECT.md" } });
  setAntIcon(gear, "setting");
  gear.addEventListener("click", () => cb.onSettings());

  // Action buttons.
  const actions = fixed.createDiv("mpp-actions");

  const claudeBtn = actions.createEl("button", { cls: "mpp-btn-claude mod-cta" });
  setAntIcon(claudeBtn.createSpan({ cls: "mpp-btn-icon" }), "thunderbolt");
  claudeBtn.createSpan({ text: "Claude Code" });
  claudeBtn.addEventListener("click", () => cb.onClaude());
}
