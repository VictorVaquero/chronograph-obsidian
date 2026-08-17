import { TimelineEvent } from "./types";
import {
	TimelineRenderCallbacks,
	colorForGroup,
	groupsOf,
	renderEmptyState,
} from "./render-shared";

const AXIS_PADDING_PX = 48;
const PX_PER_DAY_MIN = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MARKER_WIDTH_PX = 8;

interface Scale {
	minDate: number;
	maxDate: number;
	trackWidth: number;
}

export function renderHorizontalTimeline(
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

	const minDate = Math.min(...events.map((e) => e.date));
	const maxDate = Math.max(...events.map((e) => e.endDate ?? e.date));
	const spanDays = Math.max(1, (maxDate - minDate) / DAY_MS);
	const trackWidth = Math.max(600, spanDays * PX_PER_DAY_MIN);
	const scale: Scale = { minDate, maxDate, trackWidth };
	const totalWidth = trackWidth + AXIS_PADDING_PX * 2;

	const root = document.createElement("div");
	root.className = "timeline-graph-horizontal";

	const scroller = document.createElement("div");
	scroller.className = "timeline-graph-horizontal-scroller";

	const track = document.createElement("div");
	track.className = "timeline-graph-horizontal-track";
	track.style.width = `${totalWidth}px`;
	track.appendChild(renderAxis(scale));

	groupsOf(events).forEach((group, laneIndex) => {
		const laneEvents = events.filter((e) => (e.group ?? "") === group);
		track.appendChild(renderLane(group, laneEvents, scale, laneIndex, callbacks));
	});

	const now = Date.now();
	if (now >= scale.minDate && now <= scale.maxDate) {
		track.appendChild(renderTodayLine(now, scale));
	}

	scroller.appendChild(track);
	root.appendChild(scroller);
	container.appendChild(root);
}

function xFor(date: number, scale: Scale): number {
	const spanMs = Math.max(1, scale.maxDate - scale.minDate);
	const offset = (date - scale.minDate) / spanMs;
	return AXIS_PADDING_PX + offset * scale.trackWidth;
}

function renderAxis(scale: Scale): HTMLElement {
	const spanDays = Math.max(1, (scale.maxDate - scale.minDate) / DAY_MS);
	const axis = document.createElement("div");
	axis.className = "timeline-graph-axis";

	const tickCount = Math.min(12, Math.max(2, Math.round(spanDays / 7)));
	for (let i = 0; i <= tickCount; i++) {
		const date = scale.minDate + (i / tickCount) * (scale.maxDate - scale.minDate);
		const tick = document.createElement("div");
		tick.className = "timeline-graph-axis-tick";
		tick.style.left = `${xFor(date, scale)}px`;

		const label = document.createElement("span");
		label.textContent = new Date(date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
		tick.appendChild(label);
		axis.appendChild(tick);
	}

	return axis;
}

function renderLane(
	group: string,
	laneEvents: TimelineEvent[],
	scale: Scale,
	laneIndex: number,
	callbacks: TimelineRenderCallbacks
): HTMLElement {
	const lane = document.createElement("div");
	lane.className = `timeline-graph-lane ${laneIndex % 2 === 0 ? "is-even" : "is-odd"}`;

	const label = document.createElement("div");
	label.className = "timeline-graph-lane-label";
	label.textContent = group || "Ungrouped";
	if (group) label.style.borderLeftColor = colorForGroup(group);
	lane.appendChild(label);

	const laneTrack = document.createElement("div");
	laneTrack.className = "timeline-graph-lane-track";
	laneTrack.style.width = `${scale.trackWidth + AXIS_PADDING_PX * 2}px`;

	for (const event of laneEvents) {
		laneTrack.appendChild(renderMarker(event, scale, callbacks));
	}

	lane.appendChild(laneTrack);
	return lane;
}

function renderTodayLine(now: number, scale: Scale): HTMLElement {
	const line = document.createElement("div");
	line.className = "timeline-graph-today-line";
	line.style.left = `${xFor(now, scale)}px`;

	const label = document.createElement("span");
	label.textContent = "Today";
	line.appendChild(label);

	return line;
}

function renderMarker(
	event: TimelineEvent,
	scale: Scale,
	callbacks: TimelineRenderCallbacks
): HTMLElement {
	const color = event.group
		? colorForGroup(event.group)
		: "var(--interactive-accent, #7c3aed)";
	const startX = xFor(event.date, scale);

	const el = document.createElement("button");
	el.type = "button";
	el.title = event.description ? `${event.title}\n${event.description}` : event.title;
	el.style.setProperty("--marker-color", color);
	el.addEventListener("click", () => callbacks.onEventClick?.(event));

	const labelEl = document.createElement("span");
	labelEl.className = "timeline-graph-marker-label";
	labelEl.textContent = event.title;

	if (event.endDate) {
		const endX = xFor(event.endDate, scale);
		const width = Math.max(MIN_MARKER_WIDTH_PX, endX - startX);
		el.className = "timeline-graph-marker timeline-graph-marker-range";
		el.style.left = `${startX}px`;
		el.style.width = `${width}px`;
		el.appendChild(labelEl);
		return el;
	}

	const wrapper = document.createElement("div");
	wrapper.className = "timeline-graph-marker-point-wrapper";
	wrapper.style.left = `${startX}px`;
	wrapper.style.setProperty("--marker-color", color);

	const stem = document.createElement("div");
	stem.className = "timeline-graph-marker-stem";
	wrapper.appendChild(stem);

	el.className = "timeline-graph-marker timeline-graph-marker-point";
	el.style.removeProperty("left");
	el.appendChild(labelEl);
	wrapper.appendChild(el);

	return wrapper;
}
