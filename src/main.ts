import { Plugin, WorkspaceLeaf } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineGraphSettings } from "./types";
import { DEFAULT_SETTINGS } from "./settings";
import { TimelineView } from "./timeline-view";
import { TimelineGraphSettingTab } from "./settings-tab";
import { registerCommands } from "./commands";
import { registerCodeBlockProcessor } from "./code-block-view";
import { log, setLogLevel } from "./log";

export default class TimelineGraphPlugin extends Plugin {
	settings!: TimelineGraphSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		log.info("Plugin loaded");

		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new TimelineView(leaf, this)
		);

		this.addRibbonIcon("calendar-clock", "Open Chronograph", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-view",
			name: "Open view",
			callback: () => this.activateView(),
		});

		this.registerHoverLinkSource("chronograph", {
			display: "Chronograph",
			defaultMod: false,
		});

		registerCommands(this);
		registerCodeBlockProcessor(this);

		this.addSettingTab(new TimelineGraphSettingTab(this.app, this));
	}

	onunload(): void {
		// registerView/registerEvent handlers are cleaned up automatically.
		log.info("Plugin unloaded");
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
		this.settings.advanced = Object.assign({}, DEFAULT_SETTINGS.advanced, data?.advanced ?? {});
		// Back-fill fields introduced after views were first saved, so
		// pre-existing configs (which predate the table source) keep working.
		for (const view of this.settings.views) {
			view.sourceType ??= "dataview";
			view.tableNotePath ??= "";
			view.frontmatterTag ??= "";
			view.frontmatterFolder ??= "";
		}
		setLogLevel(this.settings.logLevel);
	}

	async saveSettings(): Promise<void> {
		setLogLevel(this.settings.logLevel);
		await this.saveData(this.settings);
		for (const leaf of this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof TimelineView) {
				await view.refresh();
			}
		}
	}
}
