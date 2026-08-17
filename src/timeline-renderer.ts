import { TimelineEvent } from "./types";

// Pure DOM rendering, decoupled from Obsidian's ItemView/App so it can be
// exercised both inside the plugin and in the standalone dev harness
// (src/dev/preview.ts) without an Obsidian runtime. Only standard DOM APIs
// are used here — no Obsidian-only helpers like createDiv/createEl.

export interface TimelineRenderCallbacks {
	/** Called when a user activates an event (e.g. clicks its title). */
	onEventClick?: (event: TimelineEvent) => void;
}

export function renderEmptyState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = document.createElement("div");
	el.className = "timeline-graph-empty";
	const p = document.createElement("p");
	p.textContent = message;
	el.appendChild(p);
	container.appendChild(el);
}

export function renderErrorState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = document.createElement("div");
	el.className = "timeline-graph-error";
	const p = document.createElement("p");
	p.textContent = `Timeline Graph error: ${message}`;
	el.appendChild(p);
	container.appendChild(el);
}

export function renderTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks = {}
): void {
	container.replaceChildren();

	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	// Placeholder rendering: a simple vertical list ordered by date.
	// The graphical/interactive timeline (zoom, pan, grouping lanes)
	// is implemented incrementally on top of this scaffold.
	const list = document.createElement("div");
	list.className = "timeline-graph-list";

	for (const event of events) {
		const item = document.createElement("div");
		item.className = "timeline-graph-item";

		const dateEl = document.createElement("span");
		dateEl.className = "timeline-graph-item-date";
		dateEl.textContent = new Date(event.date).toLocaleDateString();
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

// Deterministic color per group name, so the same group always renders the
// same color without needing a stored palette.
function colorForGroup(group: string): string {
	let hash = 0;
	for (let i = 0; i < group.length; i++) {
		hash = (hash << 5) - hash + group.charCodeAt(i);
		hash |= 0;
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 65%, 55%)`;
}
