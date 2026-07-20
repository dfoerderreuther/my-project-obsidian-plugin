import { App, TFile, normalizePath } from "obsidian";
import { openNoteLeaf } from "../util/obsidian";

// Date-prefixed new-note creator. Creates (or opens) a .md in the project folder.
export function renderNewNoteRow(
  app: App,
  container: HTMLElement,
  vaultRelDir: string,
  onCreated: () => void,
) {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const row   = container.createDiv("mpp-new-note");

  const input = row.createEl("input", { cls: "mpp-new-note-input" });
  input.type        = "text";
  input.value       = today + " ";
  input.placeholder = "yyyy-mm-dd note title";

  const btn = row.createEl("button", { text: "Create Note", cls: "mpp-new-note-btn" });

  const create = async () => {
    let name = input.value.trim();
    if (!name) return;
    if (!name.endsWith(".md")) name += ".md";
    const relPath = normalizePath(vaultRelDir + "/" + name);

    let vFile = app.vault.getAbstractFileByPath(relPath) as TFile | null;
    if (!vFile) vFile = await app.vault.create(relPath, "") as TFile;
    openNoteLeaf(app, vFile);
    onCreated();
  };

  btn.addEventListener("click", create);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") create(); });

  // Focus end of input on click so cursor is after the date prefix.
  input.addEventListener("focus", () => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
}
