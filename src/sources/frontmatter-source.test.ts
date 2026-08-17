import { describe, expect, it } from "vitest";
import { queryTimelineEventsFromFrontmatter } from "./frontmatter-source";
import { TFile } from "obsidian";
import { TimelineFieldMapping } from "../types";

interface MockNote {
	path: string;
	basename: string;
	frontmatter?: Record<string, unknown>;
	tags?: string[];
}

function makeApp(notes: MockNote[]): unknown {
	const files = notes.map((n) => {
		const file = new TFile();
		file.path = n.path;
		(file as unknown as { basename: string }).basename = n.basename;
		return file;
	});

	return {
		vault: {
			getMarkdownFiles: () => files,
		},
		metadataCache: {
			getFileCache: (file: TFile) => {
				const note = notes.find((n) => n.path === file.path);
				if (!note) return null;
				return {
					frontmatter: note.frontmatter,
					tags: (note.tags ?? []).map((tag) => ({ tag })),
				};
			},
		},
	};
}

function fields(overrides: Partial<TimelineFieldMapping> = {}): TimelineFieldMapping {
	return { dateField: "date", ...overrides };
}

describe("queryTimelineEventsFromFrontmatter", () => {
	it("maps notes with a valid date field into events", () => {
		const app = makeApp([{ path: "Journal/Entry.md", basename: "Entry", frontmatter: { date: "2024-06-15" } }]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "", fields());
		expect(events).toHaveLength(1);
		expect(events[0].date).toEqual({ year: 2024, month: 6, day: 15 });
		expect(events[0].sourcePath).toBe("Journal/Entry.md");
	});

	it("drops notes missing the configured date field", () => {
		const app = makeApp([
			{ path: "A.md", basename: "A", frontmatter: { date: "2024-06-15" } },
			{ path: "B.md", basename: "B", frontmatter: {} },
			{ path: "C.md", basename: "C" },
		]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "", fields());
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("A.md");
	});

	it("falls back to the note's basename when no title field is configured", () => {
		const app = makeApp([{ path: "Journal/Entry.md", basename: "Entry", frontmatter: { date: "2024-01-01" } }]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "", fields());
		expect(events[0].title).toBe("Entry");
	});

	it("uses the configured title field when present", () => {
		const app = makeApp([{ path: "A.md", basename: "A", frontmatter: { date: "2024-01-01", myTitle: "Custom" } }]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "", fields({ titleField: "myTitle" }));
		expect(events[0].title).toBe("Custom");
	});

	it("maps group/description/color/kind/points-to fields when configured", () => {
		const app = makeApp([
			{
				path: "A.md",
				basename: "A",
				frontmatter: {
					date: "2024-01-01",
					cat: "Research",
					notes: "Some notes",
					tint: "#ff8800",
					k: "marker",
					nextEvent: "Review",
				},
			},
		]);
		const events = queryTimelineEventsFromFrontmatter(
			app as never,
			"",
			"",
			fields({
				groupField: "cat",
				descriptionField: "notes",
				colorField: "tint",
				kindField: "k",
				pointsToField: "nextEvent",
			})
		);
		expect(events[0].group).toBe("Research");
		expect(events[0].description).toBe("Some notes");
		expect(events[0].color).toBe("#ff8800");
		expect(events[0].kind).toBe("marker");
		expect(events[0].pointsTo).toBe("Review");
	});

	it("defaults kind to 'event' for unset/unrecognized values", () => {
		const app = makeApp([
			{ path: "A.md", basename: "A", frontmatter: { date: "2024-01-01", k: "not-a-real-kind" } },
			{ path: "B.md", basename: "B", frontmatter: { date: "2024-02-01" } },
		]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "", fields({ kindField: "k" }));
		expect(events.map((e) => e.kind)).toEqual(["event", "event"]);
	});

	it("filters by tag when a tag is configured", () => {
		const app = makeApp([
			{ path: "A.md", basename: "A", frontmatter: { date: "2024-01-01" }, tags: ["#event"] },
			{ path: "B.md", basename: "B", frontmatter: { date: "2024-02-01" }, tags: ["#other"] },
		]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "event", "", fields());
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("A.md");
	});

	it("normalizes a tag filter without a leading #", () => {
		const app = makeApp([{ path: "A.md", basename: "A", frontmatter: { date: "2024-01-01" }, tags: ["#event"] }]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "event", "", fields());
		expect(events).toHaveLength(1);
	});

	it("filters by folder when a folder is configured", () => {
		const app = makeApp([
			{ path: "Journal/A.md", basename: "A", frontmatter: { date: "2024-01-01" } },
			{ path: "Other/B.md", basename: "B", frontmatter: { date: "2024-02-01" } },
		]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "", "Journal", fields());
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("Journal/A.md");
	});

	it("combines tag and folder filters", () => {
		const app = makeApp([
			{ path: "Journal/A.md", basename: "A", frontmatter: { date: "2024-01-01" }, tags: ["#event"] },
			{ path: "Journal/B.md", basename: "B", frontmatter: { date: "2024-02-01" }, tags: ["#other"] },
			{ path: "Other/C.md", basename: "C", frontmatter: { date: "2024-03-01" }, tags: ["#event"] },
		]);
		const events = queryTimelineEventsFromFrontmatter(app as never, "event", "Journal", fields());
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("Journal/A.md");
	});
});
