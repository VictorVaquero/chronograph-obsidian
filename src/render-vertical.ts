import { TimelineEvent } from "./types";
import { TimelineRenderCallbacks, colorForGroup, renderEmptyState } from "./render-shared";

export function renderVerticalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks
): void {
	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	const spine = document.createElement("div");
	spine.className = "timeline-graph-spine";

	const line = document.createElement("div");
	line.className = "timeline-graph-spine-line";
	spine.appendChild(line);

	const todayIndex = findTodayInsertionIndex(events);

	events.forEach((event, index) => {
		if (index === todayIndex) {
			spine.appendChild(renderTodayMarker());
		}
		spine.appendChild(renderNode(event, index % 2 === 0, callbacks));
	});
	if (todayIndex === events.length) {
		spine.appendChild(renderTodayMarker());
	}

	container.appendChild(spine);
}

function renderNode(
	event: TimelineEvent,
	alignLeft: boolean,
	callbacks: TimelineRenderCallbacks
): HTMLElement {
	const node = document.createElement("div");
	node.className = `timeline-graph-node ${alignLeft ? "is-left" : "is-right"}`;

	const dot = document.createElement("div");
	dot.className = "timeline-graph-node-dot";
	if (event.group) dot.style.setProperty("--marker-color", colorForGroup(event.group));
	node.appendChild(dot);

	const card = document.createElement("div");
	card.className = "timeline-graph-card";
	if (event.group) card.style.setProperty("--marker-color", colorForGroup(event.group));

	const dateEl = document.createElement("span");
	dateEl.className = "timeline-graph-card-date";
	dateEl.textContent = formatDateRange(event);
	card.appendChild(dateEl);

	const link = document.createElement("a");
	link.className = "timeline-graph-card-title";
	link.textContent = event.title;
	link.href = "#";
	link.addEventListener("click", (evt) => {
		evt.preventDefault();
		callbacks.onEventClick?.(event);
	});
	card.appendChild(link);

	if (event.group) {
		const badge = document.createElement("span");
		badge.className = "timeline-graph-card-badge";
		badge.textContent = event.group;
		card.appendChild(badge);
	}

	if (event.description) {
		const descEl = document.createElement("p");
		descEl.className = "timeline-graph-card-desc";
		descEl.textContent = event.description;
		card.appendChild(descEl);
	}

	node.appendChild(card);
	return node;
}

function renderTodayMarker(): HTMLElement {
	const marker = document.createElement("div");
	marker.className = "timeline-graph-today";
	const label = document.createElement("span");
	label.textContent = "Today";
	marker.appendChild(label);
	return marker;
}

function findTodayInsertionIndex(events: TimelineEvent[]): number {
	const now = Date.now();
	const ascending = events.length < 2 || events[0].date <= events[events.length - 1].date;
	const index = events.findIndex((e) => (ascending ? e.date > now : e.date < now));
	if (index === -1) return events.length;
	return index;
}

function formatDateRange(event: TimelineEvent): string {
	const start = new Date(event.date).toLocaleDateString();
	if (!event.endDate) return start;
	const end = new Date(event.endDate).toLocaleDateString();
	return `${start} → ${end}`;
}
