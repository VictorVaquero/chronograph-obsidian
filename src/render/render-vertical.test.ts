import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineEvent } from "../types";
import { renderVerticalTimeline } from "./render-vertical";

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

describe("renderVerticalTimeline", () => {
	it("renders the empty state when there are no events", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(container, [], {});
		expect(container.querySelector(".timeline-graph-empty")).not.toBeNull();
	});

	it("renders one node per event with alternating left/right sides by default", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "a", date: { year: 2024, month: 1, day: 1 } }),
			makeEvent({ id: "b", date: { year: 2024, month: 2, day: 1 } }),
			makeEvent({ id: "c", date: { year: 2024, month: 3, day: 1 } }),
		];
		renderVerticalTimeline(container, events, {});
		const nodes = container.querySelectorAll(".timeline-graph-node");
		expect(nodes).toHaveLength(3);
		expect(nodes[0].classList.contains("is-left")).toBe(true);
		expect(nodes[1].classList.contains("is-right")).toBe(true);
		expect(nodes[2].classList.contains("is-left")).toBe(true);
	});

	it("puts every card on the same side when cardSide is 'left' or 'right'", () => {
		const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" })];

		const leftContainer = document.createElement("div");
		renderVerticalTimeline(leftContainer, events, {}, "day", "left");
		leftContainer
			.querySelectorAll(".timeline-graph-node")
			.forEach((n) => expect(n.classList.contains("is-left")).toBe(true));

		const rightContainer = document.createElement("div");
		renderVerticalTimeline(rightContainer, events, {}, "day", "right");
		rightContainer
			.querySelectorAll(".timeline-graph-node")
			.forEach((n) => expect(n.classList.contains("is-right")).toBe(true));
	});

	it("applies the configured spine line style class", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(container, [makeEvent()], {}, "day", "alternate", "dashed");
		expect(container.querySelector(".timeline-graph-spine-line-dashed")).not.toBeNull();
	});

	it("renders a card title link that triggers onEventClick", () => {
		const container = document.createElement("div");
		const event = makeEvent({ title: "Kickoff" });
		const onEventClick = vi.fn();
		renderVerticalTimeline(container, [event], { onEventClick });

		const link = container.querySelector<HTMLAnchorElement>(".timeline-graph-card-title");
		expect(link?.textContent).toBe("Kickoff");
		link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onEventClick).toHaveBeenCalledWith(event);
	});

	it("renders a group badge only when the event has a group", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(
			container,
			[makeEvent({ id: "a", group: "Research" }), makeEvent({ id: "b" })],
			{}
		);
		const badges = container.querySelectorAll(".timeline-graph-card-badge");
		expect(badges).toHaveLength(1);
		expect(badges[0].textContent).toBe("Research");
	});

	it("renders a description paragraph only when the event has a description", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(container, [makeEvent({ description: "Some notes" })], {});
		expect(container.querySelector(".timeline-graph-card-desc")?.textContent).toBe("Some notes");
	});

	it("inserts a 'today' marker between past and future events", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "past", title: "Past event", date: { year: 2024, month: 1, day: 1 } }),
			makeEvent({ id: "future", title: "Future event", date: { year: 2024, month: 12, day: 1 } }),
		];
		renderVerticalTimeline(container, events, {});
		const children = Array.from(container.querySelector(".timeline-graph-spine")!.children);
		const todayIndex = children.findIndex((c) => c.classList.contains("timeline-graph-today"));
		const pastIndex = children.findIndex((c) => c.textContent?.includes("Past event"));
		const futureIndex = children.findIndex((c) => c.textContent?.includes("Future event"));
		expect(todayIndex).toBeGreaterThan(pastIndex);
		expect(todayIndex).toBeLessThan(futureIndex);
	});

	it("inserts a period divider when consecutive events cross a bucket boundary", () => {
		const container = document.createElement("div");
		const events = [
			makeEvent({ id: "a", date: { year: 1900 } }),
			makeEvent({ id: "b", date: { year: 2100 } }),
		];
		renderVerticalTimeline(container, events, {}, "year");
		expect(container.querySelectorAll(".timeline-graph-period-divider").length).toBeGreaterThan(0);
	});

	it("renders zoom/fit toolbar buttons that scale the spine", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(container, [makeEvent()], {});
		const spine = container.querySelector<HTMLElement>(".timeline-graph-spine")!;
		const buttons = container.querySelectorAll<HTMLButtonElement>(".timeline-graph-vertical-toolbar button");
		const [zoomOutBtn, zoomInBtn, fitBtn] = [buttons[0], buttons[1], buttons[2]];

		zoomInBtn.click();
		expect(spine.style.transform).toBe("scale(1.15)");

		fitBtn.click();
		expect(spine.style.transform).toBe("scale(1)");

		zoomOutBtn.click();
		expect(spine.style.transform).toBe("scale(1)");
	});

	it("renders the export button only when onExportSnapshot is provided, and invokes it on click", () => {
		const container = document.createElement("div");
		renderVerticalTimeline(container, [makeEvent()], {});
		expect(container.querySelector(".timeline-graph-export-btn")).toBeNull();

		const withCallback = document.createElement("div");
		const onExportSnapshot = vi.fn();
		renderVerticalTimeline(withCallback, [makeEvent()], { onExportSnapshot });
		const exportBtn = withCallback.querySelector<HTMLButtonElement>(".timeline-graph-export-btn");
		expect(exportBtn).not.toBeNull();
		exportBtn?.click();
		expect(onExportSnapshot).toHaveBeenCalledOnce();
	});
});
