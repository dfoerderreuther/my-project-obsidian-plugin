import { App, Notice, TFile } from "obsidian";

// Absolute filesystem path of the vault root.
export function vaultBasePath(app: App): string {
  return (app.vault.adapter as unknown as { basePath: string }).basePath;
}

// Open a filesystem path with the OS default handler (Finder / default app).
export function openPath(p: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require("electron") as { shell: { openPath: (p: string) => void } }).shell.openPath(p);
}

// Open a URL in the external browser.
export function openExternal(url: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require("electron") as { shell: { openExternal: (u: string) => void } }).shell.openExternal(url);
}

// Resolve once the metadata cache reflects a change to `file` (or after a timeout).
export function waitForMetadata(app: App, file: TFile, timeoutMs = 800): Promise<void> {
  return new Promise<void>((res) => {
    const ref = app.metadataCache.on("changed", (f) => {
      if (f.path === file.path) { app.metadataCache.offref(ref); res(); }
    });
    window.setTimeout(() => { app.metadataCache.offref(ref); res(); }, timeoutMs);
  });
}

interface ElectronDialog {
  showOpenDialog(opts: { properties: string[] }): Promise<{ canceled: boolean; filePaths: string[] }>;
}

// Native directory picker (multi-select). Returns [] on cancel or error.
export async function pickFolders(): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require("electron") as { remote?: { dialog: ElectronDialog } };
    const dialog: ElectronDialog =
      electron.remote?.dialog ??
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("@electron/remote") as { dialog: ElectronDialog }).dialog;
    const res = await dialog.showOpenDialog({ properties: ["openDirectory", "multiSelections"] });
    if (res.canceled) return [];
    return res.filePaths ?? [];
  } catch (e) {
    new Notice(`Folder picker unavailable: ${e}`);
    return [];
  }
}
