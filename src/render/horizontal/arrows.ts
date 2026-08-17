import { TimelineEvent } from "../../types";

const SVG_NS = "http://www.w3.org/2000/svg";
const ARROWHEAD_ID = "timeline-graph-arrowhead";

/**
 * Draws connecting arrows between events whose `pointsTo` names another
 * event's title, as an SVG overlay on top of the already-rendered track.
 * Must run after the track is attached to the document, since it reads
 * marker positions via getBoundingClientRect.
 *
 * The SVG's viewBox is fixed to the track's pixel size at render time, with
 * width/height set to 100% via CSS and preserveAspectRatio="none" — so
 * horizontal zoom (which only resizes the track's width) rescales arrow
 * x-coordinates for free, the same way percentage-positioned markers do,
 * while the vertical scale (track height never changes) stays 1:1.
 */
export function renderArrows(track: HTMLElement, events: TimelineEvent[]): void {
	const withTargets = events.filter((e) => e.pointsTo);
	if (withTargets.length === 0) return;

	const byTitle = new Map<string, TimelineEvent>();
	for (const event of events) {
		const key = event.title.trim().toLowerCase();
		if (!byTitle.has(key)) byTitle.set(key, event);
	}

	const elById = new Map<string, HTMLElement>();
	track.querySelectorAll<HTMLElement>("[data-timeline-event-id]").forEach((el) => {
		const id = el.dataset.timelineEventId;
		if (id) elById.set(id, el);
	});

	const trackRect = track.getBoundingClientRect();

	const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
	for (const event of withTargets) {
		const target = byTitle.get((event.pointsTo as string).trim().toLowerCase());
		if (!target || target.id === event.id) continue;

		const fromEl = elById.get(event.id);
		const toEl = elById.get(target.id);
		if (!fromEl || !toEl) continue;

		const fromRect = fromEl.getBoundingClientRect();
		const toRect = toEl.getBoundingClientRect();
		segments.push({
			x1: fromRect.left + fromRect.width / 2 - trackRect.left,
			y1: fromRect.top + fromRect.height / 2 - trackRect.top,
			x2: toRect.left + toRect.width / 2 - trackRect.left,
			y2: toRect.top + toRect.height / 2 - trackRect.top,
		});
	}
	if (segments.length === 0) return;

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("class", "timeline-graph-arrows");
	svg.setAttribute("viewBox", `0 0 ${trackRect.width} ${trackRect.height}`);
	svg.setAttribute("preserveAspectRatio", "none");

	const defs = document.createElementNS(SVG_NS, "defs");
	const arrowhead = document.createElementNS(SVG_NS, "marker");
	arrowhead.setAttribute("id", ARROWHEAD_ID);
	arrowhead.setAttribute("markerWidth", "8");
	arrowhead.setAttribute("markerHeight", "8");
	arrowhead.setAttribute("refX", "7");
	arrowhead.setAttribute("refY", "4");
	arrowhead.setAttribute("orient", "auto-start-reverse");
	const arrowheadPath = document.createElementNS(SVG_NS, "path");
	arrowheadPath.setAttribute("d", "M0,0 L8,4 L0,8 Z");
	arrowheadPath.setAttribute("class", "timeline-graph-arrowhead-fill");
	arrowhead.appendChild(arrowheadPath);
	defs.appendChild(arrowhead);
	svg.appendChild(defs);

	for (const { x1, y1, x2, y2 } of segments) {
		const line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", String(x1));
		line.setAttribute("y1", String(y1));
		line.setAttribute("x2", String(x2));
		line.setAttribute("y2", String(y2));
		line.setAttribute("class", "timeline-graph-arrow-line");
		line.setAttribute("marker-end", `url(#${ARROWHEAD_ID})`);
		svg.appendChild(line);
	}

	track.appendChild(svg);
}
