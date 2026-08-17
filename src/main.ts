import { Plugin, WorkspaceLeaf } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineGraphSettings } from "./types";
import { DEFAULT_SETTINGS } from "./settings";
import { TimelineView } from "./timeline-view";
import { TimelineGraphSettingTab } from "./settings-tab";

export default class TimelineGraphPlugin extends Plugin {
	settings!: TimelineGraphSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new TimelineView(leaf, this)
		);

		this.addRibbonIcon("calendar-clock", "Open Timeline Graph", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-timeline-graph",
			name: "Open Timeline Graph",
			callback: () => this.activateView(),
		});

		this.addSettingTab(new TimelineGraphSettingTab(this.app, this));
	}

	onunload(): void {
		// registerView/registerEvent handlers are cleaned up automatically.
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof TimelineView) {
				await view.refresh();
			}
		}
	}
}
