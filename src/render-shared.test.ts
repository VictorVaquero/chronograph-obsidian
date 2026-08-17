import { describe, expect, it } from "vitest";
import { TimelineEvent } from "./types";
import { colorForGroup, groupsOf, renderEmptyState, renderErrorState } from "./render-shared";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: "id",
		title: "Title",
		date: { year: 2024 },
		sourcePath: "Note.md",
		...overrides,
	};
}

describe("colorForGroup", () => {
	it("is deterministic for the same group name", () => {
		expect(colorForGroup("Research")).toBe(colorForGroup("Research"));
	});

	it("gives different groups different colors (in general)", () => {
		expect(colorForGroup("Research")).not.toBe(colorForGroup("Meetings"));
	});

	it("returns an hsl() color string", () => {
		expect(colorForGroup("Research")).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
	});
});

describe("groupsOf", () => {
	it("returns unique group names in first-seen order", () => {
		const events = [
			makeEvent({ group: "A" }),
			makeEvent({ group: "B" }),
			makeEvent({ group: "A" }),
		];
		expect(groupsOf(events)).toEqual(["A", "B"]);
	});

	it("treats events without a group as the empty-string group", () => {
		const events = [makeEvent({ group: undefined }), makeEvent({ group: "A" })];
		expect(groupsOf(events)).toEqual(["", "A"]);
	});

	it("returns an empty array for no events", () => {
		expect(groupsOf([])).toEqual([]);
	});
});

describe("renderEmptyState", () => {
	it("replaces container contents with an empty-state message", () => {
		const container = createDiv();
		container.appendChild(createSpan());
		renderEmptyState(container, "Nothing here");
		expect(container.querySelector(".timeline-graph-empty")).not.toBeNull();
		expect(container.textContent).toBe("Nothing here");
	});
});

describe("renderErrorState", () => {
	it("replaces container contents with a prefixed error message", () => {
		const container = createDiv();
		renderErrorState(container, "Dataview is not installed");
		expect(container.querySelector(".timeline-graph-error")).not.toBeNull();
		expect(container.textContent).toBe("Chronograph error: Dataview is not installed");
	});
});
