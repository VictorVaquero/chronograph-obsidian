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
			void this.activateView();
		});

		this.addCommand({
			id: "open-view",
			name: "Open view",
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

		await workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<TimelineGraphSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// Back-fill fields introduced after views were first saved, so
		// pre-existing configs (which predate the table source) keep working.
		for (const view of this.settings.views) {
			view.sourceType ??= "dataview";
			view.tableNotePath ??= "";
		}
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
