import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import {
	TimelineTableNotFoundError,
	TimelineTableParseError,
	locateMarkdownTable,
	queryTimelineEventsFromTable,
} from "./table-source";
import { TimelineFieldMapping } from "../types";

function fields(overrides: Partial<TimelineFieldMapping> = {}): TimelineFieldMapping {
	return { dateField: "date", ...overrides };
}

function makeApp(notePath: string, content: string | null): {
	vault: { getAbstractFileByPath: (p: string) => unknown; cachedRead: () => Promise<string> };
} {
	const file = new TFile();
	file.path = notePath;
	return {
		vault: {
			getAbstractFileByPath: (p: string) => (p === notePath && content !== null ? file : null),
			cachedRead: async () => content ?? "",
		},
	};
}

const TABLE_NOTE = "Timeline/Events.md";

describe("queryTimelineEventsFromTable", () => {
	it("throws TimelineTableNotFoundError when the note doesn't exist", async () => {
		const app = makeApp(TABLE_NOTE, null);
		await expect(
			queryTimelineEventsFromTable(app as never, TABLE_NOTE, fields())
		).rejects.toThrow(TimelineTableNotFoundError);
	});

	it("throws TimelineTableParseError when the note has no markdown table", async () => {
		const app = makeApp(TABLE_NOTE, "Just some prose, no table here.");
		await expect(
			queryTimelineEventsFromTable(app as never, TABLE_NOTE, fields())
		).rejects.toThrow(TimelineTableParseError);
	});

	it("parses a basic table into events", async () => {
		const content = [
			"| date | title |",
			"| --- | --- |",
			"| 2024-01-01 | Kickoff |",
			"| 2024-02-01 | Review |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title" })
		);
		expect(events).toHaveLength(2);
		expect(events[0].title).toBe("Kickoff");
		expect(events[0].date).toEqual({ year: 2024, month: 1, day: 1 });
		expect(events[1].title).toBe("Review");
	});

	it("matches column headers case-insensitively", async () => {
		const content = ["| Date | Title |", "| --- | --- |", "| 2024-01-01 | Kickoff |"].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title" })
		);
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe("Kickoff");
	});

	it("skips rows with no parseable date", async () => {
		const content = [
			"| date | title |",
			"| --- | --- |",
			"| not-a-date | Bad row |",
			"| 2024-01-01 | Good row |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title" })
		);
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe("Good row");
	});

	it("falls back to a generated title when no title field is configured", async () => {
		const content = ["| date |", "| --- |", "| 2024-01-01 |"].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(app as never, TABLE_NOTE, fields());
		expect(events[0].title).toBe("Event 1");
	});

	it("maps the kind field, defaulting to 'event' for unset/unrecognized values", async () => {
		const content = [
			"| date | kind |",
			"| --- | --- |",
			"| -3300 | period |",
			"| 79 | marker |",
			"| 2024-01-01 | bogus |",
			"| 2024-02-01 |  |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ kindField: "kind" })
		);
		expect(events.map((e) => e.kind)).toEqual(["period", "marker", "event", "event"]);
	});

	it("maps the color field, overriding any group-derived color", async () => {
		const content = [
			"| date | group | tint |",
			"| --- | --- | --- |",
			"| 2024-01-01 | Research | #ff8800 |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ groupField: "group", colorField: "tint" })
		);
		expect(events[0].color).toBe("#ff8800");
	});

	it("maps the points-to field", async () => {
		const content = [
			"| date | title | next |",
			"| --- | --- | --- |",
			"| 2024-01-01 | Kickoff | Review |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title", pointsToField: "next" })
		);
		expect(events[0].pointsTo).toBe("Review");
	});

	it("handles escaped pipes within cell content", async () => {
		const content = ["| date | title |", "| --- | --- |", String.raw`| 2024-01-01 | A \| B |`].join(
			"\n"
		);
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title" })
		);
		expect(events[0].title).toBe("A | B");
	});

	it("stops reading rows at the first blank line after the table", async () => {
		const content = [
			"| date | title |",
			"| --- | --- |",
			"| 2024-01-01 | In table |",
			"",
			"| 2024-03-01 | Not in table |",
		].join("\n");
		const app = makeApp(TABLE_NOTE, content);
		const events = await queryTimelineEventsFromTable(
			app as never,
			TABLE_NOTE,
			fields({ titleField: "title" })
		);
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe("In table");
	});
});

describe("locateMarkdownTable", () => {
	it("returns null when there's no table", () => {
		expect(locateMarkdownTable("Just some prose.")).toBeNull();
	});

	it("points at the delimiter row when the table has no data rows yet", () => {
		const content = ["| date | title |", "| --- | --- |"].join("\n");
		expect(locateMarkdownTable(content)).toEqual({
			headers: ["date", "title"],
			delimiterLineIndex: 1,
			lastLineIndex: 1,
		});
	});

	it("points at the last contiguous data row", () => {
		const content = [
			"| date | title |",
			"| --- | --- |",
			"| 2024-01-01 | First |",
			"| 2024-02-01 | Second |",
		].join("\n");
		expect(locateMarkdownTable(content)).toEqual({
			headers: ["date", "title"],
			delimiterLineIndex: 1,
			lastLineIndex: 3,
		});
	});
});
