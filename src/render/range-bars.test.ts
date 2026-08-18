import { describe, expect, it } from "vitest";
import { renderRangeBars } from "./range-bars";
import { TimelineEvent } from "../types";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: overrides.id ?? "id",
		title: "Title",
		date: { year: 2024 },
		sourcePath: "Note.md",
		...overrides,
	};
}

function spineWithDots(events: TimelineEvent[], sideById: Record<string, "left" | "right"> = {}): HTMLElement {
	const spine = document.createElement("div");
	for (const event of events) {
		const dot = document.createElement("div");
		dot.className = "timeline-graph-node-dot";
		dot.dataset.timelineEventId = event.id;
		dot.dataset.timelineCardSide = sideById[event.id] ?? "right";
		spine.appendChild(dot);
	}
	return spine;
}

describe("renderRangeBars", () => {
	it("does nothing when no event has an endDate", () => {
		const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" })];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		expect(spine.querySelector(".timeline-graph-range-bars")).toBeNull();
	});

	it("draws a bar from a ranged event's dot to the last sibling within its endDate", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
			makeEvent({ id: "c", date: { year: 2020 } }),
		];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		expect(spine.querySelector(".timeline-graph-range-bars")).not.toBeNull();
		expect(spine.querySelectorAll(".timeline-graph-range-bar-line")).toHaveLength(1);
		expect(spine.querySelectorAll(".timeline-graph-range-bar-end")).toHaveLength(1);
	});

	it("skips a ranged event when no sibling falls within its endDate", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2001 } }),
			makeEvent({ id: "b", date: { year: 2020 } }),
		];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		expect(spine.querySelector(".timeline-graph-range-bars")).toBeNull();
	});

	it("skips when the event's own dot is missing from the DOM", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
		];
		const spine = document.createElement("div");
		const dot = document.createElement("div");
		dot.className = "timeline-graph-node-dot";
		dot.dataset.timelineEventId = "b";
		spine.appendChild(dot);

		renderRangeBars(spine, events);
		expect(spine.querySelector(".timeline-graph-range-bars")).toBeNull();
	});

	it("draws one bar per ranged event", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 }, endDate: { year: 2008 } }),
			makeEvent({ id: "c", date: { year: 2006 } }),
			makeEvent({ id: "d", date: { year: 2020 } }),
		];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		expect(spine.querySelectorAll(".timeline-graph-range-bar-line")).toHaveLength(2);
	});

	it("replaces the previous overlay instead of stacking a second one when called again", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
		];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		renderRangeBars(spine, events);
		expect(spine.querySelectorAll(".timeline-graph-range-bars")).toHaveLength(1);
		expect(spine.querySelectorAll(".timeline-graph-range-bar-line")).toHaveLength(1);
	});

	it("draws a start stub and offsets the bar toward the owning card's side", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
		];
		const spine = spineWithDots(events, { a: "left" });
		renderRangeBars(spine, events);

		const stub = spine.querySelector(".timeline-graph-range-bar-stub");
		expect(stub).not.toBeNull();
		const stubX1 = Number(stub!.getAttribute("x1"));
		const stubX2 = Number(stub!.getAttribute("x2"));
		// Offset goes toward the left side, i.e. the bar's x is less than the dot's x.
		expect(stubX2).toBeLessThan(stubX1);

		const line = spine.querySelector(".timeline-graph-range-bar-line");
		expect(line!.getAttribute("x1")).toBe(String(stubX2));
		expect(line!.getAttribute("x2")).toBe(String(stubX2));
	});

	it("offsets the bar toward the right when the owning card is on the right", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
		];
		const spine = spineWithDots(events, { a: "right" });
		renderRangeBars(spine, events);

		const stub = spine.querySelector(".timeline-graph-range-bar-stub");
		const stubX1 = Number(stub!.getAttribute("x1"));
		const stubX2 = Number(stub!.getAttribute("x2"));
		expect(stubX2).toBeGreaterThan(stubX1);
	});

	it("removes a stale overlay when re-rendered with no ranges left to draw", () => {
		const events = [
			makeEvent({ id: "a", date: { year: 2000 }, endDate: { year: 2010 } }),
			makeEvent({ id: "b", date: { year: 2005 } }),
		];
		const spine = spineWithDots(events);
		renderRangeBars(spine, events);
		expect(spine.querySelector(".timeline-graph-range-bars")).not.toBeNull();

		const withoutRanges = events.map((e) => ({ ...e, endDate: undefined }));
		renderRangeBars(spine, withoutRanges);
		expect(spine.querySelector(".timeline-graph-range-bars")).toBeNull();
	});
});
