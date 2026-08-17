import { renderTimeline, renderEmptyState, renderErrorState } from "../timeline-renderer";
import { mockEvents, randomizedMockEvents } from "./mock-events";
import { TimelineEvent } from "../types";

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

function render(events: TimelineEvent[]): void {
	renderTimeline(container!, events, { onEventClick: logClick });
}

render(mockEvents);

document.getElementById("btn-sample")?.addEventListener("click", () => {
	render(mockEvents);
});

document.getElementById("btn-random")?.addEventListener("click", () => {
	render(randomizedMockEvents(30));
});

document.getElementById("btn-empty")?.addEventListener("click", () => {
	renderEmptyState(container!, "No events matched this view's query and date field.");
});

document.getElementById("btn-error")?.addEventListener("click", () => {
	renderErrorState(container!, "Dataview is not installed or enabled.");
});
