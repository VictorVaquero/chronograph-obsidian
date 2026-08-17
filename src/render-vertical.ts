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

	const list = document.createElement("div");
	list.className = "timeline-graph-list";

	for (const event of events) {
		const item = document.createElement("div");
		item.className = "timeline-graph-item";

		const dateEl = document.createElement("span");
		dateEl.className = "timeline-graph-item-date";
		dateEl.textContent = formatDateRange(event);
		item.appendChild(dateEl);

		const link = document.createElement("a");
		link.className = "timeline-graph-item-title";
		link.textContent = event.title;
		link.href = "#";
		if (event.group) {
			link.style.borderLeftColor = colorForGroup(event.group);
		}
		link.addEventListener("click", (evt) => {
			evt.preventDefault();
			callbacks.onEventClick?.(event);
		});
		item.appendChild(link);

		if (event.group) {
			const badge = document.createElement("span");
			badge.className = "timeline-graph-item-badge";
			badge.textContent = event.group;
			badge.style.backgroundColor = colorForGroup(event.group);
			item.appendChild(badge);
		}

		if (event.description) {
			const descEl = document.createElement("span");
			descEl.className = "timeline-graph-item-desc";
			descEl.textContent = event.description;
			item.appendChild(descEl);
		}

		list.appendChild(item);
	}

	container.appendChild(list);
}

function formatDateRange(event: TimelineEvent): string {
	const start = new Date(event.date).toLocaleDateString();
	if (!event.endDate) return start;
	const end = new Date(event.endDate).toLocaleDateString();
	return `${start} → ${end}`;
}
