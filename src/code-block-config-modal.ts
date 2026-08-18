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
	TimelineSpineThickness,
} from "./types";
import { log } from "./log";

export interface CodeBlockConfigModalValues {
	layout: TimelineLayout;
	precision: TimelineDatePrecision;
	density: TimelineDensity;
	linestyle: TimelineLineStyle;
	height: number | "fill";
	sortOrder: TimelineSortOrder;
	cardSide: TimelineCardSide;
	cardRadius: TimelineCardRadius;
	markerSize: TimelineMarkerSize;
	spineThickness: TimelineSpineThickness;
	shadowIntensity: TimelineShadowIntensity;
	endDateField: string;
	titleField: string;
	groupField: string;
	colorField: string;
	kindField: string;
	pointsToField: string;
}

export class CodeBlockConfigModal extends Modal {
	private values: CodeBlockConfigModalValues;
	private lineStyleSetting!: Setting;
	private cardSideSetting!: Setting;

	constructor(
		app: App,
		initial: CodeBlockConfigModalValues,
		private advanced: TimelineAdvancedFeatures,
		private onSave: (values: CodeBlockConfigModalValues) => Promise<void>
	) {
		super(app);
		this.values = { ...initial };
	}

	onOpen(): void {
		this.setTitle("Configure timeline");

		new Setting(this.contentEl).setName("Layout").addDropdown((dd) =>
			dd
				.addOption("vertical", "Vertical list")
				.addOption("horizontal", "Horizontal axis")
				.setValue(this.values.layout)
				.onChange((value) => {
					this.values.layout = value as TimelineLayout;
					this.refreshLineStyleVisibility();
				})
		);

		new Setting(this.contentEl).setName("Precision").addDropdown((dd) =>
			dd
				.addOption("day", "Day")
				.addOption("month", "Month")
				.addOption("year", "Year")
				.addOption("decade", "Decade")
				.addOption("century", "Century")
				.addOption("millennium", "Millennium")
				.setValue(this.values.precision)
				.onChange((value) => {
					this.values.precision = value as TimelineDatePrecision;
				})
		);

		new Setting(this.contentEl).setName("Density").addDropdown((dd) =>
			dd
				.addOption("compact", "Compact")
				.addOption("comfortable", "Comfortable")
				.addOption("spacious", "Spacious")
				.setValue(this.values.density)
				.onChange((value) => {
					this.values.density = value as TimelineDensity;
				})
		);

		new Setting(this.contentEl)
			.setName("Height")
			.setDesc('"fill" to grow with content, or a pixel value (e.g. 480) to scroll internally past that height.')
			.addText((text) =>
				text.setValue(String(this.values.height)).onChange((value) => {
					const trimmed = value.trim().toLowerCase();
					if (trimmed === "fill") {
						this.values.height = "fill";
					} else if (/^\d+$/.test(trimmed) && Number(trimmed) > 0) {
						this.values.height = Number(trimmed);
					}
				})
			);

		if (this.advanced.sortAndGranularity) {
			new Setting(this.contentEl).setName("Sort order").addDropdown((dd) =>
				dd
					.addOption("asc", "Oldest first")
					.addOption("desc", "Newest first")
					.setValue(this.values.sortOrder)
					.onChange((value) => {
						this.values.sortOrder = value as TimelineSortOrder;
					})
			);
		}

		if (this.advanced.layoutAndStyle) {
			this.cardSideSetting = new Setting(this.contentEl)
				.setName("Vertical card side")
				.setDesc("Vertical layout only.")
				.addDropdown((dd) =>
					dd
						.addOption("alternate", "Alternate sides")
						.addOption("left", "Left only")
						.addOption("right", "Right only")
						.setValue(this.values.cardSide)
						.onChange((value) => {
							this.values.cardSide = value as TimelineCardSide;
						})
				);
		}

		this.lineStyleSetting = new Setting(this.contentEl)
			.setName("Spine line style")
			.setDesc("Vertical layout only.")
			.addDropdown((dd) =>
				dd
					.addOption("solid", "Solid")
					.addOption("dashed", "Dashed")
					.addOption("dotted", "Dotted")
					.setValue(this.values.linestyle)
					.onChange((value) => {
						this.values.linestyle = value as TimelineLineStyle;
					})
			);
		this.refreshLineStyleVisibility();

		if (this.advanced.styleOverrides) {
			new Setting(this.contentEl).setName("Card radius").addDropdown((dd) =>
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

			new Setting(this.contentEl).setName("Marker size").addDropdown((dd) =>
				dd
					.addOption("small", "Small")
					.addOption("medium", "Medium")
					.addOption("large", "Large")
					.setValue(this.values.markerSize)
					.onChange((value) => {
						this.values.markerSize = value as TimelineMarkerSize;
					})
			);

			new Setting(this.contentEl).setName("Spine thickness").addDropdown((dd) =>
				dd
					.addOption("thin", "Thin")
					.addOption("medium", "Medium")
					.addOption("thick", "Thick")
					.setValue(this.values.spineThickness)
					.onChange((value) => {
						this.values.spineThickness = value as TimelineSpineThickness;
					})
			);

			new Setting(this.contentEl).setName("Shadow intensity").addDropdown((dd) =>
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
			new Setting(this.contentEl)
				.setName('End date field (default: "enddate")')
				.setDesc("Renders the event as a span instead of a point.")
				.addText((text) =>
					text.setValue(this.values.endDateField).onChange((value) => {
						this.values.endDateField = value;
					})
				);

			new Setting(this.contentEl)
				.setName('Title field (default: "title")')
				.addText((text) =>
					text.setValue(this.values.titleField).onChange((value) => {
						this.values.titleField = value;
					})
				);

			new Setting(this.contentEl)
				.setName('Group field (default: "group")')
				.addText((text) =>
					text.setValue(this.values.groupField).onChange((value) => {
						this.values.groupField = value;
					})
				);

			new Setting(this.contentEl)
				.setName('Color field (default: "color")')
				.addText((text) =>
					text.setValue(this.values.colorField).onChange((value) => {
						this.values.colorField = value;
					})
				);

			new Setting(this.contentEl)
				.setName('Kind field (default: "kind")')
				.setDesc('Horizontal layout only: "event", "period", or "marker".')
				.addText((text) =>
					text.setValue(this.values.kindField).onChange((value) => {
						this.values.kindField = value;
					})
				);

			new Setting(this.contentEl)
				.setName('Points-to field (default: "pointsto")')
				.setDesc("Horizontal layout only.")
				.addText((text) =>
					text.setValue(this.values.pointsToField).onChange((value) => {
						this.values.pointsToField = value;
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

	private refreshLineStyleVisibility(): void {
		const isVertical = this.values.layout === "vertical";
		this.lineStyleSetting.settingEl.toggle(isVertical);
		this.cardSideSetting?.settingEl.toggle(isVertical);
	}

	private async submit(): Promise<void> {
		try {
			await this.onSave({ ...this.values });
			this.close();
		} catch (err) {
			log.error("Failed to save code block configuration", {}, err);
			new Notice(err instanceof Error ? err.message : String(err));
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
