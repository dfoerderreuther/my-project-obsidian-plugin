import { TFile } from "obsidian";

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectFrontmatter {
  title?: string;
  workfront?: string; // legacy — migrated into `links` on next save
  links?: ProjectLink[];
  read_paths?: string[];
  write_paths?: string[];
}

// A loaded project: its _PROJECT.md plus everything derived from it.
export interface Project {
  file: TFile;
  absDir: string;        // absolute filesystem path of the project folder
  vaultRelDir: string;   // vault-relative path of the project folder
  frontmatter: ProjectFrontmatter;
  links: ProjectLink[];  // effective links (stored + legacy workfront)
  reads: string[];       // absolute read_paths
  writes: string[];      // absolute write_paths
}

// Effective links = stored links + legacy workfront, deduped by url.
export function effectiveLinks(fm: ProjectFrontmatter | null): ProjectLink[] {
  const out: ProjectLink[] = [];
  const seen = new Set<string>();
  const push = (l: ProjectLink) => {
    if (l.url && !seen.has(l.url)) { seen.add(l.url); out.push(l); }
  };
  for (const l of fm?.links ?? []) if (l && l.url) push({ label: l.label || l.url, url: l.url });
  if (fm?.workfront) push({ label: "Workfront", url: fm.workfront });
  return out;
}
