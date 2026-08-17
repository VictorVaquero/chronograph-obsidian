import { App, Modal, Notice, Setting } from "obsidian";
import { TimelineViewConfig } from "./types";
import { createTimelineEvent } from "./event-creation";

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export class TimelineCreateEventModal extends Modal {
	private date = todayIso();
	private title = "";

	constructor(
		app: App,
		private config: TimelineViewConfig,
		private onCreated: () => void
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(`New event — ${this.config.name}`);

		new Setting(this.contentEl).setName("Date").addText((text) =>
			text.setValue(this.date).onChange((value) => {
				this.date = value;
			})
		);

		new Setting(this.contentEl).setName("Title").setDesc("Optional, falls back to the date").addText((text) =>
			text.setValue(this.title).onChange((value) => {
				this.title = value;
			})
		);

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Create")
				.setCta()
				.onClick(() => void this.submit())
		);
	}

	private async submit(): Promise<void> {
		if (!this.date.trim()) {
			new Notice("Enter a date before creating the event.");
			return;
		}

		try {
			await createTimelineEvent(this.app, this.config, this.date.trim(), this.title.trim());
			this.close();
			this.onCreated();
		} catch (err) {
			new Notice(err instanceof Error ? err.message : String(err));
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
