import "./obsidian-dom-polyfill";
import { renderTimeline, renderEmptyState, renderErrorState } from "../timeline-renderer";
import { mockEvents, ancientMockEvents, randomizedMockEvents } from "./mock-events";
import { TimelineEvent, TimelineLayout, TimelineDatePrecision, TimelineCardSide, TimelineLineStyle } from "../types";

// Entry point for the standalone browser preview (see src/dev/preview.html).
// Bundled and served without any Obsidian runtime, so the timeline renderer
// can be iterated on visually via `pnpm run dev:preview`.

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app container in preview.html");

const log = document.getElementById("log");
function logClick(event: TimelineEvent): void {
	if (!log) return;
	log.textContent = `Clicked: ${event.title} (${event.sourcePath})`;
}

let layout: TimelineLayout = "vertical";
let precision: TimelineDatePrecision = "day";
let cardSide: TimelineCardSide = "alternate";
let lineStyle: TimelineLineStyle = "solid";
let currentEvents: TimelineEvent[] = mockEvents;

function render(): void {
	renderTimeline(
		container!,
		currentEvents,
		layout,
		{ onEventClick: logClick },
		{ precision, verticalCardSide: cardSide, verticalLineStyle: lineStyle }
	);
}

const layoutSelect = document.getElementById("layout-select") as HTMLSelectElement | null;
layoutSelect?.addEventListener("change", () => {
	layout = layoutSelect.value as TimelineLayout;
	render();
});

const precisionSelect = document.getElementById("precision-select") as HTMLSelectElement | null;
precisionSelect?.addEventListener("change", () => {
	precision = precisionSelect.value as TimelineDatePrecision;
	render();
});

const cardSideSelect = document.getElementById("card-side-select") as HTMLSelectElement | null;
cardSideSelect?.addEventListener("change", () => {
	cardSide = cardSideSelect.value as TimelineCardSide;
	render();
});

const lineStyleSelect = document.getElementById("line-style-select") as HTMLSelectElement | null;
lineStyleSelect?.addEventListener("change", () => {
	lineStyle = lineStyleSelect.value as TimelineLineStyle;
	render();
});

render();

document.getElementById("btn-sample")?.addEventListener("click", () => {
	currentEvents = mockEvents;
	render();
});

document.getElementById("btn-random")?.addEventListener("click", () => {
	currentEvents = randomizedMockEvents(30);
	render();
});

document.getElementById("btn-ancient")?.addEventListener("click", () => {
	currentEvents = ancientMockEvents;
	if (precisionSelect) {
		precisionSelect.value = "year";
		precision = "year";
	}
	render();
});

document.getElementById("btn-empty")?.addEventListener("click", () => {
	renderEmptyState(container, "No events matched this view's query and date field.");
});

document.getElementById("btn-error")?.addEventListener("click", () => {
	renderErrorState(container, "Dataview is not installed or enabled.");
});
