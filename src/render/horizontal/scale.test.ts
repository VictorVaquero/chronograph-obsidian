import { describe, expect, it } from "vitest";
import { buildScale } from "./scale";
import { TimelineEvent } from "../../types";

function makeEvent(year: number, id = `e${year}`): TimelineEvent {
	return { id, title: "Title", date: { year }, sourcePath: "Note.md" };
}

describe("buildScale — compressedGaps", () => {
	it("marks no compressed gaps when events are close together", () => {
		const scale = buildScale([makeEvent(2024), makeEvent(2025), makeEvent(2026)]);
		expect(scale.compressedGaps).toEqual([]);
	});

	it("marks a gap as compressed once it reaches the saturation point", () => {
		const scale = buildScale([makeEvent(1000), makeEvent(3000)]);
		expect(scale.compressedGaps).toEqual([2000]);
	});

	it("marks each saturated gap independently across multiple events", () => {
		const scale = buildScale([makeEvent(0), makeEvent(1), makeEvent(3000), makeEvent(3001)]);
		expect(scale.compressedGaps).toEqual([1500.5]);
	});

	it("does not mark a gap just under the saturation threshold", () => {
		const scale = buildScale([makeEvent(2000), makeEvent(2015)]);
		expect(scale.compressedGaps).toEqual([]);
	});
});
