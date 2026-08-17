import { describe, expect, it } from "vitest";
import { exportTimelineSvg } from "./svg-export";
import { TimelineEvent } from "../types";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: "e1",
		title: "Launch",
		date: { year: 2024, month: 1, day: 1 },
		sourcePath: "Launch.md",
		...overrides,
	};
}

describe("exportTimelineSvg", () => {
	it("produces a self-contained SVG with one row per event", () => {
		const svg = exportTimelineSvg(
			[makeEvent({ id: "a", title: "First" }), makeEvent({ id: "b", title: "Second", date: { year: 2025 } })],
			"day",
			"asc"
		);
		expect(svg).toContain("<svg");
		expect(svg).toContain("First");
		expect(svg).toContain("Second");
		expect((svg.match(/<circle/g) ?? []).length).toBe(2);
	});

	it("sorts events per the given sort order", () => {
		const svg = exportTimelineSvg(
			[makeEvent({ id: "a", title: "Later", date: { year: 2025 } }), makeEvent({ id: "b", title: "Earlier", date: { year: 2024 } })],
			"day",
			"asc"
		);
		expect(svg.indexOf("Earlier")).toBeLessThan(svg.indexOf("Later"));
	});

	it("includes a title header when given", () => {
		const svg = exportTimelineSvg([makeEvent()], "day", "asc", "My timeline");
		expect(svg).toContain("My timeline");
	});

	it("omits a header when no title is given", () => {
		const withTitle = exportTimelineSvg([makeEvent()], "day", "asc", "Header");
		const withoutTitle = exportTimelineSvg([makeEvent()], "day", "asc");
		const heightOf = (svg: string) => Number(/height="(\d+)"/.exec(svg)?.[1]);
		expect(heightOf(withoutTitle)).toBeLessThan(heightOf(withTitle));
	});

	it("escapes XML special characters in titles", () => {
		const svg = exportTimelineSvg([makeEvent({ title: "A & B <C>" })], "day", "asc");
		expect(svg).toContain("A &amp; B &lt;C&gt;");
		expect(svg).not.toContain("A & B <C>");
	});

	it("truncates very long titles", () => {
		const longTitle = "x".repeat(200);
		const svg = exportTimelineSvg([makeEvent({ title: longTitle })], "day", "asc");
		expect(svg).toContain("…");
		expect(svg).not.toContain(longTitle);
	});

	it("produces valid, parseable XML", () => {
		const svg = exportTimelineSvg(
			[makeEvent({ id: "a" }), makeEvent({ id: "b", title: "Two", group: "G" })],
			"year",
			"desc",
			"Title & more"
		);
		const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
		expect(doc.querySelector("parsererror")).toBeNull();
	});
});
