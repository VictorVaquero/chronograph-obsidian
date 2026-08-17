import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { TIMELINE_VIEW_TYPE, TimelineEvent, TimelineViewConfig } from "./types";
import {
	DataviewUnavailableError,
	isDataviewEnabled,
	queryTimelineEvents,
} from "./dataview-source";
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
			this.renderEmptyState();
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
			this.renderEmptyState();
			return;
		}

		this.contentEl.empty();

		if (!isDataviewEnabled(this.app)) {
			this.renderDataviewMissing();
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
			this.renderTimeline(events);
		} catch (err) {
			this.renderError(err instanceof Error ? err.message : String(err));
		}
	}

	private renderEmptyState(): void {
		this.contentEl.empty();
		const el = this.contentEl.createDiv({ cls: "timeline-graph-empty" });
		el.createEl("p", {
			text: "No timeline view configured yet. Add one in Settings → Timeline Graph.",
		});
	}

	private renderDataviewMissing(): void {
		const el = this.contentEl.createDiv({ cls: "timeline-graph-error" });
		el.createEl("p", {
			text: new DataviewUnavailableError().message,
		});
	}

	private renderError(message: string): void {
		this.contentEl.empty();
		const el = this.contentEl.createDiv({ cls: "timeline-graph-error" });
		el.createEl("p", { text: `Timeline Graph error: ${message}` });
	}

	private renderTimeline(events: TimelineEvent[]): void {
		if (events.length === 0) {
			const el = this.contentEl.createDiv({ cls: "timeline-graph-empty" });
			el.createEl("p", {
				text: "No events matched this view's query and date field.",
			});
			return;
		}

		// Placeholder rendering: a simple vertical list ordered by date.
		// The graphical/interactive timeline (zoom, pan, grouping lanes)
		// is implemented incrementally on top of this scaffold.
		const list = this.contentEl.createDiv({ cls: "timeline-graph-list" });
		for (const event of events) {
			const item = list.createDiv({ cls: "timeline-graph-item" });
			item.createEl("span", {
				cls: "timeline-graph-item-date",
				text: new Date(event.date).toLocaleDateString(),
			});
			const link = item.createEl("a", {
				cls: "timeline-graph-item-title",
				text: event.title,
			});
			link.addEventListener("click", (evt) => {
				evt.preventDefault();
				this.app.workspace.openLinkText(event.sourcePath, "", false);
			});
			if (event.description) {
				item.createEl("span", {
					cls: "timeline-graph-item-desc",
					text: event.description,
				});
			}
		}
	}
}

export function notifyDataviewMissing(): void {
	new Notice(new DataviewUnavailableError().message);
}
