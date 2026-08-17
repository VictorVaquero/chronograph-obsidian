import { describe, expect, it } from "vitest";
import { defaultCodeBlockConfig, parseCodeBlock, TimelineCodeBlockParseError } from "./code-block-source";

describe("parseCodeBlock", () => {
	it("parses a table-only block using default field names", () => {
		const source = `| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { config, events } = parseCodeBlock(source, "Note.md");
		expect(config).toEqual(defaultCodeBlockConfig());
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe("Launch");
		expect(events[0].date).toEqual({ year: 2024, month: 1, day: 1 });
		expect(events[0].sourcePath).toBe("Note.md");
	});

	it("parses a settings header separated by a lone --- line", () => {
		const source = `layout: horizontal
precision: year
sort: desc
---
| date | title |
| --- | --- |
| 2024 | Launch |`;
		const { config, events } = parseCodeBlock(source, "Note.md");
		expect(config.layout).toBe("horizontal");
		expect(config.precision).toBe("year");
		expect(config.sortOrder).toBe("desc");
		expect(events).toHaveLength(1);
	});

	it("does not confuse the table's own delimiter row with the header/body divider", () => {
		const source = `| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { events } = parseCodeBlock(source, "Note.md");
		expect(events).toHaveLength(1);
	});

	it("ignores unrecognized settings keys and invalid values", () => {
		const source = `layout: sideways
bogus: whatever
---
| date | title |
| --- | --- |
| 2024-01-01 | Launch |`;
		const { config } = parseCodeBlock(source, "Note.md");
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
		const { events } = parseCodeBlock(source, "Note.md");
		expect(events[0].title).toBe("Launch");
		expect(events[0].group).toBe("Product");
	});

	it("throws TimelineCodeBlockParseError when no table is present", () => {
		expect(() => parseCodeBlock("layout: horizontal", "Note.md")).toThrow(
			TimelineCodeBlockParseError
		);
	});
});
