import { TimelineEvent } from "../types";

export interface TimelineRenderCallbacks {
	/** Called when a user activates an event (e.g. clicks its title/marker). */
	onEventClick?: (event: TimelineEvent) => void;
	/** Called on mouseover of an event's title/marker, to trigger Obsidian's native hover-link preview popover. */
	onEventHover?: (event: TimelineEvent, evt: MouseEvent, targetEl: HTMLElement) => void;
	/**
	 * Called when the user clicks the "+ New event" toolbar button (horizontal
	 * layout only). Omit to hide the button, e.g. for read-only/code-block
	 * timelines with no view config to create events against.
	 */
	onCreateEvent?: () => void;
	/**
	 * Called when the user clicks the "Export snapshot" toolbar button.
	 * Omit to hide the button, e.g. for read-only/code-block timelines with
	 * no view config to name the exported file after.
	 */
	onExportSnapshot?: () => void;
}

export function attachHoverPreview(
	el: HTMLElement,
	event: TimelineEvent,
	callbacks: TimelineRenderCallbacks
): void {
	el.addEventListener("mouseover", (evt) => {
		callbacks.onEventHover?.(event, evt, el);
	});
}

export function renderEmptyState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = createDiv();
	el.className = "timeline-graph-empty";
	const p = createEl("p");
	p.textContent = message;
	el.appendChild(p);
	container.appendChild(el);
}

export function renderErrorState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = createDiv();
	el.className = "timeline-graph-error";
	const p = createEl("p");
	p.textContent = `Chronograph error: ${message}`;
	el.appendChild(p);
	container.appendChild(el);
}

// Deterministic color per group name, so the same group always renders the
// same color without needing a stored palette.
export function colorForGroup(group: string): string {
	let hash = 0;
	for (let i = 0; i < group.length; i++) {
		hash = (hash << 5) - hash + group.charCodeAt(i);
		hash |= 0;
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 65%, 55%)`;
}

// An explicit event.color always wins; otherwise fall back to the
// deterministic per-group color, if any.
export function colorForEvent(event: TimelineEvent): string | undefined {
	return event.color || (event.group ? colorForGroup(event.group) : undefined);
}

export function groupsOf(events: TimelineEvent[]): string[] {
	const seen = new Set<string>();
	const groups: string[] = [];
	for (const event of events) {
		const group = event.group ?? "";
		if (!seen.has(group)) {
			seen.add(group);
			groups.push(group);
		}
	}
	return groups;
}
