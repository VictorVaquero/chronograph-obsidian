import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineEvent } from "../../types";
import { renderHorizontalTimeline } from "./index";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: overrides.id ?? "id",
		title: "Title",
		date: { year: 2024, month: 1, day: 1 },
		sourcePath: "Note.md",
		...overrides,
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(Date.UTC(2024, 5, 15)));
});

afterEach(() => {
	vi.useRealTimers();
});

describe("renderHorizontalTimeline", () => {
	it("renders the empty state when there are no events", () => {
		const container = document.createElement("div");
		renderHorizontalTimeline(container, [], {});
		expect(container.querySelector(".timeline-graph-empty")).not.toBeNull();
	});

	it("renders a toolbar with zoom-out, zoom-in, and fit buttons", () => {
		const container = document.createElement("div");
		renderHorizontalTimeline(container, [makeEvent()], {});
		expect(container.querySelector(".timeline-graph-zoom-btn")).not.toBeNull();
		expect(container.querySelectorAll(".timeline-graph-zoom-btn")).toHaveLength(2);
		expect(container.querySelector(".timeline-graph-fit-btn")).not.toBeNull();
	});

	it("renders the new-event and export buttons only when their callbacks are provided", () => {
		const container = document.createElement("div");
		renderHorizontalTimeline(container, [makeEvent()], {});
		expect(container.querySelector(".timeline-graph-new-event-btn")).toBeNull();
		expect(container.querySelector(".timeline-graph-export-btn")).toBeNull();

		const withCallbacks = document.createElement("div");
		renderHorizontalTimeline(withCallbacks, [makeEvent()], { onCreateEvent: vi.fn(), onExportSnapshot: vi.fn() });
		expect(withCallbacks.querySelector(".timeline-graph-new-event-btn")).not.toBeNull();
		expect(withCallbacks.querySelector(".timeline-graph-export-btn")).not.toBeNull();
	});

	it("invokes onExportSnapshot when the export button is clicked", () => {
		const container = document.createElement("div");
		const onExportSnapshot = vi.fn();
		renderHorizontalTimeline(container, [makeEvent()], { onExportSnapshot });
		container.querySelector<HTMLButtonElement>(".timeline-graph-export-btn")?.click();
		expect(onExportSnapshot).toHaveBeenCalledOnce();
	});

	it("renders one lane per distinct group among plain 'event' kind events", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "a", kind: "event", group: "Research" }),
			makeEvent({ id: "b", kind: "event", group: "Ops" }),
			makeEvent({ id: "c", kind: "event", group: "Research" }),
		];
		renderHorizontalTimeline(container, events, {});
		const lanes = container.querySelectorAll(".timeline-graph-lane");
		expect(lanes).toHaveLength(2);
		expect(container.querySelector(".timeline-graph-lane.is-even")).not.toBeNull();
		expect(container.querySelector(".timeline-graph-lane.is-odd")).not.toBeNull();
	});

	it("labels an ungrouped lane as 'Ungrouped'", () => {
		const container = document.createElement("div");
		renderHorizontalTimeline(container, [makeEvent({ kind: "event" })], {});
		expect(container.querySelector(".timeline-graph-lane-label")?.textContent).toBe("Ungrouped");
	});

	it("renders a point marker for a plain event and a range marker when endDate is set", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "point", kind: "event", date: { year: 2024, month: 1, day: 1 } }),
			makeEvent({
				id: "range",
				kind: "event",
				date: { year: 2020 },
				endDate: { year: 2023 },
			}),
		];
		renderHorizontalTimeline(container, events, {});
		expect(container.querySelector(".timeline-graph-marker-point")).not.toBeNull();
		expect(container.querySelector(".timeline-graph-marker-range")).not.toBeNull();
	});

	it("invokes onEventClick when a lane marker is clicked", () => {
		const container = document.createElement("div");
		const event = makeEvent({ kind: "event" });
		const onEventClick = vi.fn();
		renderHorizontalTimeline(container, [event], { onEventClick });
		const marker = container.querySelector<HTMLButtonElement>(".timeline-graph-marker");
		marker?.click();
		expect(onEventClick).toHaveBeenCalledWith(event);
	});

	it("renders a period band for 'period' kind events, separate from lanes", () => {
		const container = document.createElement("div");
		const period = makeEvent({
			id: "era",
			kind: "period",
			title: "Bronze Age",
			date: { year: 1900 },
			endDate: { year: 2000 },
		});
		renderHorizontalTimeline(container, [period], {});
		expect(container.querySelector(".timeline-graph-lane")).toBeNull();
		const band = container.querySelector<HTMLButtonElement>(".timeline-graph-period-band");
		expect(band?.textContent).toBe("Bronze Age");
	});

	it("invokes onEventClick when a period band is clicked", () => {
		const container = document.createElement("div");
		const period = makeEvent({ kind: "period", date: { year: 1900 }, endDate: { year: 2000 } });
		const onEventClick = vi.fn();
		renderHorizontalTimeline(container, [period], { onEventClick });
		container.querySelector<HTMLButtonElement>(".timeline-graph-period-band")?.click();
		expect(onEventClick).toHaveBeenCalledWith(period);
	});

	it("renders a flag marker for 'marker' kind events, separate from lanes and bands", () => {
		const container = document.createElement("div");
		const marker = makeEvent({ kind: "marker", title: "Launch day" });
		renderHorizontalTimeline(container, [marker], {});
		const flag = container.querySelector<HTMLButtonElement>(".timeline-graph-flag-marker");
		expect(flag).not.toBeNull();
		expect(flag?.textContent).toBe("Launch day");
	});

	it("invokes onEventClick when a flag marker is clicked", () => {
		const container = document.createElement("div");
		const marker = makeEvent({ kind: "marker" });
		const onEventClick = vi.fn();
		renderHorizontalTimeline(container, [marker], { onEventClick });
		container.querySelector<HTMLButtonElement>(".timeline-graph-flag-marker")?.click();
		expect(onEventClick).toHaveBeenCalledWith(marker);
	});

	it("renders axis ticks with labels", () => {
		const container = document.createElement("div");
		const events = [makeEvent({ id: "a", date: { year: 1900 } }), makeEvent({ id: "b", date: { year: 2100 } })];
		renderHorizontalTimeline(container, events, {}, "year");
		const ticks = container.querySelectorAll(".timeline-graph-axis-tick");
		expect(ticks.length).toBeGreaterThan(0);
		ticks.forEach((t) => expect(t.textContent).not.toBe(""));
	});

	it("renders a today line when today falls within the event date range", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "a", date: { year: 2020 } }),
			makeEvent({ id: "b", date: { year: 2030 } }),
		];
		renderHorizontalTimeline(container, events, {});
		expect(container.querySelector(".timeline-graph-today-line")).not.toBeNull();
	});

	it("omits the today line when today falls outside the event date range", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "a", date: { year: 1900 } }),
			makeEvent({ id: "b", date: { year: 1950 } }),
		];
		renderHorizontalTimeline(container, events, {});
		expect(container.querySelector(".timeline-graph-today-line")).toBeNull();
	});
});
