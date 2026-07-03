import * as fs from "fs";

// Watches directories recursively and fires a debounced callback on any change.
// Unwatchable paths (e.g. offline cloud dirs) are skipped silently.
export class DirWatcher {
  private watchers: fs.FSWatcher[] = [];
  private timer: number | null = null;

  constructor(private onChange: () => void, private debounceMs = 300) {}

  watch(paths: string[]) {
    this.dispose();
    for (const p of paths) {
      try {
        this.watchers.push(fs.watch(p, { recursive: true }, () => this.schedule()));
      } catch { /* path may be unwatchable — ignore */ }
    }
  }

  private schedule() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { this.timer = null; this.onChange(); }, this.debounceMs);
  }

  dispose() {
    for (const w of this.watchers) { try { w.close(); } catch { /* ignore */ } }
    this.watchers = [];
    if (this.timer !== null) { window.clearTimeout(this.timer); this.timer = null; }
  }
}
