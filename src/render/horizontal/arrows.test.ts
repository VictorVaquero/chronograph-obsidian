import { describe, expect, it } from "vitest";
import { renderArrows } from "./arrows";
import { TimelineEvent } from "../../types";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: overrides.id ?? "id",
		title: "Title",
		date: { year: 2024 },
		sourcePath: "Note.md",
		...overrides,
	};
}

function trackWithMarkers(events: TimelineEvent[]): HTMLElement {
	const track = document.createElement("div");
	for (const event of events) {
		const el = document.createElement("button");
		el.dataset.timelineEventId = event.id;
		track.appendChild(el);
	}
	return track;
}

describe("renderArrows", () => {
	it("does nothing when no event has pointsTo", () => {
		const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" })];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).toBeNull();
	});

	it("draws an arrow between events matched by title, case-insensitively", () => {
		const events = [
			makeEvent({ id: "a", title: "Kickoff", pointsTo: "review" }),
			makeEvent({ id: "b", title: "Review" }),
		];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).not.toBeNull();
		expect(track.querySelectorAll(".timeline-graph-arrow-line")).toHaveLength(1);
	});

	it("skips a pointsTo that doesn't match any event title", () => {
		const events = [makeEvent({ id: "a", pointsTo: "Nonexistent" })];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).toBeNull();
	});

	it("skips a self-referencing pointsTo", () => {
		const events = [makeEvent({ id: "a", title: "Solo", pointsTo: "Solo" })];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).toBeNull();
	});

	it("skips when the target event's marker element is missing from the DOM", () => {
		const events = [
			makeEvent({ id: "a", pointsTo: "Missing" }),
			makeEvent({ id: "b", title: "Missing" }),
		];
		const track = document.createElement("div");
		const el = document.createElement("button");
		el.dataset.timelineEventId = "a";
		track.appendChild(el);

		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).toBeNull();
	});

	it("draws one arrow per resolved pointsTo, ignoring unresolved ones", () => {
		const events = [
			makeEvent({ id: "a", title: "A", pointsTo: "C" }),
			makeEvent({ id: "b", title: "B", pointsTo: "Nope" }),
			makeEvent({ id: "c", title: "C" }),
		];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelectorAll(".timeline-graph-arrow-line")).toHaveLength(1);
	});

	it("replaces the previous overlay instead of stacking a second one when called again", () => {
		const events = [
			makeEvent({ id: "a", title: "Kickoff", pointsTo: "review" }),
			makeEvent({ id: "b", title: "Review" }),
		];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		renderArrows(track, events);
		expect(track.querySelectorAll(".timeline-graph-arrows")).toHaveLength(1);
		expect(track.querySelectorAll(".timeline-graph-arrow-line")).toHaveLength(1);
	});

	it("removes a stale overlay when re-rendered with no pointsTo left to draw", () => {
		const events = [
			makeEvent({ id: "a", title: "Kickoff", pointsTo: "review" }),
			makeEvent({ id: "b", title: "Review" }),
		];
		const track = trackWithMarkers(events);
		renderArrows(track, events);
		expect(track.querySelector(".timeline-graph-arrows")).not.toBeNull();

		const withoutTargets = events.map((e) => ({ ...e, pointsTo: undefined }));
		renderArrows(track, withoutTargets);
		expect(track.querySelector(".timeline-graph-arrows")).toBeNull();
	});
});
