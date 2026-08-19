import { App, Modal, Notice, Setting } from "obsidian";
import {
	TimelineAdvancedFeatures,
	TimelineCardRadius,
	TimelineCardSide,
	TimelineDatePrecision,
	TimelineDensity,
	TimelineLayout,
	TimelineLineStyle,
	TimelineMarkerSize,
	TimelineShadowIntensity,
	TimelineSortOrder,
	TimelineSourceType,
	TimelineSpineThickness,
	TimelineViewConfig,
} from "./types";
import { log } from "./log";

/**
 * Sidebar-view counterpart to CodeBlockConfigModal, opened from the same
 * gear/Configure toolbar button (see render-vertical.ts / horizontal/index.ts
 * — both only check `callbacks.onConfigure` is truthy, agnostic to which
 * modal it opens) so editing a view no longer means leaving the pane for
 * Settings → Chronograph. Unlike the code block, a view also carries a name
 * and a source (query/table/tag/folder), which the code-block modal has no
 * fields for — the block's source is fixed to its own body/header, not user
 * editable from a modal — so those extra fields are grouped as a leading,
 * always-visible section here instead of reusing CodeBlockConfigModalValues.
 */
export class ViewConfigModal extends Modal {
	private values: TimelineViewConfig;
	private lineStyleSetting!: Setting;
	private cardSideSetting!: Setting;
	private tableNotePathSetting!: Setting;
	private dataviewQuerySetting!: Setting;
	private tagFilterSetting!: Setting;
	private folderFilterSetting!: Setting;
	private dateFieldSetting!: Setting;

	constructor(
		app: App,
		initial: TimelineViewConfig,
		private advanced: TimelineAdvancedFeatures,
		private onSave: (values: TimelineViewConfig) => Promise<void>
	) {
		super(app);
		// Deep-copy fields, not just the top-level object, so edits made in
		// the modal (including cancel-without-saving) never mutate the
		// caller's live config until submit() actually persists them.
		this.values = { ...initial, fields: { ...initial.fields } };
	}

