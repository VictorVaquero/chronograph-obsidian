import { App, PluginSettingTab, SettingDefinitionItem, SettingDefinitionPage } from "obsidian";
import type TimelineGraphPlugin from "./main";
import { createDefaultView } from "./settings";
import { isDataviewEnabled } from "./sources/dataview-source";
import { TimelineViewConfig } from "./types";

export class TimelineGraphSettingTab extends PluginSettingTab {
	plugin: TimelineGraphPlugin;

	constructor(app: App, plugin: TimelineGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "",
				desc: "⚠ Dataview is not installed/enabled. Views using the Dataview source need it to fetch events; views using the table source work regardless.",
				visible: () => !isDataviewEnabled(this.app),
			},
			{
				name: "",
				desc: "Each view queries events from Dataview or a markdown table, and maps fields to timeline events.",
			},
			{
				type: "list",
				heading: "Timeline views",
				emptyState: "No timeline views yet.",
				items: this.plugin.settings.views.map((view) => this.buildViewPage(view)),
				addItem: {
					name: "Add view",
					action: () => {
						void this.addView();
					},
				},
				onDelete: (index) => {
					void this.deleteView(index);
				},
			},
		];
	}

	private async addView(): Promise<void> {
		this.plugin.settings.views.push(createDefaultView());
		await this.plugin.saveSettings();
		this.update();
	}

	private async deleteView(index: number): Promise<void> {
		const view: TimelineViewConfig | undefined = this.plugin.settings.views[index];
		this.plugin.settings.views.splice(index, 1);
		if (view && this.plugin.settings.defaultViewId === view.id) {
			this.plugin.settings.defaultViewId = null;
		}
		await this.plugin.saveSettings();
		this.update();
	}

	private buildViewPage(view: TimelineViewConfig): SettingDefinitionPage {
		return {
			type: "page",
			name: view.name || "Untitled view",
			desc:
				view.sourceType === "table"
					? `Table source: ${view.tableNotePath || "(not set)"}`
					: "Dataview source",
			items: this.buildViewItems(view),
		};
	}

	private buildViewItems(view: TimelineViewConfig): SettingDefinitionItem[] {
		return [
			{
				name: "Name",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.name).onChange(async (value) => {
							view.name = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Source",
				desc: "Where events come from: a Dataview query across the vault, or a markdown table in one note.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("dataview", "Dataview query")
							.addOption("table", "Markdown table")
							.setValue(view.sourceType)
							.onChange(async (value) => {
								view.sourceType = value as TimelineViewConfig["sourceType"];
								await this.plugin.saveSettings();
								this.refreshDomState();
							})
					);
				},
			},
			{
				name: "Table note path",
				desc:
					'Vault path of the note whose body contains the events table, e.g. "Timeline/Events.md". The table needs a header row and a "---" divider row; column headers are matched against the field names below.',
				visible: () => view.sourceType === "table",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.tableNotePath).onChange(async (value) => {
							view.tableNotePath = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Dataview query",
				desc: 'DQL source, e.g. from "Journal" where date',
				visible: () => view.sourceType !== "table",
				render: (setting) => {
					setting.addTextArea((text) =>
						text.setValue(view.dataviewQuery).onChange(async (value) => {
							view.dataviewQuery = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Date field",
				desc: "Table column header (table source) or frontmatter/inline field (Dataview source) used as the event date.",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.dateField).onChange(async (value) => {
							view.fields.dateField = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "End date field (optional)",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.endDateField ?? "").onChange(async (value) => {
							view.fields.endDateField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Title field (optional)",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.titleField ?? "").onChange(async (value) => {
							view.fields.titleField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Group field (optional)",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.groupField ?? "").onChange(async (value) => {
							view.fields.groupField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Color field (optional)",
				desc: "Field holding an explicit CSS color (e.g. \"orange\" or \"#ff8800\") for the event. Overrides the color derived from the group.",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.colorField ?? "").onChange(async (value) => {
							view.fields.colorField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Kind field (optional)",
				desc: 'Horizontal layout only: field whose value ("event", "period", or "marker") selects how the item renders. Unset/unrecognized values default to "event".',
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.kindField ?? "").onChange(async (value) => {
							view.fields.kindField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Sort order",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("asc", "Oldest first")
							.addOption("desc", "Newest first")
							.setValue(view.sortOrder)
							.onChange(async (value) => {
								view.sortOrder = value as "asc" | "desc";
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Layout",
				desc: "Vertical list or a horizontal axis with grouped lanes.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("vertical", "Vertical list")
							.addOption("horizontal", "Horizontal axis")
							.setValue(view.layout)
							.onChange(async (value) => {
								view.layout = value as "vertical" | "horizontal";
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Vertical card side",
				desc: "Vertical layout only: which side of the spine cards are placed on.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
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
				},
			},
			{
				name: "Vertical spine line style",
				desc: "Vertical layout only: visual style of the central spine line.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
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
				},
			},
			{
				name: "Date granularity",
				desc: "How dates are displayed and how the horizontal axis is ticked. Use coarser settings for ancient history.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
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
				},
			},
			{
				name: "Default view",
				desc: "Open this view by default when the timeline pane is created.",
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.defaultViewId === view.id)
							.onChange(async (value) => {
								this.plugin.settings.defaultViewId = value ? view.id : null;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
		];
	}
}
