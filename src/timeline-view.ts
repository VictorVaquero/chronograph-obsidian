import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineViewConfig } from "./types";
import {
	DataviewUnavailableError,
	isDataviewEnabled,
	queryTimelineEvents,
} from "./dataview-source";
import { renderEmptyState, renderErrorState, renderTimeline } from "./timeline-renderer";
import type TimelineGraphPlugin from "./main";

export class TimelineView extends ItemView {
	private plugin: TimelineGraphPlugin;
	private activeConfig: TimelineViewConfig | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TimelineGraphPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TIMELINE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.activeConfig?.name ?? "Timeline";
	}

	getIcon(): string {
		return "calendar-clock";
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass("timeline-graph-view");

		const config =
			this.plugin.settings.views.find(
				(v) => v.id === this.plugin.settings.defaultViewId
			) ?? this.plugin.settings.views[0];

		if (config) {
			await this.setConfig(config);
		} else {
			renderEmptyState(
				this.contentEl,
				"No timeline view configured yet. Add one in Settings → Timeline Graph."
			);
		}
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	async setConfig(config: TimelineViewConfig): Promise<void> {
		this.activeConfig = config;
		await this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.activeConfig) {
			renderEmptyState(
				this.contentEl,
				"No timeline view configured yet. Add one in Settings → Timeline Graph."
			);
			return;
		}

		if (!isDataviewEnabled(this.app)) {
			renderErrorState(this.contentEl, new DataviewUnavailableError().message);
			return;
		}

		try {
			const events = await queryTimelineEvents(
				this.app,
				this.activeConfig.dataviewQuery,
				this.activeConfig.fields
			);
			events.sort((a, b) =>
				this.activeConfig!.sortOrder === "asc"
					? a.date - b.date
					: b.date - a.date
			);
			renderTimeline(this.contentEl, events, this.activeConfig.layout, {
				onEventClick: (event) =>
					this.app.workspace.openLinkText(event.sourcePath, "", false),
			});
		} catch (err) {
			renderErrorState(
				this.contentEl,
				err instanceof Error ? err.message : String(err)
			);
		}
	}
}

export function notifyDataviewMissing(): void {
	new Notice(new DataviewUnavailableError().message);
}
