import { TimelineEvent, TimelineDatePrecision } from "./types";
import {
	TimelineRenderCallbacks,
	colorForGroup,
	groupsOf,
	renderEmptyState,
} from "./render-shared";
import {
	TimelineDate,
	displayYearOf,
	formatTimelineDate,
	fromOrdinal,
	hasAnyBCDate,
	ordinalYearOfDisplayYear,
	toOrdinal,
} from "./timeline-date";

const AXIS_PADDING_PX = 48;
const PX_PER_DAY_MIN = 4;
const MIN_TRACK_WIDTH_PX = 600;
const MAX_TRACK_WIDTH_PX = 20000;
const MIN_MARKER_WIDTH_PX = 8;

interface Scale {
	minOrdinal: number;
	maxOrdinal: number;
	trackWidth: number;
}

export function renderHorizontalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision = "day"
): void {
	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	const minOrdinal = Math.min(...events.map((e) => toOrdinal(e.date)));
	const maxOrdinal = Math.max(...events.map((e) => toOrdinal(e.endDate ?? e.date)));
	const spanYears = Math.max(1 / 365, maxOrdinal - minOrdinal);
	// Width driven by day-level pixel density, but clamped so multi-century/
	// millennium spans don't blow up into a track millions of pixels wide.
	const idealWidth = spanYears * 365 * PX_PER_DAY_MIN;
	const trackWidth = Math.min(MAX_TRACK_WIDTH_PX, Math.max(MIN_TRACK_WIDTH_PX, idealWidth));
	const scale: Scale = { minOrdinal, maxOrdinal, trackWidth };
	const totalWidth = trackWidth + AXIS_PADDING_PX * 2;

	const showEra = hasAnyBCDate(events.flatMap((e) => (e.endDate ? [e.date, e.endDate] : [e.date])));

	const root = document.createElement("div");
	root.className = "timeline-graph-horizontal";

	const scroller = document.createElement("div");
	scroller.className = "timeline-graph-horizontal-scroller";

	const track = document.createElement("div");
	track.className = "timeline-graph-horizontal-track";
	track.style.width = `${totalWidth}px`;

	const ticks = computeTicks(scale, precision, showEra);
	track.appendChild(renderAxis(ticks, scale));
	track.appendChild(renderPeriodLines(ticks, scale));

	groupsOf(events).forEach((group, laneIndex) => {
		const laneEvents = events.filter((e) => (e.group ?? "") === group);
		track.appendChild(
			renderLane(group, laneEvents, scale, laneIndex, callbacks, precision, showEra)
		);
	});

	const now = toOrdinal(todayAsTimelineDate());
	if (now >= scale.minOrdinal && now <= scale.maxOrdinal) {
		track.appendChild(renderTodayLine(now, scale));
	}

	scroller.appendChild(track);
	root.appendChild(scroller);
	container.appendChild(root);
}

