import { App, TFile, TFolder } from "obsidian";
import * as path from "path";
import { Project, ProjectFrontmatter, effectiveLinks } from "./project";
import { vaultBasePath } from "../util/obsidian";

const PROJECT_FILE = "_PROJECT.md";
const WORKFRONT_FILE = "_WORKFRONT-SUMMARY.md";

// All _PROJECT.md across the vault, with a title, sorted by title.
export function discover(app: App): { file: TFile; title: string }[] {
  return app.vault.getMarkdownFiles()
    .filter((f) => f.name === PROJECT_FILE)
    .map((f) => {
      const fm = app.metadataCache.getFileCache(f)?.frontmatter as ProjectFrontmatter | undefined;
      return { file: f, title: fm?.title?.trim() || f.parent?.name || f.path };
    })
    .filter((p) => p.title)
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Walk up from `folder` to find the nearest _PROJECT.md.
export function findFor(folder: TFolder | null): TFile | null {
  if (!folder) return null;
  const found = folder.children.find(
    (f): f is TFile => f instanceof TFile && f.name === PROJECT_FILE,
  );
  if (found) return found;
  return findFor(folder.parent instanceof TFolder ? folder.parent : null);
}

// Build a Project from a _PROJECT.md file. Returns null if it has no title.
export async function load(app: App, file: TFile): Promise<Project | null> {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter as ProjectFrontmatter | undefined;
  if (!fm?.title) return null;

  const folder = file.parent!;
  const reads  = (fm.read_paths  ?? []).filter((p) => path.isAbsolute(p));
  const writes = (fm.write_paths ?? []).filter((p) => path.isAbsolute(p));

  return {
    file,
    absDir: path.join(vaultBasePath(app), folder.path),
    vaultRelDir: folder.path,
    frontmatter: fm,
    links: effectiveLinks(fm),
    reads,
    writes,
    activityType: await loadActivityType(app, folder),
  };
}

async function loadActivityType(app: App, folder: TFolder): Promise<string | undefined> {
  const wfFile = folder.children.find(
    (f): f is TFile => f instanceof TFile && f.name === WORKFRONT_FILE,
  );
  if (!wfFile) return undefined;
  try {
    const content = await app.vault.read(wfFile);
    // Targeted extraction — avoids table parsing edge cases.
    const m = content.match(/\|\s*Activity Type\s*\|\s*([^|\r\n]+)/);
    return m?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}
