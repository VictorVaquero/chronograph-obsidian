import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { exportSnapshot } from "./export-snapshot";
import { TimelineEvent, TimelineViewConfig } from "./types";

function baseView(overrides: Partial<TimelineViewConfig> = {}): TimelineViewConfig {
	return {
		id: "v1",
		name: "Launches",
		sourceType: "table",
		dataviewQuery: "",
		tableNotePath: "",
		frontmatterTag: "",
		frontmatterFolder: "",
		fields: { dateField: "date" },
		sortOrder: "asc",
		layout: "vertical",
		datePrecision: "day",
		verticalCardSide: "alternate",
		verticalLineStyle: "solid",
		density: "comfortable",
		cardRadius: "medium",
		markerSize: "medium",
		spineThickness: "medium",
		shadowIntensity: "subtle",
		...overrides,
	};
}

function makeEvent(): TimelineEvent {
	return { id: "e1", title: "Launch", date: { year: 2024, month: 1, day: 1 }, sourcePath: "Launch.md" };
}

describe("exportSnapshot", () => {
	it("writes an SVG file named after the view", async () => {
		const created: { path: string; data: string }[] = [];
		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string, data: string) => {
					created.push({ path, data });
					return new TFile();
				},
			},
		};

		await exportSnapshot(app as never, baseView(), [makeEvent()]);

		expect(created).toHaveLength(1);
		expect(created[0].path).toBe("Launches snapshot.svg");
		expect(created[0].data).toContain("<svg");
	});

	it("de-duplicates the file name when a snapshot already exists", async () => {
		const existing = new TFile();
		existing.path = "Launches snapshot.svg";
		const created: { path: string }[] = [];
		const app = {
			vault: {
				getAbstractFileByPath: (p: string) => (p === "Launches snapshot.svg" ? existing : null),
				create: async (path: string) => {
					created.push({ path });
					return new TFile();
				},
			},
		};

		await exportSnapshot(app as never, baseView(), [makeEvent()]);

		expect(created[0].path).toBe("Launches snapshot 2.svg");
	});

	it("does nothing when there are no events to export", async () => {
		const created: { path: string }[] = [];
		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string) => {
					created.push({ path });
					return new TFile();
				},
			},
		};

		await exportSnapshot(app as never, baseView(), []);

		expect(created).toHaveLength(0);
	});
});
