import { TimelineEvent } from "../types";
import { compareTimelineDates } from "../date/timeline-date";

const SVG_NS = "http://www.w3.org/2000/svg";

// How far the bar sits off the spine's centerline, and how far the start
// stub reaches from the dot to meet it — keeps the bar from drawing directly
// on top of the spine line while staying close enough to read as "attached"
// to its owning dot rather than floating free. Bounded on both sides: wide
// enough to clear sibling rows' dots it passes on its way down (a smaller
// offset used to graze right through them), but must stay inside the
// compact date/title column's padding gap (--size-4-3, 12px in Obsidian's
// default spacing scale) or it draws on top of that row's text.
const BAR_OFFSET = 8;

/**
 * Draws a bar parallel to the spine for each event that has an `endDate`,
 * running from that event's dot down to the dot of the last sibling event
 * whose date still falls within the range — as an SVG overlay on top of the
 * already-rendered spine, the same technique horizontal/arrows.ts uses for
 * pointsTo arrows. The vertical layout has no proportional time axis, so the
 * bar's length reflects how many rendered rows the range covers rather than
 * its actual duration.
 *
 * The bar is offset to the same side as its owning event's card (left/right)
 * so it never overlaps the spine's own centerline, and a short stub connects
 * the owning dot to the bar's start so it's unambiguous which event the bar
 * belongs to even when it passes by unrelated sibling dots on its way down.
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

	const bars: { xDot: number; xBar: number; y1: number; y2: number; color: string }[] = [];
	for (const event of ranged) {
		const startDot = dotById.get(event.id);
		if (!startDot) continue;

		const endEvent = lastEventWithinRange(events, event);
		const endDot = endEvent ? dotById.get(endEvent.id) : undefined;
		if (!endDot || endDot === startDot) continue;

		const startRect = startDot.getBoundingClientRect();
		const endRect = endDot.getBoundingClientRect();
		const color = startDot.style.getPropertyValue("--marker-color") || "var(--interactive-accent)";
		const side = startDot.dataset.timelineCardSide === "left" ? -1 : 1;
		const xDot = startRect.left + startRect.width / 2 - spineRect.left;
		bars.push({
			xDot,
			xBar: xDot + side * BAR_OFFSET,
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

	for (const { xDot, xBar, y1, y2, color } of bars) {
		const stub = document.createElementNS(SVG_NS, "line");
		stub.setAttribute("x1", String(xDot));
		stub.setAttribute("y1", String(y1));
		stub.setAttribute("x2", String(xBar));
		stub.setAttribute("y2", String(y1));
		stub.setAttribute("class", "timeline-graph-range-bar-stub");
		stub.style.setProperty("--marker-color", color);
		svg.appendChild(stub);

		const line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", String(xBar));
		line.setAttribute("y1", String(y1));
		line.setAttribute("x2", String(xBar));
		line.setAttribute("y2", String(y2));
		line.setAttribute("class", "timeline-graph-range-bar-line");
		line.style.setProperty("--marker-color", color);
		svg.appendChild(line);

		const endCap = document.createElementNS(SVG_NS, "circle");
		endCap.setAttribute("cx", String(xBar));
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
