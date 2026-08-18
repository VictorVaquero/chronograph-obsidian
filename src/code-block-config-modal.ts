import { App, Modal, Notice, Setting } from "obsidian";
import { TimelineDatePrecision, TimelineDensity, TimelineLayout, TimelineLineStyle } from "./types";
import { log } from "./log";

export interface CodeBlockConfigModalValues {
	layout: TimelineLayout;
	precision: TimelineDatePrecision;
	density: TimelineDensity;
	linestyle: TimelineLineStyle;
	height: number | "fill";
}

export class CodeBlockConfigModal extends Modal {
	private values: CodeBlockConfigModalValues;
	private lineStyleSetting!: Setting;

	constructor(
		app: App,
		initial: CodeBlockConfigModalValues,
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

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Save")
				.setCta()
				.onClick(() => void this.submit())
		);
	}

	private refreshLineStyleVisibility(): void {
		this.lineStyleSetting.settingEl.toggle(this.values.layout === "vertical");
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
