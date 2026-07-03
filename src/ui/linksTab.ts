import { Menu, Notice } from "obsidian";
import { ProjectLink } from "../model/project";
import { setAntIcon } from "../icons";
import { openExternal } from "../util/obsidian";

export interface LinksTabCallbacks {
  onAdd(link: ProjectLink): void;
  onRemove(url: string): void;
}

// Links tab body: add-link row on top, then the list of clickable links.
export function renderLinksTab(
  body: HTMLElement,
  links: ProjectLink[],
  cb: LinksTabCallbacks,
) {
  renderNewLinkRow(body, cb.onAdd);

  const list = body.createDiv("mpp-link-list");
  for (const l of links) {
    const row = list.createDiv({ cls: "mpp-link-row", attr: { title: l.url } });
    setAntIcon(row.createSpan({ cls: "mpp-link-icon" }), "cloud");
    row.createSpan({ text: l.label, cls: "mpp-link-label" });
    row.createSpan({ text: l.url, cls: "mpp-link-url" });
    row.addEventListener("click", () => openExternal(l.url));
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) => i.setTitle("Open").setIcon("lucide-arrow-up-right").onClick(() => openExternal(l.url)));
      menu.addItem((i) => i.setTitle("Copy URL").setIcon("lucide-copy").onClick(() => {
        void navigator.clipboard.writeText(l.url); new Notice("URL copied");
      }));
      menu.addSeparator();
      menu.addItem((i) => i.setTitle("Remove link").setIcon("lucide-trash-2").onClick(() => cb.onRemove(l.url)));
      menu.showAtMouseEvent(e);
    });
  }
}

function renderNewLinkRow(container: HTMLElement, onAdd: (link: ProjectLink) => void) {
  const row = container.createDiv("mpp-new-link");

  const label = row.createEl("input", { cls: "mpp-new-link-label" });
  label.type = "text"; label.placeholder = "Label";

  const url = row.createEl("input", { cls: "mpp-new-link-url" });
  url.type = "text"; url.placeholder = "https://…";

  const btn = row.createEl("button", { text: "Add", cls: "mpp-new-note-btn" });

  const add = () => {
    const u = url.value.trim();
    if (!u) { new Notice("URL required"); return; }
    onAdd({ label: label.value.trim() || u, url: u });
  };

  btn.addEventListener("click", add);
  url.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  label.addEventListener("keydown", (e) => { if (e.key === "Enter") url.focus(); });
}
