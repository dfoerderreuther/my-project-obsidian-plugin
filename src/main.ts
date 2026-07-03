import { addIcon, Plugin, TFile, TFolder } from "obsidian";
import { VIEW_TYPE } from "./constants";
import { antIconBody, setAntIcon } from "./icons";
import { ProjectFrontmatter } from "./model/project";
import { waitForMetadata } from "./util/obsidian";
import { ProjectPanelView } from "./ui/ProjectPanelView";
import { ProjectSettingsModal } from "./ui/ProjectSettingsModal";

export default class MyProjectPlugin extends Plugin {
  async onload() {
    // Register the Ant Design "project" icon for the ribbon + view tab.
    addIcon("my-project", antIconBody("project"));

    this.registerView(VIEW_TYPE, (leaf) => new ProjectPanelView(leaf));

    this.addRibbonIcon("my-project", "My Project Panel", () => this.activateView());

    this.addCommand({
      id: "open-project-panel",
      name: "Open project panel",
      callback: () => this.activateView(),
    });

    // Status bar button — always visible.
    const sb = this.addStatusBarItem();
    sb.addClass("mpp-statusbar");
    setAntIcon(sb.createSpan({ cls: "mpp-statusbar-icon" }), "project");
    sb.createSpan({ text: "Project" });
    sb.addEventListener("click", () => this.activateView());

    // Right-click a folder in Obsidian's file explorer → create/edit project.
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) return;
        const existing = file.children.find(
          (f): f is TFile => f instanceof TFile && f.name === "_PROJECT.md",
        ) ?? null;
        menu.addItem((item) =>
          item
            .setTitle(existing ? "Edit project" : "Create project")
            .setIcon("my-project")
            .onClick(() => this.openProjectModal(file, existing)),
        );
      }),
    );
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  // Open the settings modal for a folder, then reveal + load the project panel.
  private openProjectModal(folder: TFolder, existing: TFile | null) {
    const data = existing
      ? (this.app.metadataCache.getFileCache(existing)?.frontmatter as ProjectFrontmatter | undefined ?? {})
      : {};
    new ProjectSettingsModal(this.app, existing, folder, data, async (saved) => {
      await waitForMetadata(this.app, saved);
      await this.activateView();
      const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view;
      if (view instanceof ProjectPanelView) await view.showProject(saved);
    }).open();
  }

  async activateView() {
    const { workspace } = this.app;
    if (!workspace.getLeavesOfType(VIEW_TYPE).length) {
      const leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(workspace.getLeavesOfType(VIEW_TYPE)[0]);
  }
}
