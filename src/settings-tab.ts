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
				"⚠ Dataview is not installed/enabled. Views using the Dataview source need it to fetch events; views using the Table source work regardless."
			);
		}

		new Setting(containerEl)
			.setName("Timeline views")
			.setDesc(
				"Each view queries events from Dataview or a markdown table, and maps fields to timeline events."
			)
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
			.setName("Source")
			.setDesc("Where events come from: a Dataview query across the vault, or a markdown table in one note.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("dataview", "Dataview query")
					.addOption("table", "Markdown table")
					.setValue(view.sourceType)
					.onChange(async (value) => {
						view.sourceType = value as TimelineViewConfig["sourceType"];
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (view.sourceType === "table") {
			new Setting(section)
				.setName("Table note path")
				.setDesc(
					'Vault path of the note whose body contains the events table, e.g. "Timeline/Events.md". The table needs a header row and a "---" divider row; column headers are matched against the field names below.'
				)
				.addText((text) =>
					text.setValue(view.tableNotePath).onChange(async (value) => {
						view.tableNotePath = value;
						await this.plugin.saveSettings();
					})
				);
		} else {
			new Setting(section)
				.setName("Dataview query")
				.setDesc('DQL source, e.g. FROM "Journal" WHERE date')
				.addTextArea((text) =>
					text.setValue(view.dataviewQuery).onChange(async (value) => {
						view.dataviewQuery = value;
						await this.plugin.saveSettings();
					})
				);
		}

		new Setting(section)
			.setName("Date field")
			.setDesc(
				view.sourceType === "table"
					? "Table column header used as the event date."
					: "Frontmatter/inline field used as the event date."
			)
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
			.setName("Kind field (optional)")
			.setDesc('Horizontal layout only: field whose value ("event", "period", or "marker") selects how the item renders. Unset/unrecognized values default to "event".')
			.addText((text) =>
				text
					.setValue(view.fields.kindField ?? "")
					.onChange(async (value) => {
						view.fields.kindField = value || undefined;
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
			.setName("Vertical card side")
			.setDesc("Vertical layout only: which side of the spine cards are placed on.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("alternate", "Alternate sides")
					.addOption("left", "Left only")
					.addOption("right", "Right only")
					.setValue(view.verticalCardSide)
					.onChange(async (value) => {
						view.verticalCardSide = value as TimelineViewConfig["verticalCardSide"];
						await this.plugin.saveSettings();
					})
			);

		new Setting(section)
			.setName("Vertical spine line style")
			.setDesc("Vertical layout only: visual style of the central spine line.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("solid", "Solid")
					.addOption("dashed", "Dashed")
					.addOption("dotted", "Dotted")
					.setValue(view.verticalLineStyle)
					.onChange(async (value) => {
						view.verticalLineStyle = value as TimelineViewConfig["verticalLineStyle"];
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
