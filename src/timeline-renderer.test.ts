import { describe, expect, it } from "vitest";
import { TimelineEvent } from "./types";
import { renderTimeline } from "./timeline-renderer";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: "id",
		title: "Title",
		date: { year: 2024, month: 1, day: 1 },
		sourcePath: "Note.md",
		...overrides,
	};
}

describe("renderTimeline", () => {
	it("delegates to the vertical renderer by default", () => {
		const container = document.createElement("div");
		renderTimeline(container, [makeEvent()], "vertical");
		expect(container.querySelector(".timeline-graph-spine")).not.toBeNull();
	});

	it("delegates to the horizontal renderer when layout is 'horizontal'", () => {
		const container = document.createElement("div");
		renderTimeline(container, [makeEvent()], "horizontal");
		expect(container.querySelector(".timeline-graph-horizontal")).not.toBeNull();
	});

	it("clears previous contents before rendering", () => {
		const container = document.createElement("div");
		const stale = document.createElement("span");
		stale.className = "stale-marker";
		container.appendChild(stale);
		renderTimeline(container, [makeEvent()], "vertical");
		expect(container.querySelector(".stale-marker")).toBeNull();
	});

	it("renders the shared empty state when there are no events, for either layout", () => {
		const verticalContainer = document.createElement("div");
		renderTimeline(verticalContainer, [], "vertical");
		expect(verticalContainer.querySelector(".timeline-graph-empty")).not.toBeNull();

		const horizontalContainer = document.createElement("div");
		renderTimeline(horizontalContainer, [], "horizontal");
		expect(horizontalContainer.querySelector(".timeline-graph-empty")).not.toBeNull();
	});
});
