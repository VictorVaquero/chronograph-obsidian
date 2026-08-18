import { TimelineEvent } from "../types";
import { compareTimelineDates } from "../date/timeline-date";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Draws a bar parallel to the spine for each event that has an `endDate`,
 * running from that event's dot down to the dot of the last sibling event
 * whose date still falls within the range — as an SVG overlay on top of the
 * already-rendered spine, the same technique horizontal/arrows.ts uses for
 * pointsTo arrows. The vertical layout has no proportional time axis, so the
 * bar's length reflects how many rendered rows the range covers rather than
 * its actual duration.
 *
 * Must run after the spine is attached to the document, since it reads dot
 * positions via getBoundingClientRect. Callers must call this again (it
 * replaces any previous overlay) whenever zoom rescales the spine.
 */
export function renderRangeBars(spine: HTMLElement, events: TimelineEvent[]): void {
	spine.querySelector(".timeline-graph-range-bars")?.remove();

	const ranged = events.filter((e) => e.endDate);
	if (ranged.length === 0) return;

	const dotById = new Map<string, HTMLElement>();
	spine.querySelectorAll<HTMLElement>(".timeline-graph-node-dot[data-timeline-event-id]").forEach((el) => {
		const id = el.dataset.timelineEventId;
		if (id) dotById.set(id, el);
	});

	const spineRect = spine.getBoundingClientRect();

	const bars: { x: number; y1: number; y2: number; color: string }[] = [];
	for (const event of ranged) {
		const startDot = dotById.get(event.id);
		if (!startDot) continue;

		const endEvent = lastEventWithinRange(events, event);
		const endDot = endEvent ? dotById.get(endEvent.id) : undefined;
		if (!endDot || endDot === startDot) continue;

		const startRect = startDot.getBoundingClientRect();
		const endRect = endDot.getBoundingClientRect();
		const color = startDot.style.getPropertyValue("--marker-color") || "var(--interactive-accent)";
		bars.push({
			x: startRect.left + startRect.width / 2 - spineRect.left,
			y1: startRect.top + startRect.height / 2 - spineRect.top,
			y2: endRect.top + endRect.height / 2 - spineRect.top,
			color,
		});
	}
	if (bars.length === 0) return;

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("class", "timeline-graph-range-bars");
	svg.setAttribute("viewBox", `0 0 ${spineRect.width} ${spineRect.height}`);
	svg.setAttribute("preserveAspectRatio", "none");

	for (const { x, y1, y2, color } of bars) {
		const line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", String(x));
		line.setAttribute("y1", String(y1));
		line.setAttribute("x2", String(x));
		line.setAttribute("y2", String(y2));
		line.setAttribute("class", "timeline-graph-range-bar-line");
		line.style.setProperty("--marker-color", color);
		svg.appendChild(line);

		const endCap = document.createElementNS(SVG_NS, "circle");
		endCap.setAttribute("cx", String(x));
		endCap.setAttribute("cy", String(y2));
		endCap.setAttribute("r", "4");
		endCap.setAttribute("class", "timeline-graph-range-bar-end");
		endCap.style.setProperty("--marker-color", color);
		svg.appendChild(endCap);
	}

	spine.appendChild(svg);
}

// Walks forward from `event` through the (already date-sorted) event list,
// returning the last one whose date is still <= event.endDate, so the range
// bar's visual span covers every sibling row the range overlaps rather than
// stopping at the very next node.
function lastEventWithinRange(events: TimelineEvent[], event: TimelineEvent): TimelineEvent | undefined {
	const endDate = event.endDate;
	if (!endDate) return undefined;

	const startIndex = events.indexOf(event);
	if (startIndex === -1) return undefined;

	let last: TimelineEvent | undefined;
	for (let i = startIndex + 1; i < events.length; i++) {
		if (compareTimelineDates(events[i].date, endDate) > 0) break;
		last = events[i];
	}
	return last;
}
