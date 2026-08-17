import { HoverParent, HoverPopover, ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineViewConfig } from "./types";
import {
	DataviewUnavailableError,
	isDataviewEnabled,
	queryTimelineEvents,
} from "./sources/dataview-source";
import { queryTimelineEventsFromTable } from "./sources/table-source";
import { renderEmptyState, renderErrorState, renderTimeline } from "./render/timeline-renderer";
import { compareTimelineDates } from "./date/timeline-date";
import type TimelineGraphPlugin from "./main";

export class TimelineView extends ItemView implements HoverParent {
	private plugin: TimelineGraphPlugin;
	private activeConfig: TimelineViewConfig | null = null;
	hoverPopover: HoverPopover | null = null;

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
				"No timeline view configured yet. Add one in Settings → Chronograph."
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
				"No timeline view configured yet. Add one in Settings → Chronograph."
			);
			return;
		}

		if (this.activeConfig.sourceType === "dataview" && !isDataviewEnabled(this.app)) {
			renderErrorState(this.contentEl, new DataviewUnavailableError().message);
			return;
		}

		try {
			const config = this.activeConfig;
			const events =
				config.sourceType === "table"
					? await queryTimelineEventsFromTable(this.app, config.tableNotePath, config.fields)
					: await queryTimelineEvents(this.app, config.dataviewQuery, config.fields);
			events.sort((a, b) =>
				config.sortOrder === "asc"
					? compareTimelineDates(a.date, b.date)
					: compareTimelineDates(b.date, a.date)
			);
			renderTimeline(
				this.contentEl,
				events,
				config.layout,
				{
					onEventClick: (event) => {
						void this.app.workspace.openLinkText(event.sourcePath, "", false);
					},
					onEventHover: (event, evt, targetEl) => {
						this.app.workspace.trigger("hover-link", {
							event: evt,
							source: "chronograph",
							hoverParent: this,
							targetEl,
							linktext: event.sourcePath,
							sourcePath: "",
						});
					},
				},
				{
					precision: config.datePrecision,
					verticalCardSide: config.verticalCardSide,
					verticalLineStyle: config.verticalLineStyle,
				}
			);
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
