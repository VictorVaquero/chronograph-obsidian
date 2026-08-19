import { HoverParent, HoverPopover, ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineViewConfig } from "./types";
import {
	DataviewUnavailableError,
	isDataviewEnabled,
	onDataviewRefresh,
	queryTimelineEvents,
} from "./sources/dataview-source";
import { queryTimelineEventsFromTable } from "./sources/table-source";
import { queryTimelineEventsFromFrontmatter } from "./sources/frontmatter-source";
import { queryTimelineEventsFromTasks } from "./sources/tasks-source";
import { renderEmptyState, renderErrorState, renderTimeline } from "./render/timeline-renderer";
import { compareTimelineDates } from "./date/timeline-date";
import { TimelineCreateEventModal } from "./create-event-modal";
import { exportSnapshot } from "./export-snapshot";
import { ViewConfigModal } from "./view-config-modal";
import type TimelineGraphPlugin from "./main";
import { log } from "./log";

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

		// Dataview finishes indexing the vault asynchronously after Obsidian
		// starts, often after this view has already opened and refreshed once —
		// a dataview-source view opened at startup would otherwise show zero
		// events and never update. Dataview's own built-in query views listen
		// for this same event to know when to re-render; see code-block-view.ts
		// for the equivalent code-block-side fix.
		this.registerEvent(onDataviewRefresh(this.app, () => void this.refresh()));

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
			log.debug("Refreshing view", { view: config.name, sourceType: config.sourceType });
			const events =
				config.sourceType === "table"
					? await queryTimelineEventsFromTable(this.app, config.tableNotePath, config.fields)
					: config.sourceType === "frontmatter"
						? queryTimelineEventsFromFrontmatter(
								this.app,
								config.frontmatterTag,
								config.frontmatterFolder,
								config.fields
							)
						: config.sourceType === "tasks"
							? await queryTimelineEventsFromTasks(
									this.app,
									config.frontmatterTag,
									config.frontmatterFolder
								)
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
					onCreateEvent:
						config.sourceType === "tasks"
							? undefined
							: () => {
									new TimelineCreateEventModal(this.app, config, () => void this.refresh()).open();
								},
					onExportSnapshot: () => {
						void exportSnapshot(this.app, config, events);
					},
					onConfigure: () => {
						new ViewConfigModal(this.app, config, this.plugin.settings.advanced, async (values) => {
							const index = this.plugin.settings.views.findIndex((v) => v.id === config.id);
							if (index === -1) {
								throw new Error("This view no longer exists — it may have been deleted in Settings → Chronograph.");
							}
							this.plugin.settings.views[index] = values;
							this.activeConfig = values;
							await this.plugin.saveSettings();
							new Notice("Timeline view saved.");
						}).open();
					},
				},
				{
					precision: config.datePrecision,
					verticalCardSide: config.verticalCardSide,
					verticalLineStyle: config.verticalLineStyle,
					styleVars: {
						density: config.density,
						cardRadius: config.cardRadius,
						markerSize: config.markerSize,
						spineThickness: config.spineThickness,
						shadowIntensity: config.shadowIntensity,
					},
				}
			);
		} catch (err) {
			log.error("Failed to refresh view", { view: this.activeConfig?.name }, err);
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
