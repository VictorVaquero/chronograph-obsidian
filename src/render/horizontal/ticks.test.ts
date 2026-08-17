import { describe, expect, it } from "vitest";
import { renderCompressionMarkers } from "./ticks";
import { buildScale } from "./scale";
import { TimelineEvent } from "../../types";

function makeEvent(year: number, id = `e${year}`): TimelineEvent {
	return { id, title: "Title", date: { year }, sourcePath: "Note.md" };
}

describe("renderCompressionMarkers", () => {
	it("renders no markers when no gap was compressed", () => {
		const scale = buildScale([makeEvent(2024), makeEvent(2025)]);
		const el = renderCompressionMarkers(scale);
		expect(el.querySelectorAll(".timeline-graph-compression-marker")).toHaveLength(0);
	});

	it("renders one marker per compressed gap, positioned at the gap midpoint", () => {
		const scale = buildScale([makeEvent(1000), makeEvent(3000)]);
		const el = renderCompressionMarkers(scale);
		const markers = el.querySelectorAll<HTMLElement>(".timeline-graph-compression-marker");
		expect(markers).toHaveLength(1);
		expect(markers[0].style.left).not.toBe("");
	});
});
