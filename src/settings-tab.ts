import { App, PluginSettingTab, Setting } from "obsidian";
import type TimelineGraphPlugin from "./main";
import { createDefaultView } from "./settings";
import { isDataviewEnabled } from "./dataview-source";
import { TimelineViewConfig } from "./types";

export class TimelineGraphSettingTab extends PluginSettingTab {
	plugin: TimelineGraphPlugin;

	constructor(app: App, plugin: TimelineGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		if (!isDataviewEnabled(this.app)) {
			new Setting(containerEl).setDesc(
				"⚠ Dataview is not installed/enabled. Timeline Graph needs it as a query backend to fetch events."
			);
		}

		new Setting(containerEl)
			.setName("Timeline views")
			.setDesc("Each view defines a Dataview query and how to map fields to timeline events.")
			.addButton((btn) =>
				btn.setButtonText("Add view").onClick(async () => {
					const view = createDefaultView();
					this.plugin.settings.views.push(view);
					await this.plugin.saveSettings();
					this.display();
				})
			);

		for (const view of this.plugin.settings.views) {
			this.renderViewConfig(containerEl, view);
		}
	}

	private renderViewConfig(containerEl: HTMLElement, view: TimelineViewConfig): void {
		const section = containerEl.createDiv({ cls: "timeline-graph-view-config" });

		new Setting(section)
			.setName("Name")
			.addText((text) =>
				text.setValue(view.name).onChange(async (value) => {
					view.name = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(section)
			.setName("Dataview query")
			.setDesc('DQL source, e.g. FROM "Journal" WHERE date')
			.addTextArea((text) =>
				text.setValue(view.dataviewQuery).onChange(async (value) => {
					view.dataviewQuery = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(section)
			.setName("Date field")
			.setDesc("Frontmatter/inline field used as the event date.")
			.addText((text) =>
				text.setValue(view.fields.dateField).onChange(async (value) => {
					view.fields.dateField = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(section)
			.setName("End date field (optional)")
			.addText((text) =>
				text
					.setValue(view.fields.endDateField ?? "")
					.onChange(async (value) => {
						view.fields.endDateField = value || undefined;
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Title field (optional)")
			.addText((text) =>
				text
					.setValue(view.fields.titleField ?? "")
					.onChange(async (value) => {
						view.fields.titleField = value || undefined;
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Group/color field (optional)")
			.addText((text) =>
				text
					.setValue(view.fields.groupField ?? "")
					.onChange(async (value) => {
						view.fields.groupField = value || undefined;
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Sort order")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("asc", "Oldest first")
					.addOption("desc", "Newest first")
					.setValue(view.sortOrder)
					.onChange(async (value) => {
						view.sortOrder = value as "asc" | "desc";
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Layout")
			.setDesc("Vertical list or a horizontal axis with grouped lanes.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("vertical", "Vertical list")
					.addOption("horizontal", "Horizontal axis")
					.setValue(view.layout)
					.onChange(async (value) => {
						view.layout = value as "vertical" | "horizontal";
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Date granularity")
			.setDesc("How dates are displayed and how the horizontal axis is ticked. Use coarser settings for ancient history.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("day", "Day")
					.addOption("month", "Month")
					.addOption("year", "Year")
					.addOption("decade", "Decade")
					.addOption("century", "Century")
					.addOption("millennium", "Millennium")
					.setValue(view.datePrecision)
					.onChange(async (value) => {
						view.datePrecision = value as TimelineViewConfig["datePrecision"];
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Default view")
			.setDesc("Open this view by default when the timeline pane is created.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultViewId === view.id)
					.onChange(async (value) => {
						this.plugin.settings.defaultViewId = value ? view.id : null;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(section).addButton((btn) =>
			btn
				.setButtonText("Delete view")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.views = this.plugin.settings.views.filter(
						(v) => v.id !== view.id
					);
					if (this.plugin.settings.defaultViewId === view.id) {
						this.plugin.settings.defaultViewId = null;
					}
					await this.plugin.saveSettings();
					this.display();
				})
		);
	}
}