	onOpen(): void {
		this.setTitle("Configure view");

		new Setting(this.contentEl).setName("Name").addText((text) =>
			text.setValue(this.values.name).onChange((value) => {
				this.values.name = value;
			})
		);

		new Setting(this.contentEl)
			.setName("Source")
			.setDesc(
				"Where events come from: a Dataview query across the vault, a Markdown table in one note, frontmatter scanned directly (no Dataview needed), or Obsidian tasks checklist emoji-dates."
			)
			.addDropdown((dd) =>
				dd
					.addOption("dataview", "Dataview query")
					.addOption("table", "Markdown table")
					.addOption("frontmatter", "Frontmatter (no Dataview)")
					.addOption("tasks", "Obsidian tasks emoji-dates")
					.setValue(this.values.sourceType)
					.onChange((value) => {
						this.values.sourceType = value as TimelineSourceType;
						this.refreshSourceVisibility();
					})
			);

		this.tableNotePathSetting = new Setting(this.contentEl)
			.setName("Table note path")
			.setDesc(
				'Vault path of the note whose body contains the events table, e.g. "Timeline/Events.md". The table needs a header row and a "---" divider row.'
			)
			.addText((text) =>
				text.setValue(this.values.tableNotePath).onChange((value) => {
					this.values.tableNotePath = value;
				})
			);

		this.dataviewQuerySetting = new Setting(this.contentEl)
			.setName("Dataview query")
			.setDesc('DQL source, for example: from "journal" where date')
			.addTextArea((text) =>
				text.setValue(this.values.dataviewQuery).onChange((value) => {
					this.values.dataviewQuery = value;
				})
			);

		this.tagFilterSetting = new Setting(this.contentEl)
			.setName("Tag filter (optional)")
			.setDesc('Only include notes carrying this tag, e.g. "event" or "#event". Leave empty to include all notes.')
			.addText((text) =>
				text.setValue(this.values.frontmatterTag).onChange((value) => {
					this.values.frontmatterTag = value;
				})
			);

		this.folderFilterSetting = new Setting(this.contentEl)
			.setName("Folder filter (optional)")
			.setDesc('Only include notes under this vault folder, e.g. "journal". Leave empty to include the whole vault.')
			.addText((text) =>
				text.setValue(this.values.frontmatterFolder).onChange((value) => {
					this.values.frontmatterFolder = value;
				})
			);

		this.dateFieldSetting = new Setting(this.contentEl)
			.setName("Date field")
			.setDesc("Table column header (table source) or frontmatter field (Dataview/frontmatter source) used as the event date.")
			.addText((text) =>
				text.setValue(this.values.fields.dateField).onChange((value) => {
					this.values.fields.dateField = value;
				})
			);

		this.refreshSourceVisibility();

		if (this.advanced.sortAndGranularity) {
			const group = this.group("Sort & date granularity");
			new Setting(group).setName("Sort order").addDropdown((dd) =>
				dd
					.addOption("asc", "Oldest first")
					.addOption("desc", "Newest first")
					.setValue(this.values.sortOrder)
					.onChange((value) => {
						this.values.sortOrder = value as TimelineSortOrder;
					})
			);
			new Setting(group)
				.setName("Date granularity")
				.setDesc("How dates are displayed and how the horizontal axis is ticked. Use coarser settings for ancient history.")
				.addDropdown((dd) =>
					dd
						.addOption("day", "Day")
						.addOption("month", "Month")
						.addOption("year", "Year")
						.addOption("decade", "Decade")
						.addOption("century", "Century")
						.addOption("millennium", "Millennium")
						.setValue(this.values.datePrecision)
						.onChange((value) => {
							this.values.datePrecision = value as TimelineDatePrecision;
						})
				);
		}

		// "Spine line style" stays a core (always-visible) setting rather than
		// gated behind advanced.layoutAndStyle like "Vertical card side" and
		// "Layout" are, so it renders into the advanced group's container when
		// that's on and directly into the modal otherwise — matching
		// CodeBlockConfigModal's same treatment of this one setting.
		const layoutStyleParent = this.advanced.layoutAndStyle ? this.group("Layout & style") : this.contentEl;

		if (this.advanced.layoutAndStyle) {
			new Setting(layoutStyleParent).setName("Layout").addDropdown((dd) =>
				dd
					.addOption("vertical", "Vertical list")
					.addOption("horizontal", "Horizontal axis")
					.setValue(this.values.layout)
					.onChange((value) => {
						this.values.layout = value as TimelineLayout;
						this.refreshLineStyleVisibility();
					})
			);

			this.cardSideSetting = new Setting(layoutStyleParent)
				.setName("Vertical card side")
				.setDesc("Vertical layout only.")
				.addDropdown((dd) =>
					dd
						.addOption("alternate", "Alternate sides")
						.addOption("left", "Left only")
						.addOption("right", "Right only")
						.setValue(this.values.verticalCardSide)
						.onChange((value) => {
							this.values.verticalCardSide = value as TimelineCardSide;
						})
				);
		}

		this.lineStyleSetting = new Setting(layoutStyleParent)
			.setName("Spine line style")
			.setDesc("Vertical layout only.")
			.addDropdown((dd) =>
				dd
					.addOption("solid", "Solid")
					.addOption("dashed", "Dashed")
					.addOption("dotted", "Dotted")
					.setValue(this.values.verticalLineStyle)
					.onChange((value) => {
						this.values.verticalLineStyle = value as TimelineLineStyle;
					})
			);
		this.refreshLineStyleVisibility();

		if (this.advanced.styleOverrides) {
			const group = this.group("Style overrides");

			new Setting(group).setName("Density").addDropdown((dd) =>
				dd
					.addOption("compact", "Compact")
					.addOption("comfortable", "Comfortable")
					.addOption("spacious", "Spacious")
					.setValue(this.values.density)
					.onChange((value) => {
						this.values.density = value as TimelineDensity;
					})
			);

			new Setting(group).setName("Card radius").addDropdown((dd) =>
				dd
					.addOption("none", "None")
					.addOption("small", "Small")
					.addOption("medium", "Medium")
					.addOption("large", "Large")
					.setValue(this.values.cardRadius)
					.onChange((value) => {
						this.values.cardRadius = value as TimelineCardRadius;
					})
			);

			new Setting(group).setName("Marker size").addDropdown((dd) =>
				dd
					.addOption("small", "Small")
					.addOption("medium", "Medium")
					.addOption("large", "Large")
					.setValue(this.values.markerSize)
					.onChange((value) => {
						this.values.markerSize = value as TimelineMarkerSize;
					})
			);

			new Setting(group).setName("Spine thickness").addDropdown((dd) =>
				dd
					.addOption("thin", "Thin")
					.addOption("medium", "Medium")
					.addOption("thick", "Thick")
					.setValue(this.values.spineThickness)
					.onChange((value) => {
						this.values.spineThickness = value as TimelineSpineThickness;
					})
			);

			new Setting(group).setName("Shadow intensity").addDropdown((dd) =>
				dd
					.addOption("none", "None")
					.addOption("subtle", "Subtle")
					.addOption("normal", "Normal")
					.setValue(this.values.shadowIntensity)
					.onChange((value) => {
						this.values.shadowIntensity = value as TimelineShadowIntensity;
					})
			);
		}

		if (this.advanced.extraFields) {
			const group = this.group("Field mappings");

			new Setting(group)
				.setName('End date field (default: "enddate")')
				.setDesc("Renders the event as a span instead of a point. Clear the box to stop mapping an end date.")
				.addText((text) =>
					text.setValue(this.values.fields.endDateField ?? "").onChange((value) => {
						this.values.fields.endDateField = value || undefined;
					})
				);

			new Setting(group)
				.setName('Title field (default: "title")')
				.setDesc("Falls back to the note's file name if the field is missing or cleared.")
				.addText((text) =>
					text.setValue(this.values.fields.titleField ?? "").onChange((value) => {
						this.values.fields.titleField = value || undefined;
					})
				);

			new Setting(group)
				.setName('Group field (default: "group")')
				.addText((text) =>
					text.setValue(this.values.fields.groupField ?? "").onChange((value) => {
						this.values.fields.groupField = value || undefined;
					})
				);

			new Setting(group)
				.setName('Color field (default: "color")')
				.setDesc('Field holding an explicit CSS color (e.g. "orange" or "#ff8800") for the event. Overrides the color derived from the group.')
				.addText((text) =>
					text.setValue(this.values.fields.colorField ?? "").onChange((value) => {
						this.values.fields.colorField = value || undefined;
					})
				);

			new Setting(group)
				.setName('Kind field (default: "kind")')
				.setDesc('Horizontal layout only: "event", "period", or "marker".')
				.addText((text) =>
					text.setValue(this.values.fields.kindField ?? "").onChange((value) => {
						this.values.fields.kindField = value || undefined;
					})
				);

			new Setting(group)
				.setName('Points-to field (default: "pointsto")')
				.setDesc("Horizontal layout only.")
				.addText((text) =>
					text.setValue(this.values.fields.pointsToField ?? "").onChange((value) => {
						this.values.fields.pointsToField = value || undefined;
					})
				);
		}

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Save")
				.setCta()
				.onClick(() => void this.submit())
		);
	}

	// Each advanced feature group renders as a collapsible <details> section
	// instead of a flat run of settings, so a view using only a couple of
	// advanced features doesn't force scrolling past every other group's
	// controls to find the Save button. Mirrors CodeBlockConfigModal's group().
	private group(label: string): HTMLElement {
		const details = this.contentEl.createEl("details", { cls: "timeline-config-group" });
		details.createEl("summary", { text: label });
		return details;
	}

	private refreshSourceVisibility(): void {
		const source = this.values.sourceType;
		this.tableNotePathSetting.settingEl.toggle(source === "table");
		this.dataviewQuerySetting.settingEl.toggle(source === "dataview");
		this.tagFilterSetting.settingEl.toggle(source === "frontmatter" || source === "tasks");
		this.folderFilterSetting.settingEl.toggle(source === "frontmatter" || source === "tasks");
		this.dateFieldSetting.settingEl.toggle(source !== "tasks");
	}

	private refreshLineStyleVisibility(): void {
		const isVertical = this.values.layout === "vertical";
		this.lineStyleSetting.settingEl.toggle(isVertical);
		this.cardSideSetting?.settingEl.toggle(isVertical);
	}

	private async submit(): Promise<void> {
		try {
			await this.onSave({ ...this.values, fields: { ...this.values.fields } });
			this.close();
		} catch (err) {
			log.error("Failed to save view configuration", {}, err);
			new Notice(err instanceof Error ? err.message : String(err));
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
