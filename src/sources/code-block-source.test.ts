import { describe, expect, it } from "vitest";
import { parseTimelineEventsFromTableContent } from "./table-source";
import { defaultCodeBlockConfig, parseCodeBlockConfig, upsertSettingLines } from "./code-block-source";

describe("parseCodeBlockConfig", () => {
	it("parses a table-only block using default field names", () => {
		const source = `| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { config, body } = parseCodeBlockConfig(source);
		expect(config).toEqual(defaultCodeBlockConfig());
		const events = parseTimelineEventsFromTableContent(body, "Note.md", config.fields);
		expect(events).toHaveLength(1);
		expect(events?.[0].title).toBe("Launch");
		expect(events?.[0].date).toEqual({ year: 2024, month: 1, day: 1 });
		expect(events?.[0].sourcePath).toBe("Note.md");
	});

	it("parses a settings header separated by a lone --- line", () => {
		const source = `layout: horizontal
precision: year
sort: desc
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const { config, body } = parseCodeBlockConfig(source);
		expect(config.layout).toBe("horizontal");
		expect(config.precision).toBe("year");
		expect(config.sortOrder).toBe("desc");
		expect(parseTimelineEventsFromTableContent(body, "Note.md", config.fields)).toHaveLength(1);
	});

	it("does not confuse the table's own delimiter row with the header/body divider", () => {
		const source = `| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { config, body } = parseCodeBlockConfig(source);
		expect(parseTimelineEventsFromTableContent(body, "Note.md", config.fields)).toHaveLength(1);
	});

	it("ignores unrecognized settings keys and invalid values", () => {
		const source = `layout: sideways
bogus: whatever
---
| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.layout).toBe("vertical");
	});

	it("applies custom field-name overrides from the settings header", () => {
		const source = `datefield: when
titlefield: what
groupfield: cat
---
| when | what | cat |
| --- | --- | --- |
| 2024-01-01 | Launch | Product |`;
		const { config, body } = parseCodeBlockConfig(source);
		const events = parseTimelineEventsFromTableContent(body, "Note.md", config.fields);
		expect(events?.[0].title).toBe("Launch");
		expect(events?.[0].group).toBe("Product");
	});

	it("returns no events when no table is present in the default table source", () => {
		const { config, body } = parseCodeBlockConfig("layout: horizontal");
		expect(config.sourceType).toBe("table");
		expect(parseTimelineEventsFromTableContent(body, "Note.md", config.fields)).toBeNull();
	});

	it("parses a dataview source header", () => {
		const source = `source: dataview
query: from "Journal" where date
---`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.sourceType).toBe("dataview");
		expect(config.dataviewQuery).toBe('from "Journal" where date');
	});

	it("parses a dataview source header with no --- divider, since dataview blocks take no body", () => {
		const source = `source: dataview
query: from "Journal" where date
titlefield: aliases`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.sourceType).toBe("dataview");
		expect(config.dataviewQuery).toBe('from "Journal" where date');
		expect(config.fields.titleField).toBe("aliases");
	});

	it("parses a frontmatter source header with tag/folder filters", () => {
		const source = `source: frontmatter
tag: event
folder: Journal
---`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.sourceType).toBe("frontmatter");
		expect(config.frontmatterTag).toBe("event");
		expect(config.frontmatterFolder).toBe("Journal");
	});

	it("parses a tasks source header", () => {
		const source = `source: tasks
tag: event
---`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.sourceType).toBe("tasks");
		expect(config.frontmatterTag).toBe("event");
	});

	it("parses style preset overrides from the settings header", () => {
		const source = `density: compact
cardradius: large
markersize: small
spinethickness: thick
shadowintensity: none
---`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.density).toBe("compact");
		expect(config.cardRadius).toBe("large");
		expect(config.markerSize).toBe("small");
		expect(config.spineThickness).toBe("thick");
		expect(config.shadowIntensity).toBe("none");
	});

	it("parses a table source header with an explicit path", () => {
		const source = `source: table
path: Timeline/Events.md
---`;
		const { config } = parseCodeBlockConfig(source);
		expect(config.sourceType).toBe("table");
		expect(config.tableNotePath).toBe("Timeline/Events.md");
	});
});

describe("upsertSettingLines", () => {
	it("replaces an existing key's value, leaving the rest of the header and body untouched", () => {
		const source = `layout: horizontal
precision: year
sort: desc
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { layout: "vertical" });
		expect(result).toBe(`layout: vertical
precision: year
sort: desc
---
| date | title |
| --- | --- |
| 2024 | Launch |`);
	});

	it("appends a new key when the header exists but lacks it, before the divider", () => {
		const source = `layout: horizontal
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { density: "compact" });
		expect(result).toBe(`layout: horizontal
density: compact
---
| date | title |
| --- | --- |
| 2024 | Launch |`);
	});

	it("inserts a new header and divider before a bare inline table with no header", () => {
		const source = `| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { layout: "horizontal" });
		expect(result).toBe(`layout: horizontal
---
| date | title |
| --- | --- |
| 2024 | Launch |`);
	});

	it("rewrites a no-divider dataview-style header in place without introducing a divider", () => {
		const source = `source: dataview
query: from "Journal" where date
titlefield: aliases`;
		const result = upsertSettingLines(source, { precision: "century" });
		expect(result).toBe(`source: dataview
query: from "Journal" where date
titlefield: aliases
precision: century`);
	});

	it("applies multiple changes in one call, mixing replace and append", () => {
		const source = `layout: horizontal
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { layout: "vertical", density: "compact" });
		expect(result).toBe(`layout: vertical
density: compact
---
| date | title |
| --- | --- |
| 2024 | Launch |`);
	});

	it("preserves an unrecognized header line untouched", () => {
		const source = `layout: horizontal
bogus: whatever
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { layout: "vertical" });
		expect(result).toContain("bogus: whatever");
	});

	it("matches keys case-insensitively while preserving the original line's casing", () => {
		const source = `LAYOUT: vertical
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const result = upsertSettingLines(source, { layout: "horizontal" });
		expect(result).toContain("LAYOUT: horizontal");
	});

	it("round-trips through parseCodeBlockConfig: the edit sticks and nothing else drifts", () => {
		const source = `layout: horizontal
precision: year
density: spacious
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const before = parseCodeBlockConfig(source).config;
		const after = parseCodeBlockConfig(upsertSettingLines(source, { layout: "vertical" })).config;
		expect(after.layout).toBe("vertical");
		expect(after.precision).toBe(before.precision);
		expect(after.density).toBe(before.density);
	});
});