function todayAsTimelineDate(): TimelineDate {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function xFor(ordinal: number, scale: Scale): number {
	const span = Math.max(1 / 365, scale.maxOrdinal - scale.minOrdinal);
	const offset = (ordinal - scale.minOrdinal) / span;
	return AXIS_PADDING_PX + offset * scale.trackWidth;
}

// Minimum tick spacing (in years) for each display precision. Ticks are
// always coarser than the precision's own bucket size — "year" and "decade"
// both floor at century-sized steps (0, 100, 200 ...) since a tick every
// single year/decade would be too dense to read as axis labels; the finer
// precision still governs event-card date formatting, just not tick spacing.
const MIN_STEP_YEARS: Record<TimelineDatePrecision, number> = {
	day: 1 / 365,
	month: 1 / 12,
	year: 100,
	decade: 100,
	century: 100,
	millennium: 1000,
};

interface Tick {
	ordinal: number;
	label: string;
}

// Picks a "nice" step size (1/2/5 × a power of ten, in years) so ticks land
// on round boundaries — 0, 100, 200 for centuries; 0, 10, 20 for decades;
// whole years when zoomed into months; etc — rather than arbitrary
// power-of-two offsets from the data's start date.
function niceStepYears(spanYears: number, minStepYears: number, targetTicks: number): number {
	const roughStep = Math.max(minStepYears, spanYears / targetTicks);
	const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
	const normalized = roughStep / magnitude;
	const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return Math.max(minStepYears, niceNormalized * magnitude);
}

function computeTicks(
	scale: Scale,
	precision: TimelineDatePrecision,
	showEra: boolean
): Tick[] {
	const spanYears = Math.max(1 / 365, scale.maxOrdinal - scale.minOrdinal);
	const step = niceStepYears(spanYears, MIN_STEP_YEARS[precision], 8);

	const labelPrecision = tickPrecision(precision, step);
	const ticks: Tick[] = [];
	const startDisplayYear = Math.floor(displayYearOf(Math.floor(scale.minOrdinal)) / step) * step;
	for (let displayYear = startDisplayYear; ; displayYear += step) {
		const ordinal = ordinalYearOfDisplayYear(displayYear);
		if (ordinal > scale.maxOrdinal) break;
		if (ordinal < scale.minOrdinal) continue;
		ticks.push({
			ordinal,
			label: formatTimelineDate(fromOrdinal(ordinal), labelPrecision, showEra),
		});
	}

	// A visible span entirely inside one coarse bucket (e.g. a few weeks at
	// "year" precision, floored to century-sized steps) would otherwise get
	// no tick at all — always show at least one, anchored to the range start.
	if (ticks.length === 0) {
		ticks.push({
			ordinal: scale.minOrdinal,
			label: formatTimelineDate(fromOrdinal(scale.minOrdinal), labelPrecision, showEra),
		});
	}

	return ticks;
}

function renderAxis(ticks: Tick[], scale: Scale): HTMLElement {
	const axis = document.createElement("div");
	axis.className = "timeline-graph-axis";

	for (const tick of ticks) {
		const tickEl = document.createElement("div");
		tickEl.className = "timeline-graph-axis-tick";
		tickEl.style.left = `${xFor(tick.ordinal, scale)}px`;

		const label = document.createElement("span");
		label.textContent = tick.label;
		tickEl.appendChild(label);
		axis.appendChild(tickEl);
	}

	return axis;
}

// Full-height vertical lines through the lanes, marking where each axis
// tick's period boundary falls, so year/decade/century transitions are
// visible at a glance behind the event markers.
function renderPeriodLines(ticks: Tick[], scale: Scale): HTMLElement {
	const wrap = document.createElement("div");
	wrap.className = "timeline-graph-period-lines";

	for (const tick of ticks) {
		const line = document.createElement("div");
		line.className = "timeline-graph-period-line";
		line.style.left = `${xFor(tick.ordinal, scale)}px`;
		wrap.appendChild(line);
	}

	return wrap;
}

// Axis ticks always show a plain year number (or day/month when zoomed
// in that far) rather than a roman-numeral century/millennium label —
// "100 AD" reads as a boundary, "II century AD" doesn't. The century/
// millennium wording is reserved for period dividers and event dates.
function tickPrecision(precision: TimelineDatePrecision, stepYears: number): TimelineDatePrecision {
	if (stepYears >= 1) return "year";
	return precision === "day" ? "day" : "month";
}

function renderLane(
	group: string,
	laneEvents: TimelineEvent[],
	scale: Scale,
	laneIndex: number,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
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
		laneTrack.appendChild(renderMarker(event, scale, callbacks, precision, showEra));
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
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const color = event.group
		? colorForGroup(event.group)
		: "var(--interactive-accent, #7c3aed)";
	const startX = xFor(toOrdinal(event.date), scale);

	const el = document.createElement("button");
	el.type = "button";
	const dateLabel = formatTimelineDate(event.date, precision, showEra);
	el.title = event.description
		? `${event.title} (${dateLabel})\n${event.description}`
		: `${event.title} (${dateLabel})`;
	el.style.setProperty("--marker-color", color);
	el.addEventListener("click", () => callbacks.onEventClick?.(event));

	const labelEl = document.createElement("span");
	labelEl.className = "timeline-graph-marker-label";
	labelEl.textContent = event.title;

	if (event.endDate) {
		const endX = xFor(toOrdinal(event.endDate), scale);
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
