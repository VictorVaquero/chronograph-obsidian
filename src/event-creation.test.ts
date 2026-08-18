import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { TimelineCreateEventError, createTimelineEvent } from "./event-creation";
import { TimelineViewConfig } from "./types";

function baseView(overrides: Partial<TimelineViewConfig> = {}): TimelineViewConfig {
	return {
		id: "v1",
		name: "Events",
		sourceType: "table",
		dataviewQuery: "",
		tableNotePath: "Timeline/Events.md",
		frontmatterTag: "",
		frontmatterFolder: "",
		fields: { dateField: "date", titleField: "title" },
		sortOrder: "asc",
		layout: "horizontal",
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

describe("createTimelineEvent — table source", () => {
	it("throws when no date field is configured", async () => {
		const app = { vault: {}, fileManager: {} };
		await expect(
			createTimelineEvent(app as never, baseView({ fields: { dateField: "" } }), "2024-01-01", "")
		).rejects.toThrow(TimelineCreateEventError);
	});

	it("throws when the table note doesn't exist", async () => {
		const app = { vault: { getAbstractFileByPath: () => null }, fileManager: {} };
		await expect(
			createTimelineEvent(app as never, baseView(), "2024-01-01", "")
		).rejects.toThrow(TimelineCreateEventError);
	});

	it("appends a row to the table note via vault.process", async () => {
		const file = Object.assign(new TFile(), { path: "Timeline/Events.md" });
		let content = ["| date | title |", "| --- | --- |", "| 2024-01-01 | First |"].join("\n");

		const app = {
			vault: {
				getAbstractFileByPath: (p: string) => (p === file.path ? file : null),
				process: async (f: TFile, fn: (data: string) => string) => {
					content = fn(content);
					return content;
				},
				cachedRead: async () => content,
			},
			fileManager: {},
		};

		await createTimelineEvent(app as never, baseView(), "2024-02-01", "Second");

		expect(content.split("\n")).toEqual([
			"| date | title |",
			"| --- | --- |",
			"| 2024-01-01 | First |",
			"| 2024-02-01 | Second |",
		]);
	});
});

describe("createTimelineEvent — dataview/frontmatter sources", () => {
	it("creates a new note at vault root for the dataview source", async () => {
		const created: { path: string; data: string }[] = [];
		const frontmatterCalls: Record<string, unknown>[] = [];
		const file = new TFile();

		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string, data: string) => {
					created.push({ path, data });
					file.path = path;
					return file;
				},
			},
			fileManager: {
				processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => {
					const fm: Record<string, unknown> = {};
					fn(fm);
					frontmatterCalls.push(fm);
				},
			},
		};

		await createTimelineEvent(app as never, baseView({ sourceType: "dataview" }), "2024-01-01", "Launch");

		expect(created).toHaveLength(1);
		expect(created[0].path).toBe("Launch.md");
		expect(frontmatterCalls[0]).toEqual({ date: "2024-01-01", title: "Launch" });
	});

	it("falls back to the date as the file name and skips the title field when title is empty", async () => {
		const created: { path: string }[] = [];
		const frontmatterCalls: Record<string, unknown>[] = [];
		const file = new TFile();

		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string) => {
					created.push({ path });
					file.path = path;
					return file;
				},
			},
			fileManager: {
				processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => {
					const fm: Record<string, unknown> = {};
					fn(fm);
					frontmatterCalls.push(fm);
				},
			},
		};

		await createTimelineEvent(app as never, baseView({ sourceType: "dataview" }), "2024-01-01", "");

		expect(created[0].path).toBe("2024-01-01.md");
		expect(frontmatterCalls[0]).toEqual({ date: "2024-01-01" });
	});

	it("creates a new note under frontmatterFolder for the frontmatter source", async () => {
		const created: { path: string }[] = [];
		const file = new TFile();

		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string) => {
					created.push({ path });
					file.path = path;
					return file;
				},
			},
			fileManager: {
				processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => fn({}),
			},
		};

		await createTimelineEvent(
			app as never,
			baseView({ sourceType: "frontmatter", frontmatterFolder: "Journal" }),
			"2024-01-01",
			"Entry"
		);

		expect(created[0].path).toBe("Journal/Entry.md");
	});

	it("de-duplicates the file name when a note already exists at that path", async () => {
		const existing = new TFile();
		existing.path = "Launch.md";
		const created: { path: string }[] = [];
		const file = new TFile();

		const app = {
			vault: {
				getAbstractFileByPath: (p: string) => (p === "Launch.md" ? existing : null),
				create: async (path: string) => {
					created.push({ path });
					file.path = path;
					return file;
				},
			},
			fileManager: {
				processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => fn({}),
			},
		};

		await createTimelineEvent(app as never, baseView({ sourceType: "dataview" }), "2024-01-01", "Launch");

		expect(created[0].path).toBe("Launch 2.md");
	});

	it("sanitizes characters not allowed in file names", async () => {
		const created: { path: string }[] = [];
		const file = new TFile();

		const app = {
			vault: {
				getAbstractFileByPath: () => null,
				create: async (path: string) => {
					created.push({ path });
					file.path = path;
					return file;
				},
			},
			fileManager: {
				processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => fn({}),
			},
		};

		await createTimelineEvent(app as never, baseView({ sourceType: "dataview" }), "2024-01-01", "A/B: C");

		expect(created[0].path).toBe("A-B- C.md");
	});
});
