import { describe, expect, it } from "vitest";
import { DataviewUnavailableError, getDataviewApi, isDataviewEnabled, queryTimelineEvents } from "./dataview-source";
import { DataviewApi, DataviewPage, DataviewQueryResult } from "./dataview-api";
import { TimelineFieldMapping } from "./types";

function makeApp(api: DataviewApi | null): unknown {
	return {
		plugins: {
			plugins: api ? { dataview: { api } } : {},
		},
	};
}

function makePage(overrides: Partial<DataviewPage> & Record<string, unknown> = {}): DataviewPage {
	return {
		file: { path: "Journal/Entry.md", name: "Entry", link: undefined },
		...overrides,
	};
}

function makeApi(result: DataviewQueryResult): DataviewApi {
	return {
		query: async () => result,
		pages: () => [],
	};
}

function fields(overrides: Partial<TimelineFieldMapping> = {}): TimelineFieldMapping {
	return { dateField: "date", ...overrides };
}

describe("getDataviewApi / isDataviewEnabled", () => {
	it("returns null / false when the dataview plugin isn't present", () => {
		const app = makeApp(null);
		expect(getDataviewApi(app as never)).toBeNull();
		expect(isDataviewEnabled(app as never)).toBe(false);
	});

	it("returns the api / true when the dataview plugin is present", () => {
		const api = makeApi({ successful: true, value: { type: "table", values: [] } });
		const app = makeApp(api);
		expect(getDataviewApi(app as never)).toBe(api);
		expect(isDataviewEnabled(app as never)).toBe(true);
	});
});

describe("queryTimelineEvents", () => {
	it("throws DataviewUnavailableError when dataview isn't installed", async () => {
		const app = makeApp(null);
		await expect(queryTimelineEvents(app as never, "FROM \"\"", fields())).rejects.toThrow(
			DataviewUnavailableError
		);
	});

	it("throws when the dataview query itself fails", async () => {
		const api = makeApi({ successful: false, error: "bad query" });
		const app = makeApp(api);
		await expect(queryTimelineEvents(app as never, "bogus", fields())).rejects.toThrow(
			"Dataview query failed: bad query"
		);
	});

	it("maps pages with a valid date field into events", async () => {
		const page = makePage({ date: "2024-06-15" });
		const api = makeApi({ successful: true, value: { type: "table", values: [page] } });
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields());
		expect(events).toHaveLength(1);
		expect(events[0].date).toEqual({ year: 2024, month: 6, day: 15 });
		expect(events[0].sourcePath).toBe("Journal/Entry.md");
	});

	it("drops pages missing the configured date field", async () => {
		const withDate = makePage({ date: "2024-06-15" });
		const withoutDate = makePage({ file: { path: "Other.md", name: "Other", link: undefined } });
		const api = makeApi({
			successful: true,
			value: { type: "table", values: [withDate, withoutDate] },
		});
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields());
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("Journal/Entry.md");
	});

	it("falls back to the note's file name when no title field is configured", async () => {
		const page = makePage({ date: "2024-01-01" });
		const api = makeApi({ successful: true, value: { type: "table", values: [page] } });
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields());
		expect(events[0].title).toBe("Entry");
	});

	it("uses the configured title field when present", async () => {
		const page = makePage({ date: "2024-01-01", myTitle: "Custom Title" });
		const api = makeApi({ successful: true, value: { type: "table", values: [page] } });
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields({ titleField: "myTitle" }));
		expect(events[0].title).toBe("Custom Title");
	});

	it("maps group/description fields when configured", async () => {
		const page = makePage({ date: "2024-01-01", cat: "Research", notes: "Some notes" });
		const api = makeApi({ successful: true, value: { type: "table", values: [page] } });
		const app = makeApp(api);
		const events = await queryTimelineEvents(
			app as never,
			"",
			fields({ groupField: "cat", descriptionField: "notes" })
		);
		expect(events[0].group).toBe("Research");
		expect(events[0].description).toBe("Some notes");
	});

	it("maps the kind field, defaulting to 'event' for unset/unrecognized values", async () => {
		const period = makePage({
			file: { path: "P.md", name: "P", link: undefined },
			date: "-3300",
			k: "period",
		});
		const marker = makePage({
			file: { path: "M.md", name: "M", link: undefined },
			date: "79",
			k: "marker",
		});
		const bogus = makePage({
			file: { path: "B.md", name: "B", link: undefined },
			date: "2024-01-01",
			k: "not-a-real-kind",
		});
		const unset = makePage({ file: { path: "U.md", name: "U", link: undefined }, date: "2024-02-01" });
		const api = makeApi({
			successful: true,
			value: { type: "table", values: [period, marker, bogus, unset] },
		});
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields({ kindField: "k" }));
		expect(events.map((e) => e.kind)).toEqual(["period", "marker", "event", "event"]);
	});

	it("resolves a Dataview DateTime-like value via toMillis()", async () => {
		const luxonLike = { toMillis: () => Date.UTC(2024, 5, 15) };
		const page = makePage({ date: luxonLike });
		const api = makeApi({ successful: true, value: { type: "table", values: [page] } });
		const app = makeApp(api);
		const events = await queryTimelineEvents(app as never, "", fields());
		expect(events[0].date.year).toBe(2024);
	});
});
