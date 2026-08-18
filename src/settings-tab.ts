import { App, PluginSettingTab, SettingDefinitionItem, SettingDefinitionPage } from "obsidian";
import type TimelineGraphPlugin from "./main";
import { createDefaultView } from "./settings";
import { isDataviewEnabled } from "./sources/dataview-source";
import { TimelineViewConfig } from "./types";
import { TimelineLogLevel } from "./log";

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
				desc: "⚠ Dataview is not installed/enabled. Views using the Dataview source need it to fetch events; views using the table or frontmatter source work regardless.",
				visible: () => !isDataviewEnabled(this.app),
			},
			{
				name: "",
				desc: "Each view queries events from Dataview, a markdown table, or frontmatter scanned directly (no Dataview needed), and maps fields to timeline events.",
			},
			{
				name: "",
				desc: 'Every view already has sensible defaults for the settings below (a "date"/"title"/"group"/"enddate"/... field mapping, vertical layout, oldest-first, day precision). These toggles don\'t turn features on or off — they just show the controls to change a default per view. Leave them off if the defaults work for you.',
			},
			{
				name: "Extra field mappings",
				desc: 'Show controls to rename the fields used for end date, title, group, color, kind, and points-to (defaults: "enddate", "title", "group", "color", "kind", "pointsto"). Only needed if your notes use different field names.',
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.advanced.extraFields)
							.onChange(async (value) => {
								this.plugin.settings.advanced.extraFields = value;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
			{
				name: "Layout & style options",
				desc: "Show controls to change a view's layout (default: vertical list) and vertical-layout card side/spine line style. These are per-view settings — most vaults never need more than one layout.",
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.advanced.layoutAndStyle)
							.onChange(async (value) => {
								this.plugin.settings.advanced.layoutAndStyle = value;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
			{
				name: "Sort & date granularity",
				desc: "Show controls to change a view's sort order (default: oldest first) and date granularity (default: day). Granularity in particular is usually set per view — coarser for a history timeline, exact for a daily journal.",
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.advanced.sortAndGranularity)
							.onChange(async (value) => {
								this.plugin.settings.advanced.sortAndGranularity = value;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
			{
				name: "Multiple views",
				desc: "Show the control to set which view opens by default. Only useful once you have more than one view.",
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.advanced.multiView)
							.onChange(async (value) => {
								this.plugin.settings.advanced.multiView = value;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
			{
				name: "Style overrides",
				desc: "Show controls to change a view's density, corner radius, marker size, spine thickness, and shadow intensity. Defaults already look good — for deeper customization (fonts, exact colors), target this plugin's CSS classes with an Obsidian CSS snippet instead (see the README).",
				render: (setting) => {
					setting.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.advanced.styleOverrides)
							.onChange(async (value) => {
								this.plugin.settings.advanced.styleOverrides = value;
								await this.plugin.saveSettings();
								this.update();
							})
					);
				},
			},
			{
				name: "Log level",
				desc: 'How much Chronograph prints to the developer console (Ctrl/Cmd+Shift+I), prefixed "[Chronograph]". "Warnings & errors" is the default; set to "Debug" when troubleshooting a source/query issue, then back down afterward.',
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("off", "Off")
							.addOption("error", "Errors only")
							.addOption("warn", "Warnings & errors")
							.addOption("info", "Info & above")
							.addOption("debug", "Debug (verbose)")
							.setValue(this.plugin.settings.logLevel)
							.onChange(async (value) => {
								this.plugin.settings.logLevel = value as TimelineLogLevel;
								await this.plugin.saveSettings();
							})
					);
				},
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
					: view.sourceType === "frontmatter"
						? "Frontmatter source (no Dataview needed)"
						: view.sourceType === "tasks"
							? "Obsidian Tasks emoji-dates (no Dataview needed)"
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
				desc: "Where events come from: a Dataview query across the vault, a markdown table in one note, frontmatter scanned directly (no Dataview needed), or Obsidian Tasks checklist emoji-dates.",
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("dataview", "Dataview query")
							.addOption("table", "Markdown table")
							.addOption("frontmatter", "Frontmatter (no Dataview)")
							.addOption("tasks", "Obsidian tasks emoji-dates")
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
				visible: () => view.sourceType === "dataview",
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
				name: "Tag filter (optional)",
				desc: 'Only include notes carrying this tag, e.g. "event" or "#event". Leave empty to include all notes (narrow with the folder filter instead).',
				visible: () => view.sourceType === "frontmatter" || view.sourceType === "tasks",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.frontmatterTag).onChange(async (value) => {
							view.frontmatterTag = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Folder filter (optional)",
				desc: 'Only include notes under this vault folder, e.g. "Journal". Leave empty to include the whole vault.',
				visible: () => view.sourceType === "frontmatter" || view.sourceType === "tasks",
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.frontmatterFolder).onChange(async (value) => {
							view.frontmatterFolder = value;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "",
				desc: 'Each checklist line (`- [ ] ...`) carrying a recognized emoji-date becomes its own event: 📅 due, ⏳ scheduled, 🛫 start (checked as "Done" otherwise "Open"), ✅ done. The task text (with emoji metadata stripped) is the title.',
				visible: () => view.sourceType === "tasks",
			},
			{
				name: "Date field",
				desc: "Table column header (table source) or frontmatter field (Dataview/frontmatter source) used as the event date.",
				visible: () => view.sourceType !== "tasks",
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
				name: 'End date field (default: "enddate")',
				desc: "Renders the event as a span instead of a point. Clear the box to stop mapping an end date.",
				visible: () => this.plugin.settings.advanced.extraFields,
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
				name: 'Title field (default: "title")',
				desc: "Falls back to the note's file name if the field is missing or cleared.",
				visible: () => this.plugin.settings.advanced.extraFields,
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
				name: 'Group field (default: "group")',
				visible: () => this.plugin.settings.advanced.extraFields,
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
				name: 'Color field (default: "color")',
				desc: "Field holding an explicit CSS color (e.g. \"orange\" or \"#ff8800\") for the event. Overrides the color derived from the group.",
				visible: () => this.plugin.settings.advanced.extraFields,
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
				name: 'Kind field (default: "kind")',
				desc: 'Horizontal layout only: field whose value ("event", "period", or "marker") selects how the item renders. Unset/unrecognized values default to "event".',
				visible: () => this.plugin.settings.advanced.extraFields,
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
				name: 'Points-to field (default: "pointsto")',
				desc: "Horizontal layout only: field holding the title of another event in this view to draw a connecting arrow toward.",
				visible: () => this.plugin.settings.advanced.extraFields,
				render: (setting) => {
					setting.addText((text) =>
						text.setValue(view.fields.pointsToField ?? "").onChange(async (value) => {
							view.fields.pointsToField = value || undefined;
							await this.plugin.saveSettings();
						})
					);
				},
			},
			{
				name: "Sort order",
				visible: () => this.plugin.settings.advanced.sortAndGranularity,
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
				visible: () => this.plugin.settings.advanced.layoutAndStyle,
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
				visible: () => this.plugin.settings.advanced.layoutAndStyle,
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
				visible: () => this.plugin.settings.advanced.layoutAndStyle,
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
				name: "Density",
				desc: "Card padding, node spacing, and lane height.",
				visible: () => this.plugin.settings.advanced.styleOverrides,
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("compact", "Compact")
							.addOption("comfortable", "Comfortable")
							.addOption("spacious", "Spacious")
							.setValue(view.density)
							.onChange(async (value) => {
								view.density = value as TimelineViewConfig["density"];
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Card radius",
				desc: "Corner rounding for cards, tooltips, and badges.",
				visible: () => this.plugin.settings.advanced.styleOverrides,
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("none", "None")
							.addOption("small", "Small")
							.addOption("medium", "Medium")
							.addOption("large", "Large")
							.setValue(view.cardRadius)
							.onChange(async (value) => {
								view.cardRadius = value as TimelineViewConfig["cardRadius"];
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Marker size",
				desc: "Diameter of the vertical spine dot and horizontal point marker.",
				visible: () => this.plugin.settings.advanced.styleOverrides,
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("small", "Small")
							.addOption("medium", "Medium")
							.addOption("large", "Large")
							.setValue(view.markerSize)
							.onChange(async (value) => {
								view.markerSize = value as TimelineViewConfig["markerSize"];
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Spine thickness",
				desc: "Width of the vertical spine line and horizontal connector.",
				visible: () => this.plugin.settings.advanced.styleOverrides,
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("thin", "Thin")
							.addOption("medium", "Medium")
							.addOption("thick", "Thick")
							.setValue(view.spineThickness)
							.onChange(async (value) => {
								view.spineThickness = value as TimelineViewConfig["spineThickness"];
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Shadow intensity",
				desc: "Elevation shadow on cards and tooltips.",
				visible: () => this.plugin.settings.advanced.styleOverrides,
				render: (setting) => {
					setting.addDropdown((dropdown) =>
						dropdown
							.addOption("none", "None")
							.addOption("subtle", "Subtle")
							.addOption("normal", "Normal")
							.setValue(view.shadowIntensity)
							.onChange(async (value) => {
								view.shadowIntensity = value as TimelineViewConfig["shadowIntensity"];
								await this.plugin.saveSettings();
							})
					);
				},
			},
			{
				name: "Date granularity",
				desc: "How dates are displayed and how the horizontal axis is ticked. Use coarser settings for ancient history.",
				visible: () => this.plugin.settings.advanced.sortAndGranularity,
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
				visible: () => this.plugin.settings.advanced.multiView,
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
